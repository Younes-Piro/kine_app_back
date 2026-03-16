from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import (
   AppOptionViewSet,
   HolidayViewSet,
   ClinicClosedDayViewSet,
   ClinicClosureRangeViewSet,
   SettingsDashboardAPIView
)
router = DefaultRouter()
router.register("options", AppOptionViewSet, basename="settings-options")
router.register("holidays", HolidayViewSet, basename="settings-holidays")
router.register("closed-days", ClinicClosedDayViewSet, basename="settings-closed-days")
router.register("closure-ranges", ClinicClosureRangeViewSet, basename="settings-closure-ranges")

urlpatterns = [
   path("", SettingsDashboardAPIView.as_view(), name="settings-dashboard"),
]
urlpatterns += router.urls