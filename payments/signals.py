from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Payment
from .services import apply_payment_to_treatment, recalculate_treatment_payments


@receiver(post_save, sender=Payment)
def recalculate_after_payment_save(sender, instance, created, **kwargs):
    """
    On create: apply incremental allocation using balance + payment amount.
    On update/deactivation: rebuild from active payment totals.
    """
    if created and instance.is_active:
        apply_payment_to_treatment(instance)
        return
    recalculate_treatment_payments(instance.treatment)


@receiver(post_delete, sender=Payment)
def recalculate_after_payment_delete(sender, instance, **kwargs):
    """Recalculate treatment payment state after a payment is hard-deleted."""
    recalculate_treatment_payments(instance.treatment)
