from django.contrib import admin

from .models import Invoice


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = (
        "invoice_number",
        "client",
        "invoice_type",
        "issue_date",
        "number_of_sessions",
        "unit_price",
        "total_amount",
        "start_date",
        "end_date",
    )
    search_fields = ("invoice_number", "client__full_name")
    list_filter = ("invoice_type", "issue_date")
