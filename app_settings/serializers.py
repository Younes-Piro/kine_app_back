from rest_framework import serializers
from .models import AppOption, Holiday, ClinicClosedDay, ClinicClosureRange

class AppOptionSerializer(serializers.ModelSerializer):
   class Meta:
       model = AppOption
       fields = "__all__"

class HolidaySerializer(serializers.ModelSerializer):
   class Meta:
       model = Holiday
       fields = "__all__"

class ClinicClosedDaySerializer(serializers.ModelSerializer):
   weekday_label = serializers.CharField(source="get_weekday_display", read_only=True)
   class Meta:
       model = ClinicClosedDay
       fields = ["id", "weekday", "weekday_label", "is_active"]

class ClinicClosureRangeSerializer(serializers.ModelSerializer):
   class Meta:
       model = ClinicClosureRange
       fields = "__all__"