#CRUD and custom actions for Project and Milestone management
from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Project, Milestone
from .serializers import ProjectSerializer, ProjectCreateSerializer, MilestoneSerializer

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ProjectCreateSerializer
        return ProjectSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'client':
            return Project.objects.filter(client=user)
        elif user.user_type == 'creative':
            return Project.objects.filter(creative=user)
        return Project.objects.all()
    
    def perform_create(self, serializer):
        serializer.save(client=self.request.user, status='draft')
    
    @action(detail=True, methods=['post'])
    def accept_project(self, request, pk=None):
        """Creative accepts a project"""
        project = self.get_object()
        
        if request.user.user_type != 'creative':
            return Response(
                {'error': 'Only creative professionals can accept projects'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if project.creative:
            return Response(
                {'error': 'Project already has a creative assigned'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        project.creative = request.user
        project.status = 'active'
        project.save()
        
        return Response({'message': 'Project accepted successfully'})
    
    @action(detail=True, methods=['post'])
    def submit_milestone(self, request, pk=None):
        """Creative submits a milestone"""
        project = self.get_object()
        milestone_id = request.data.get('milestone_id')
        
        if request.user != project.creative:
            return Response(
                {'error': 'Only assigned creative can submit milestones'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            milestone = project.milestones.get(id=milestone_id)
            milestone.status = 'submitted'
            milestone.save()
            
            return Response({
                'message': 'Milestone submitted successfully',
                'milestone': MilestoneSerializer(milestone).data
            })
        except Milestone.DoesNotExist:
            return Response(
                {'error': 'Milestone not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def approve_milestone(self, request, pk=None):
        """Client approves a milestone"""
        project = self.get_object()
        milestone_id = request.data.get('milestone_id')
        
        if request.user != project.client:
            return Response(
                {'error': 'Only project client can approve milestones'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            milestone = project.milestones.get(id=milestone_id)
            
            if milestone.status != 'submitted':
                return Response(
                    {'error': 'Milestone must be submitted before approval'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            milestone.status = 'approved'
            milestone.save()
            
            # TODO: Trigger smart contract payment release
            
            return Response({
                'message': 'Milestone approved successfully',
                'milestone': MilestoneSerializer(milestone).data
            })
        except Milestone.DoesNotExist:
            return Response(
                {'error': 'Milestone not found'},
                status=status.HTTP_404_NOT_FOUND
            )

class MilestoneViewSet(viewsets.ModelViewSet):
    queryset = Milestone.objects.all()
    serializer_class = MilestoneSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'client':
            return Milestone.objects.filter(project__client=user)
        elif user.user_type == 'creative':
            return Milestone.objects.filter(project__creative=user)
        return Milestone.objects.all()