from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from app_settings.models import AppOption
from .models import Session

def update_treatment_completed_sessions(treatment):
   completed_count = Session.objects.filter(
       treatment=treatment,
       status__category=AppOption.CATEGORY_SESSION_STATUS,
       status__code="completed",
       status__is_active=True,
   ).count()
   if treatment.completed_sessions != completed_count:
       treatment.completed_sessions = completed_count
       treatment.save(update_fields=["completed_sessions", "updated_at"])

@receiver(post_save, sender=Session)
def update_treatment_after_session_save(sender, instance, **kwargs):
   update_treatment_completed_sessions(instance.treatment)
   # Recalculate payment distribution when session status changes
   from payments.services import recalculate_treatment_payments
   recalculate_treatment_payments(instance.treatment)

@receiver(post_delete, sender=Session)
def update_treatment_after_session_delete(sender, instance, **kwargs):
   update_treatment_completed_sessions(instance.treatment)
   from payments.services import recalculate_treatment_payments
   recalculate_treatment_payments(instance.treatment)