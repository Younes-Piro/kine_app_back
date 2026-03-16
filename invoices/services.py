from datetime import date

from app_settings import scheduling

from .models import Invoice


def generate_invoice_number():
    last_invoice = Invoice.objects.order_by("id").last()
    new_number = 1 if last_invoice is None else last_invoice.id + 1
    return f"INV-{new_number}"


def create_invoice(validated_data):
    client = validated_data["client"]
    invoice_type = validated_data["invoice_type"]
    session_rhythm = validated_data["session_rhythm"]
    issue_date = validated_data.get("issue_date") or date.today()
    start_date = validated_data["start_date"]
    number_of_sessions = validated_data["number_of_sessions"]
    unit_price = validated_data["unit_price"]

    end_date = scheduling.calculate_end_date(
        start_date=start_date,
        num_sessions=number_of_sessions,
        rhythm_code=session_rhythm.code,
    )
    total_amount = number_of_sessions * unit_price

    return Invoice.objects.create(
        client=client,
        invoice_type=invoice_type,
        invoice_number=generate_invoice_number(),
        issue_date=issue_date,
        client_full_name=client.full_name,
        diagnosis=validated_data.get("diagnosis"),
        type_and_site=validated_data.get("type_and_site"),
        start_date=start_date,
        end_date=end_date,
        number_of_sessions=number_of_sessions,
        session_rhythm=session_rhythm,
        session_rhythm_text=session_rhythm.label if session_rhythm else "",
        invoice_type_text=invoice_type.label if invoice_type else "",
        unit_price=unit_price,
        total_amount=total_amount,
        notes=validated_data.get("notes"),
        pdf_file=validated_data.get("pdf_file"),
    )
