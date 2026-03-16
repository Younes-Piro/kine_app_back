from decimal import Decimal
from rest_framework import serializers
from app_settings.models import AppOption
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    payment_method_label = serializers.CharField(
        source="payment_method.label", read_only=True
    )
    treatment_title = serializers.CharField(
        source="treatment.title", read_only=True
    )
    client_full_name = serializers.CharField(
        source="treatment.client.full_name", read_only=True
    )
    treatment_total_remaining_amount = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id",
            "treatment",
            "treatment_title",
            "client_full_name",
            "treatment_total_remaining_amount",
            "amount",
            "payment_date",
            "payment_method",
            "payment_method_label",
            "notes",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_amount(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("Payment amount must be greater than 0.")
        return value

    def validate_payment_method(self, value):
        if value and value.category != AppOption.CATEGORY_PAYMENT_METHOD:
            raise serializers.ValidationError(
                "Selected option is not a payment method."
            )
        return value

    def validate_treatment(self, value):
        if not value:
            raise serializers.ValidationError("Treatment is required.")
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        treatment = attrs.get("treatment") or getattr(self.instance, "treatment", None)
        amount = attrs.get("amount")
        if treatment is None or amount is None:
            return attrs

        max_allowed_amount = (
            treatment.total_remaining_amount + (treatment.balance or Decimal("0"))
        )
        if amount > max_allowed_amount:
            raise serializers.ValidationError(
                {
                    "amount": (
                        "Payment amount cannot be greater than "
                        "treatment total remaining amount plus balance."
                    )
                }
            )
        return attrs

    def get_treatment_total_remaining_amount(self, obj):
        return obj.treatment.total_remaining_amount
