from decimal import Decimal
from django.db.models import Q, Sum
from app_settings.models import AppOption


def _get_payment_status_options():
    paid_option = AppOption.objects.filter(
        category=AppOption.CATEGORY_PAYMENT_STATUS,
        code__in=["paid", "payed"],
        is_active=True,
    ).order_by("code").first()
    unpaid_option = AppOption.objects.filter(
        category=AppOption.CATEGORY_PAYMENT_STATUS,
        code="unpaid",
        is_active=True,
    ).first()
    return paid_option, unpaid_option


def _set_treatment_balance(treatment, amount):
    treatment.balance = amount if amount > 0 else Decimal("0")
    treatment.total_remaining_amount = treatment.calculate_total_remaining_amount()
    treatment.save(update_fields=["balance", "total_remaining_amount", "updated_at"])


def apply_payment_to_treatment(payment):
    """
    Apply one newly created payment using treatment-scoped, oldest-first logic.

    usable_amount = payment.amount + treatment.balance
    eligible sessions = same treatment + unpaid/null payment_status
    order by session_date ASC, id ASC
    """
    from client_sessions.models import Session

    if not payment.is_active:
        return

    treatment = payment.treatment
    paid_option, unpaid_option = _get_payment_status_options()
    if not paid_option or not unpaid_option:
        return

    session_price = treatment.session_price or Decimal("0")
    usable_amount = (payment.amount or Decimal("0")) + (treatment.balance or Decimal("0"))

    if session_price <= 0:
        _set_treatment_balance(treatment, usable_amount)
        return

    unpaid_sessions = Session.objects.filter(
        treatment=treatment,
    ).filter(
        Q(payment_status__isnull=True)
        | Q(
            payment_status__category=AppOption.CATEGORY_PAYMENT_STATUS,
            payment_status__code="unpaid",
            payment_status__is_active=True,
        )
    ).order_by("session_date", "id")

    paid_ids = []
    eligible_unpaid_ids = []
    for session in unpaid_sessions:
        eligible_unpaid_ids.append(session.pk)
        if usable_amount >= session_price:
            paid_ids.append(session.pk)
            usable_amount -= session_price

    if paid_ids:
        Session.objects.filter(pk__in=paid_ids).update(payment_status=paid_option)

    if eligible_unpaid_ids:
        Session.objects.filter(pk__in=eligible_unpaid_ids).exclude(
            pk__in=paid_ids
        ).update(payment_status=unpaid_option)

    _set_treatment_balance(treatment, usable_amount)


def recalculate_treatment_payments(treatment):
    """
    Rebuild treatment payment state from active payments.
    Used when a payment is edited/deactivated/deleted or session state changes.
    """
    from payments.models import Payment
    from client_sessions.models import Session

    paid_option, unpaid_option = _get_payment_status_options()

    total_paid = (
        Payment.objects.filter(treatment=treatment, is_active=True)
        .aggregate(total=Sum("amount"))["total"]
        or Decimal("0")
    )
    has_any_payments = Payment.objects.filter(treatment=treatment).exists()

    treatment_sessions = Session.objects.filter(
        treatment=treatment,
    ).order_by("session_date", "id")

    session_price = treatment.session_price or Decimal("0")

    # Opening balance on a treatment with no payment rows should still allocate
    # sessions exactly like a payment source.
    if total_paid == 0 and not has_any_payments:
        existing_paid_sessions_count = treatment_sessions.filter(
            payment_status__category=AppOption.CATEGORY_PAYMENT_STATUS,
            payment_status__code__in=["paid", "payed"],
            payment_status__is_active=True,
        ).count()
        total_paid = (
            (Decimal(existing_paid_sessions_count) * session_price)
            + (treatment.balance or Decimal("0"))
        )

    remaining = total_paid

    paid_session_ids = []
    unpaid_session_ids = []

    for session in treatment_sessions:
        if session_price > 0 and remaining >= session_price and paid_option:
            paid_session_ids.append(session.pk)
            remaining -= session_price
        else:
            unpaid_session_ids.append(session.pk)

    if paid_session_ids and paid_option:
        Session.objects.filter(pk__in=paid_session_ids).update(payment_status=paid_option)

    if unpaid_session_ids and unpaid_option:
        Session.objects.filter(pk__in=unpaid_session_ids).update(payment_status=unpaid_option)

    _set_treatment_balance(treatment, remaining)
