from rest_framework import serializers
from .models import Project, Milestone
from accounts.models import User
from datetime import datetime
from django.utils import timezone

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'user_type', 'phone_number', 'wallet_address', 'is_verified']
        read_only_fields = ['id']

class MilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Milestone
        fields = ['id', 'project', 'title', 'description', 'amount', 'status', 'due_date']
        read_only_fields = ['id', 'project']
    
    def validate_due_date(self, value):
        """Ensure due date is in the future"""
        if isinstance(value, str):
            # Convert string to datetime if needed
            value = datetime.fromisoformat(value.replace('Z', '+00:00'))
        if timezone.is_naive(value):
            value = timezone.make_aware(value)
        return value

class ProjectSerializer(serializers.ModelSerializer):
    client = UserSerializer(read_only=True)
    creative = UserSerializer(read_only=True)
    milestones = MilestoneSerializer(many=True, read_only=True)
    
    class Meta:
        model = Project
        fields = [
            'id', 'title', 'description', 'client', 'creative', 
            'total_amount', 'status', 'smart_contract_address', 
            'created_at', 'deadline', 'milestones'
        ]
        read_only_fields = ['id', 'created_at', 'smart_contract_address']

class ProjectCreateSerializer(serializers.ModelSerializer):
    milestones = MilestoneSerializer(many=True, required=False)
    
    class Meta:
        model = Project
        fields = ['title', 'description', 'total_amount', 'deadline', 'milestones']
    
    def validate_deadline(self, value):
        """Ensure deadline is in the future and properly formatted"""
        if isinstance(value, str):
            # Handle datetime-local format from frontend
            try:
                value = datetime.fromisoformat(value)
            except ValueError:
                raise serializers.ValidationError("Invalid datetime format")
        
        if timezone.is_naive(value):
            value = timezone.make_aware(value)
        
        if value <= timezone.now():
            raise serializers.ValidationError("Deadline must be in the future")
        
        return value
    
    def validate_total_amount(self, value):
        """Ensure total amount is positive"""
        if value <= 0:
            raise serializers.ValidationError("Total amount must be greater than 0")
        return value
    
    def validate(self, data):
        """Validate that milestones sum equals total amount if provided"""
        milestones = data.get('milestones', [])
        total_amount = data.get('total_amount', 0)
        
        if milestones:
            milestone_sum = sum(float(m.get('amount', 0)) for m in milestones)
            if abs(milestone_sum - float(total_amount)) > 0.01:
                raise serializers.ValidationError(
                    f"Sum of milestone amounts ({milestone_sum}) must equal total amount ({total_amount})"
                )
            
            # Validate each milestone due date
            project_deadline = data.get('deadline')
            for milestone in milestones:
                due_date = milestone.get('due_date')
                if isinstance(due_date, str):
                    due_date = datetime.fromisoformat(due_date)
                if timezone.is_naive(due_date):
                    due_date = timezone.make_aware(due_date)
                
                if project_deadline and due_date > project_deadline:
                    raise serializers.ValidationError(
                        f"Milestone '{milestone.get('title')}' due date cannot be after project deadline"
                    )
        
        return data
    
    def create(self, validated_data):
        milestones_data = validated_data.pop('milestones', [])
        
        # Create project with client from context
        project = Project.objects.create(
            client=self.context['request'].user,
            creative=None,
            **validated_data
        )
        
        # Create milestones
        for milestone_data in milestones_data:
            Milestone.objects.create(project=project, **milestone_data)
        
        return project