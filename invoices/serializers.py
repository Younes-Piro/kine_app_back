from rest_framework import serializers

from app_settings.models import AppOption

from .models import Invoice
from .services import create_invoice


class InvoiceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = [
            "id",
            "client",
            "invoice_type",
            "invoice_number",
            "issue_date",
            "client_full_name",
            "diagnosis",
            "type_and_site",
            "start_date",
            "end_date",
            "number_of_sessions",
            "session_rhythm",
            "session_rhythm_text",
            "invoice_type_text",
            "unit_price",
            "total_amount",
            "notes",
            "pdf_file",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "invoice_number",
            "client_full_name",
            "end_date",
            "session_rhythm_text",
            "invoice_type_text",
            "total_amount",
            "created_at",
            "updated_at",
        ]

    def validate_invoice_type(self, value):
        if value and value.category != AppOption.CATEGORY_INVOICE_TYPE:
            raise serializers.ValidationError("Selected option is not an invoice type.")
        return value

    def validate_session_rhythm(self, value):
        if value and value.category != AppOption.CATEGORY_SESSION_RHYTHM:
            raise serializers.ValidationError(
                "Selected option is not a session rhythm."
            )
        return value

    def validate_number_of_sessions(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError(
                "Number of sessions must be greater than 0."
            )
        return value

    def validate_unit_price(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("Unit price must be greater than 0.")
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if not attrs.get("client"):
            raise serializers.ValidationError({"client": "Client is required."})
        if not attrs.get("start_date"):
            raise serializers.ValidationError({"start_date": "Start date is required."})
        return attrs

    def create(self, validated_data):
        return create_invoice(validated_data)


class InvoiceListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_number",
            "client",
            "client_full_name",
            "invoice_type",
            "invoice_type_text",
            "issue_date",
            "start_date",
            "end_date",
            "number_of_sessions",
            "unit_price",
            "total_amount",
            "created_at",
        ]


class InvoiceDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = [
            "id",
            "client",
            "invoice_type",
            "invoice_number",
            "issue_date",
            "client_full_name",
            "diagnosis",
            "type_and_site",
            "start_date",
            "end_date",
            "number_of_sessions",
            "session_rhythm",
            "session_rhythm_text",
            "invoice_type_text",
            "unit_price",
            "total_amount",
            "notes",
            "pdf_file",
            "created_at",
            "updated_at",
        ]
