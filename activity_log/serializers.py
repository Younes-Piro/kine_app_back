from rest_framework import serializers

from .models import ActivityLog


class ActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLog
        fields = [
            "id",
            "user",
            "username",
            "action",
            "model_name",
            "object_id",
            "description",
            "created_at",
        ]
