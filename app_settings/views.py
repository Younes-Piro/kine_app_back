from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from activity_log.mixins import LoggingMixin
from permissions.drf_permissions import HasPermission, IsAdminProfile
from .models import AppOption, Holiday, ClinicClosedDay, ClinicClosureRange
from .serializers import (
   AppOptionSerializer,
   HolidaySerializer,
   ClinicClosedDaySerializer,
   ClinicClosureRangeSerializer,
)

SETTINGS_PERMISSION_MAP = {
   "list": "settings:view",
   "retrieve": "settings:view",
   "create": "settings:update",
   "update": "settings:update",
   "partial_update": "settings:update",
   "destroy": "settings:delete",
   "deactivate": "settings:delete",
}


class SettingsDeactivateMixin:
   def destroy(self, request, *args, **kwargs):
       return Response(
           {"detail": "Hard delete is disabled. Use deactivate instead."},
           status=status.HTTP_405_METHOD_NOT_ALLOWED,
       )

   @action(detail=True, methods=["patch"])
   def deactivate(self, request, pk=None):
       obj = self.get_object()
       obj.is_active = False
       obj.save(update_fields=["is_active"])
       if hasattr(self, "log_deactivate_action"):
           self.log_deactivate_action(obj)
       return Response({"detail": "Deactivated successfully."})


class AppOptionViewSet(LoggingMixin, SettingsDeactivateMixin, viewsets.ModelViewSet):
   queryset = AppOption.objects.all().order_by("category", "sort_order", "label")
   serializer_class = AppOptionSerializer
   log_model_name = "AppOption"
   permission_classes = [IsAuthenticated, HasPermission]
   permission_map = SETTINGS_PERMISSION_MAP
   def get_queryset(self):
       queryset = super().get_queryset()
       category = self.request.query_params.get("category")
       if category:
           queryset = queryset.filter(category=category)
       return queryset

class HolidayViewSet(LoggingMixin, SettingsDeactivateMixin, viewsets.ModelViewSet):
   queryset = Holiday.objects.all().order_by("date")
   serializer_class = HolidaySerializer
   log_model_name = "Holiday"
   permission_classes = [IsAuthenticated, HasPermission]
   permission_map = SETTINGS_PERMISSION_MAP

class ClinicClosedDayViewSet(LoggingMixin, SettingsDeactivateMixin, viewsets.ModelViewSet):
   queryset = ClinicClosedDay.objects.all().order_by("weekday")
   serializer_class = ClinicClosedDaySerializer
   log_model_name = "ClinicClosedDay"
   permission_classes = [IsAuthenticated, HasPermission]
   permission_map = SETTINGS_PERMISSION_MAP

class ClinicClosureRangeViewSet(LoggingMixin, SettingsDeactivateMixin, viewsets.ModelViewSet):
   queryset = ClinicClosureRange.objects.all().order_by("start_date")
   serializer_class = ClinicClosureRangeSerializer
   log_model_name = "ClinicClosureRange"
   permission_classes = [IsAuthenticated, HasPermission]
   permission_map = SETTINGS_PERMISSION_MAP

class SettingsDashboardAPIView(APIView):
   permission_classes = [IsAuthenticated, IsAdminProfile]
   def get(self, request):
       options = AppOption.objects.all().order_by("category", "sort_order", "label")
       holidays = Holiday.objects.all().order_by("date")
       closed_days = ClinicClosedDay.objects.all().order_by("weekday")
       closure_ranges = ClinicClosureRange.objects.all().order_by("start_date")
       return Response({
           "options": AppOptionSerializer(options, many=True).data,
           "holidays": HolidaySerializer(holidays, many=True).data,
           "closed_days": ClinicClosedDaySerializer(closed_days, many=True).data,
           "closure_ranges": ClinicClosureRangeSerializer(closure_ranges, many=True).data,
       })
