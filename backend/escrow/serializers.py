from rest_framework import serializers
from .models import Project, Milestone
from accounts.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'user_type', 'phone_number', 'wallet_address', 'is_verified']
        read_only_fields = ['id']

class MilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Milestone
        fields = ['id', 'project', 'title', 'description', 'amount', 'status', 'due_date']
        read_only_fields = ['id']

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
    
    def create(self, validated_data):
        milestones_data = validated_data.pop('milestones', [])
        project = Project.objects.create(**validated_data)
        
        for milestone_data in milestones_data:
            Milestone.objects.create(project=project, **milestone_data)
        
        return project