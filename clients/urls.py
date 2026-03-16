from rest_framework.routers import DefaultRouter
from .views import ClientViewSet, TreatmentViewSet

router = DefaultRouter()
router.register("clients", ClientViewSet, basename="clients")
router.register("treatments", TreatmentViewSet, basename="treatments")
urlpatterns = router.urls