from app_settings.models import AppOption
from payments.services import recalculate_treatment_payments


def _get_cancelled_session_status():
    return AppOption.objects.filter(
        category=AppOption.CATEGORY_SESSION_STATUS,
        code="cancelled",
        is_active=True,
    ).first()


def deactivate_treatment_with_cascade(treatment, cancelled_status=None):
    """
    Soft-deactivate one treatment and cascade to scheduled sessions + active payments.
    """
    from django.utils import timezone

    if cancelled_status is None:
        cancelled_status = _get_cancelled_session_status()

    if treatment.is_active:
        treatment.is_active = False
        treatment.save(update_fields=["is_active", "updated_at"])

    if cancelled_status:
        treatment.sessions.filter(
            status__category=AppOption.CATEGORY_SESSION_STATUS,
            status__code="scheduled",
        ).update(status=cancelled_status, updated_at=timezone.now())

    deactivated_count = treatment.payments.filter(is_active=True).update(
        is_active=False,
        updated_at=timezone.now(),
    )
    if deactivated_count:
        recalculate_treatment_payments(treatment)


def deactivate_client_with_cascade(client):
    """
    Soft-deactivate one client and cascade the same deactivation behavior
    to each active treatment.
    """
    if client.is_active:
        client.is_active = False
        client.save(update_fields=["is_active", "updated_at"])

    cancelled_status = _get_cancelled_session_status()
    active_treatments = list(client.treatments.filter(is_active=True))
    for treatment in active_treatments:
        deactivate_treatment_with_cascade(
            treatment,
            cancelled_status=cancelled_status,
        )
