from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "treatment",
        "amount",
        "payment_date",
        "payment_method",
        "is_active",
        "created_at",
    ]
    list_filter = [
        "is_active",
        "payment_date",
        "payment_method",
    ]
    search_fields = [
        "treatment__client__full_name",
        "treatment__title",
        "treatment__type_and_site",
        "notes",
    ]
