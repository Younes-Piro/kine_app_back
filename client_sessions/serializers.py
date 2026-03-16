from rest_framework import serializers
from app_settings.models import AppOption
from .models import Session

class SessionSerializer(serializers.ModelSerializer):
   client = serializers.IntegerField(source="treatment.client.id", read_only=True)
   client_full_name = serializers.CharField(source="treatment.client.full_name", read_only=True)
   treatment_title = serializers.CharField(source="treatment.title", read_only=True)
   treatment_type_and_site = serializers.CharField(source="treatment.type_and_site", read_only=True)
   status_label = serializers.CharField(source="status.label", read_only=True)
   payment_status_label = serializers.CharField(source="payment_status.label", read_only=True)
   class Meta:
       model = Session
       fields = [
           "id",
           "treatment",
           "client",
           "client_full_name",
           "treatment_title",
           "treatment_type_and_site",
           "session_date",
           "status",
           "status_label",
           "payment_status",
           "payment_status_label",
           "notes",
           "created_at",
           "updated_at",
       ]
       read_only_fields = ["created_at", "updated_at", "payment_status"]
   def validate_status(self, value):
       if value and value.category != AppOption.CATEGORY_SESSION_STATUS:
           raise serializers.ValidationError("Selected option is not a session status.")
       return value
   
   def validate(self, attrs):
    treatment = attrs.get("treatment") or self.instance.treatment
    status = attrs.get("status") or self.instance.status
    if status and status.code == "completed":
        from client_sessions.models import Session
        from app_settings.models import AppOption
        completed_sessions = Session.objects.filter(
            treatment=treatment,
            status__category=AppOption.CATEGORY_SESSION_STATUS,
            status__code="completed",
            status__is_active=True,
        ).count()
        if completed_sessions >= treatment.prescribed_sessions:
            raise serializers.ValidationError(
                "This treatment already reached the prescribed number of completed sessions."
            )
    return attrs