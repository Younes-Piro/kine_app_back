from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Payment
from .serializers import PaymentSerializer


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related(
        "treatment",
        "treatment__client",
        "payment_method",
    ).all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

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
        serializer.save()

    def perform_update(self, serializer):
        treatment = serializer.validated_data.get("treatment", serializer.instance.treatment)
        amount = serializer.validated_data.get("amount", serializer.instance.amount)
        self._validate_payment_ceiling(
            treatment=treatment,
            amount=amount,
        )
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        """Soft delete: set is_active = False instead of hard delete."""
        payment = self.get_object()
        payment.is_active = False
        payment.save()
        return Response(
            {"detail": "Payment deactivated successfully."},
            status=status.HTTP_200_OK,
        )
