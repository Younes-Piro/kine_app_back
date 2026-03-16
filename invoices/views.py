from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from permissions.drf_permissions import HasPermission

from .models import Invoice
from .serializers import (
    InvoiceCreateSerializer,
    InvoiceDetailSerializer,
    InvoiceListSerializer,
)


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related(
        "client",
        "invoice_type",
        "session_rhythm",
    ).all()
    permission_classes = [IsAuthenticated, HasPermission]
    permission_map = {
        "list": "invoice:view",
        "retrieve": "invoice:view",
        "create": "invoice:create",
        "update": "invoice:update",
        "partial_update": "invoice:update",
        "destroy": "invoice:delete",
    }

    def get_queryset(self):
        queryset = super().get_queryset()
        client_id = self.request.query_params.get("client_id")
        invoice_type = self.request.query_params.get("invoice_type")
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        if invoice_type:
            queryset = queryset.filter(invoice_type_id=invoice_type)
        return queryset

    def get_serializer_class(self):
        if self.action == "list":
            return InvoiceListSerializer
        if self.action in {"create", "update", "partial_update"}:
            return InvoiceCreateSerializer
        return InvoiceDetailSerializer

    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "Hard delete is disabled for invoices."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )
