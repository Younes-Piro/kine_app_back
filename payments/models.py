from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import models
from app_settings.models import AppOption
from clients.models import Treatment


class Payment(models.Model):
    treatment = models.ForeignKey(
        Treatment,
        on_delete=models.CASCADE,
        related_name="payments",
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateField()
    payment_method = models.ForeignKey(
        AppOption,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments_method",
        limit_choices_to={
            "category": AppOption.CATEGORY_PAYMENT_METHOD,
            "is_active": True,
        },
    )
    notes = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-payment_date", "-created_at"]

    def __str__(self):
        return f"Payment #{self.pk} - {self.amount} for {self.treatment}"

    def clean(self):
        errors = {}

        if self.amount is None or self.amount <= 0:
            errors["amount"] = "Payment amount must be greater than 0."

        if self.payment_method and self.payment_method.category != AppOption.CATEGORY_PAYMENT_METHOD:
            errors["payment_method"] = "Selected option is not a payment method."

        if self.treatment_id and self.amount is not None and self.amount > 0:
            max_allowed = self.treatment.total_remaining_amount + (self.treatment.balance or Decimal("0"))
            if self.amount > max_allowed:
                errors["amount"] = (
                    f"Payment amount exceeds allowed maximum ({max_allowed}). "
                    "It must be <= total_remaining_amount + balance."
                )

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
