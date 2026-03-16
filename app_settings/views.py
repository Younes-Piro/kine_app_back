from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import AppOption, Holiday, ClinicClosedDay, ClinicClosureRange
from .serializers import (
   AppOptionSerializer,
   HolidaySerializer,
   ClinicClosedDaySerializer,
   ClinicClosureRangeSerializer,
)

class IsAdminProfile(BasePermission):
   def has_permission(self, request, view):
       return (
           request.user
           and request.user.is_authenticated
           and hasattr(request.user, "profile")
           and request.user.profile.role == "admin"
       )

class AppOptionViewSet(viewsets.ModelViewSet):
   queryset = AppOption.objects.all().order_by("category", "sort_order", "label")
   serializer_class = AppOptionSerializer
   permission_classes = [IsAuthenticated, IsAdminProfile]
   def get_queryset(self):
       queryset = super().get_queryset()
       category = self.request.query_params.get("category")
       if category:
           queryset = queryset.filter(category=category)
       return queryset

class HolidayViewSet(viewsets.ModelViewSet):
   queryset = Holiday.objects.all().order_by("date")
   serializer_class = HolidaySerializer
   permission_classes = [IsAuthenticated, IsAdminProfile]

class ClinicClosedDayViewSet(viewsets.ModelViewSet):
   queryset = ClinicClosedDay.objects.all().order_by("weekday")
   serializer_class = ClinicClosedDaySerializer
   permission_classes = [IsAuthenticated, IsAdminProfile]

class ClinicClosureRangeViewSet(viewsets.ModelViewSet):
   queryset = ClinicClosureRange.objects.all().order_by("start_date")
   serializer_class = ClinicClosureRangeSerializer
   permission_classes = [IsAuthenticated, IsAdminProfile]

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
