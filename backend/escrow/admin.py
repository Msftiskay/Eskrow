from django.contrib import admin
from .models import Project, Milestone

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['title', 'client', 'creative', 'total_amount', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['title', 'description']

@admin.register(Milestone)
class MilestoneAdmin(admin.ModelAdmin):
    list_display = ['title', 'project', 'amount', 'status', 'due_date']
    list_filter = ['status']