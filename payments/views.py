from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from activity_log.mixins import LoggingMixin
from permissions.drf_permissions import HasPermission
from .models import Payment
from .serializers import PaymentSerializer


class PaymentViewSet(LoggingMixin, viewsets.ModelViewSet):
    queryset = Payment.objects.select_related(
        "treatment",
        "treatment__client",
        "payment_method",
    ).all()
    serializer_class = PaymentSerializer
    log_model_name = "Payment"
    permission_classes = [IsAuthenticated, HasPermission]
    permission_map = {
        "list": "payment:view",
        "retrieve": "payment:view",
        "create": "payment:create",
        "update": "payment:update",
        "partial_update": "payment:update",
        "destroy": "payment:delete",
        "deactivate": "payment:delete",
    }

    def get_queryset(self):
        queryset = super().get_queryset()
        treatment_id = self.request.query_params.get("treatment")
        if treatment_id:
            queryset = queryset.filter(treatment_id=treatment_id)
        return queryset

    def _validate_payment_ceiling(self, treatment, amount):
        max_allowed = treatment.total_remaining_amount + (treatment.balance or 0)
        if amount > max_allowed:
            raise ValidationError(
                {
                    "amount": (
                        f"Payment amount exceeds allowed maximum ({max_allowed}). "
                        "It must be <= total_remaining_amount + balance."
                    )
                }
            )

    def perform_create(self, serializer):
        treatment = serializer.validated_data["treatment"]
        amount = serializer.validated_data["amount"]
        self._validate_payment_ceiling(treatment=treatment, amount=amount)
        payment = serializer.save()
        self.log_create_action(payment)

    def perform_update(self, serializer):
        treatment = serializer.validated_data.get("treatment", serializer.instance.treatment)
        amount = serializer.validated_data.get("amount", serializer.instance.amount)
        self._validate_payment_ceiling(
            treatment=treatment,
            amount=amount,
        )
        payment = serializer.save()
        self.log_update_action(payment)

    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "Hard delete is disabled. Use deactivate instead."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @action(detail=True, methods=["patch"])
    def deactivate(self, request, pk=None):
        payment = self.get_object()
        payment.is_active = False
        payment.save(update_fields=["is_active", "updated_at"])
        self.log_deactivate_action(payment)
        return Response({"detail": "Payment deactivated successfully."})
