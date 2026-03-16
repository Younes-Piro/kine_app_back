from decimal import Decimal
from rest_framework import serializers
from app_settings.models import AppOption
from .models import Client, Treatment
from client_sessions.models import Session

def _get_total_remaining_amount(treatment):
   return treatment.total_remaining_amount


class ClientSerializer(serializers.ModelSerializer):
   gender_label = serializers.CharField(source="gender.label", read_only=True)
   marital_status_label = serializers.CharField(source="marital_status.label", read_only=True)
   social_security_label = serializers.CharField(source="social_security.label", read_only=True)
   dossier_type_label = serializers.CharField(source="dossier_type.label", read_only=True)
   class Meta:
       model = Client
       fields = [
           "id",
           "file_number",
           "full_name",
           "gender",
           "gender_label",
           "cin",
           "birth_date",
           "email",
           "phone_number",
           "address",
           "marital_status",
           "marital_status_label",
           "social_security",
           "social_security_label",
           "dossier_type",
           "dossier_type_label",
           "balance",
           "profile_photo",
           "is_active",
           "created_at",
           "updated_at",
       ]
       read_only_fields = ["created_at", "updated_at"]
   def validate_gender(self, value):
       if value and value.category != AppOption.CATEGORY_GENDER:
           raise serializers.ValidationError("Selected option is not a gender.")
       return value
   def validate_marital_status(self, value):
       if value and value.category != AppOption.CATEGORY_MARITAL_STATUS:
           raise serializers.ValidationError("Selected option is not a marital status.")
       return value
   def validate_social_security(self, value):
       if value and value.category != AppOption.CATEGORY_SOCIAL_SECURITY:
           raise serializers.ValidationError("Selected option is not a social security option.")
       return value
   def validate_dossier_type(self, value):
       if value and value.category != AppOption.CATEGORY_DOSSIER_TYPE:
           raise serializers.ValidationError("Selected option is not a dossier type.")
       return value

class TreatmentSerializer(serializers.ModelSerializer):
   session_rhythm_label = serializers.CharField(source="session_rhythm.label", read_only=True)
   client_full_name = serializers.CharField(source="client.full_name", read_only=True)
   total_remaining_amount = serializers.SerializerMethodField()
   is_paid = serializers.SerializerMethodField()
   class Meta:
       model = Treatment
       fields = [
           "id",
           "client",
           "client_full_name",
           "title",
           "treating_doctor",
           "diagnosis",
           "type_and_site",
           "prescribed_sessions",
           "completed_sessions",
           "session_rhythm",
           "session_rhythm_label",
           "start_date",
           "end_date",
           "status",
           "session_price",
           "total_price",
           "total_remaining_amount",
           "balance",
           "is_paid",
           "notes",
           "is_active",
           "created_at",
           "updated_at",
       ]
       read_only_fields = ["completed_sessions", "end_date", "total_price", "balance", "created_at", "updated_at"]
   def validate_session_rhythm(self, value):
       if value and value.category != AppOption.CATEGORY_SESSION_RHYTHM:
           raise serializers.ValidationError("Selected option is not a session rhythm.")
       return value
   def validate(self, attrs):
       prescribed = attrs.get(
           "prescribed_sessions",
           getattr(self.instance, "prescribed_sessions", None)
       )
       completed = attrs.get(
           "completed_sessions",
           getattr(self.instance, "completed_sessions", None)
       )
       if prescribed is not None and completed is not None and completed > prescribed:
           raise serializers.ValidationError({
               "completed_sessions": "Completed sessions cannot be greater than prescribed sessions."
           })
       return attrs
   def get_is_paid(self, obj):
       return _get_total_remaining_amount(obj) == Decimal("0")
   def get_total_remaining_amount(self, obj):
       return _get_total_remaining_amount(obj)
   
class TreatmentSessionSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="status.label", read_only=True)
    payment_status_label = serializers.CharField(source="payment_status.label", read_only=True)
    class Meta:
        model = Session
        fields = [
            "id",
            "session_date",
            "status",
            "status_label",
            "payment_status",
            "payment_status_label",
            "notes",
            "created_at",
            "updated_at",
        ]

class TreatmentListSerializer(serializers.ModelSerializer):
   session_rhythm_label = serializers.CharField(source="session_rhythm.label", read_only=True)
   client_full_name = serializers.CharField(source="client.full_name", read_only=True)
   total_remaining_amount = serializers.SerializerMethodField()
   is_paid = serializers.SerializerMethodField()
   class Meta:
       model = Treatment
       fields = [
           "id",
           "client",
           "client_full_name",
           "title",
           "type_and_site",
           "prescribed_sessions",
           "completed_sessions",
           "session_rhythm",
           "session_rhythm_label",
           "start_date",
           "end_date",
           "status",
           "session_price",
           "total_price",
           "total_remaining_amount",
           "balance",
           "is_paid",
           "is_active",
       ]
   def get_is_paid(self, obj):
       return _get_total_remaining_amount(obj) == Decimal("0")
   def get_total_remaining_amount(self, obj):
       return _get_total_remaining_amount(obj)

class TreatmentDetailSerializer(serializers.ModelSerializer):
   session_rhythm_label = serializers.CharField(source="session_rhythm.label", read_only=True)
   client_full_name = serializers.CharField(source="client.full_name", read_only=True)
   total_remaining_amount = serializers.SerializerMethodField()
   is_paid = serializers.SerializerMethodField()
   sessions = TreatmentSessionSerializer(many=True, read_only=True)
   class Meta:
       model = Treatment
       fields = [
           "id",
           "client",
           "client_full_name",
           "title",
           "treating_doctor",
           "diagnosis",
           "type_and_site",
           "prescribed_sessions",
           "completed_sessions",
           "session_rhythm",
           "session_rhythm_label",
           "start_date",
           "end_date",
           "status",
           "session_price",
           "total_price",
           "total_remaining_amount",
           "balance",
           "is_paid",
           "notes",
           "is_active",
           "sessions",
           "created_at",
           "updated_at",
       ]
       read_only_fields = [
           "completed_sessions",
           "end_date",
           "total_price",
           "balance",
           "created_at",
           "updated_at",
       ]
   def get_is_paid(self, obj):
       return _get_total_remaining_amount(obj) == Decimal("0")
   def get_total_remaining_amount(self, obj):
       return _get_total_remaining_amount(obj)
