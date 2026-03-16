from rest_framework import serializers
from .models import Permission

class PermissionSerializer(serializers.ModelSerializer):
   class Meta:
       model = Permission
       fields = ["id", "code", "label"]

class AssignPermissionsSerializer(serializers.Serializer):
   permission_ids = serializers.ListField(
       child=serializers.IntegerField(),
       allow_empty=True
   )
   def validate_permission_ids(self, value):
       existing_ids = set(
           Permission.objects.filter(id__in=value).values_list("id", flat=True)
       )
       missing = [pid for pid in value if pid not in existing_ids]
       if missing:
           raise serializers.ValidationError(f"Invalid permission ids: {missing}")
       return value