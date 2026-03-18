from django.contrib import admin

from .models import ActivityLog


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "username", "action", "model_name", "object_id")
    list_filter = ("action", "model_name", "created_at")
    search_fields = ("username", "description", "model_name")
    ordering = ("-created_at",)
