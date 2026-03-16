from datetime import date

from django.db import models

from app_settings.models import AppOption
from clients.models import Client


class Invoice(models.Model):
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="invoices",
    )
    invoice_type = models.ForeignKey(
        AppOption,
        on_delete=models.SET_NULL,
        null=True,
        blank=False,
        related_name="invoices_type",
        limit_choices_to={
            "category": AppOption.CATEGORY_INVOICE_TYPE,
            "is_active": True,
        },
    )
    invoice_number = models.CharField(max_length=30, unique=True, editable=False)
    issue_date = models.DateField(default=date.today)

    # Snapshot fields (immutable source snapshot at creation time)
    client_full_name = models.CharField(max_length=255, editable=False)
    diagnosis = models.TextField(blank=True, null=True)
    type_and_site = models.CharField(max_length=255, blank=True, null=True)
    start_date = models.DateField()
    end_date = models.DateField()
    number_of_sessions = models.PositiveIntegerField()
    session_rhythm = models.ForeignKey(
        AppOption,
        on_delete=models.SET_NULL,
        null=True,
        blank=False,
        related_name="invoices_session_rhythm",
        limit_choices_to={
            "category": AppOption.CATEGORY_SESSION_RHYTHM,
            "is_active": True,
        },
    )
    session_rhythm_text = models.CharField(max_length=150, editable=False)
    invoice_type_text = models.CharField(max_length=150, editable=False)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        editable=False,
    )
    notes = models.TextField(blank=True, null=True)
    pdf_file = models.FileField(upload_to="invoices/pdfs/", blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-issue_date", "-created_at"]

    def __str__(self):
        return f"{self.invoice_number} - {self.client_full_name}"
