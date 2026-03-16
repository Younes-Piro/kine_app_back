from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import DecimalField, Q, Sum, Value
from django.db.models.functions import Coalesce
from permissions.drf_permissions import HasPermission
from .models import Client, Treatment
from .serializers import (
    ClientSerializer, 
    TreatmentSerializer,
    TreatmentDetailSerializer,
    TreatmentListSerializer
)

class ClientViewSet(viewsets.ModelViewSet):
   queryset = Client.objects.select_related(
       "gender",
       "marital_status",
       "social_security",
       "dossier_type",
   ).all()
   serializer_class = ClientSerializer
   permission_classes = [IsAuthenticated, HasPermission]
   permission_map = {
       "list": "client:view",
       "retrieve": "client:view",
       "create": "client:create",
       "update": "client:update",
       "partial_update": "client:update",
       "deactivate": "client:update",
   }
   def destroy(self, request, *args, **kwargs):
       return Response(
           {"detail": "Hard delete is disabled. Use deactivate instead."},
           status=status.HTTP_405_METHOD_NOT_ALLOWED,
       )
   @action(detail=True, methods=["patch"])
   def deactivate(self, request, pk=None):
       client = self.get_object()
       client.is_active = False
       client.save()
       return Response({"detail": "Client deactivated successfully."})

class TreatmentViewSet(viewsets.ModelViewSet):
   queryset = Treatment.objects.select_related(
       "client",
       "session_rhythm",
   ).annotate(
       total_paid_amount=Coalesce(
           Sum("payments__amount", filter=Q(payments__is_active=True)),
           Value(0),
           output_field=DecimalField(max_digits=10, decimal_places=2),
       )
   ).prefetch_related(
       "sessions",
       "sessions__status",
       "sessions__payment_status",
   ).all()
   permission_classes = [IsAuthenticated, HasPermission]
   permission_map = {
       "list": "treatment:view",
       "retrieve": "treatment:view",
       "create": "treatment:create",
       "update": "treatment:update",
       "partial_update": "treatment:update",
       "deactivate": "treatment:update",
       "balance": "treatment:view",
   }
   def get_queryset(self):
       queryset = super().get_queryset()
       client_id = self.request.query_params.get("client_id")
       if client_id:
           queryset = queryset.filter(client_id=client_id)
       return queryset
   def get_serializer_class(self):
       if self.action == "list":
           return TreatmentListSerializer
       if self.action in {"create", "update", "partial_update"}:
           return TreatmentSerializer
       return TreatmentDetailSerializer
   def destroy(self, request, *args, **kwargs):
       return Response(
           {"detail": "Hard delete is disabled. Use deactivate instead."},
           status=status.HTTP_405_METHOD_NOT_ALLOWED,
       )
   @action(detail=True, methods=["patch"])
   def deactivate(self, request, pk=None):
       treatment = self.get_object()
       treatment.is_active = False
       treatment.save()
       return Response({"detail": "Treatment deactivated successfully."})

   @action(detail=True, methods=["get"])
   def balance(self, request, pk=None):
       from payments.models import Payment
       from decimal import Decimal

       treatment = self.get_object()
       total_paid = (
           Payment.objects.filter(treatment=treatment, is_active=True)
           .aggregate(total=Sum("amount"))["total"]
           or Decimal("0")
       )
       sessions = treatment.sessions.select_related(
           "status", "payment_status"
       ).order_by("session_date", "id")
       sessions_data = [
           {
               "id": s.id,
               "session_date": s.session_date,
               "status": s.status.label if s.status else None,
               "payment_status": s.payment_status.label if s.payment_status else None,
           }
           for s in sessions
       ]
       return Response({
           "treatment_id": treatment.id,
           "session_price": str(treatment.session_price),
           "total_price": str(treatment.total_price),
           "total_paid": str(total_paid),
           "total_remaining_amount": str(treatment.total_remaining_amount),
           "balance": str(treatment.balance),
           "is_paid": treatment.total_remaining_amount == Decimal("0"),
           "sessions": sessions_data,
       })
