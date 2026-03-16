from django.core.exceptions import ValidationError
from django.db import models
from app_settings.models import AppOption, Holiday, ClinicClosedDay, ClinicClosureRange
from clients.models import Treatment

class Session(models.Model):
   treatment = models.ForeignKey(
       Treatment,
       on_delete=models.CASCADE,
       related_name="sessions",
   )
   session_date = models.DateField()
   status = models.ForeignKey(
       AppOption,
       on_delete=models.SET_NULL,
       null=True,
       blank=True,
       related_name="sessions_status",
       limit_choices_to={
           "category": AppOption.CATEGORY_SESSION_STATUS,
           "is_active": True,
       },
   )
   notes = models.TextField(blank=True, null=True)
   payment_status = models.ForeignKey(
       AppOption,
       on_delete=models.SET_NULL,
       null=True,
       blank=True,
       related_name="sessions_payment_status",
       limit_choices_to={
           "category": AppOption.CATEGORY_PAYMENT_STATUS,
           "is_active": True,
       },
   )
   created_at = models.DateTimeField(auto_now_add=True)
   updated_at = models.DateTimeField(auto_now=True)
   class Meta:
       ordering = ["-session_date", "-created_at"]
   def __str__(self):
       client_name = self.treatment.client.full_name if self.treatment_id else "Unknown"
       return f"{client_name} - {self.session_date}"
   def _closed_weekdays(self):
       return set(
           ClinicClosedDay.objects.filter(is_active=True)
           .values_list("weekday", flat=True)
       )
   def _holiday_dates(self):
       return set(
           Holiday.objects.filter(is_active=True)
           .values_list("date", flat=True)
       )
   def _is_in_closure_range(self, date_value):
       return ClinicClosureRange.objects.filter(
           is_active=True,
           start_date__lte=date_value,
           end_date__gte=date_value,
       ).exists()
   def clean(self):
       errors = {}
       if self.status and self.status.category != AppOption.CATEGORY_SESSION_STATUS:
           errors["status"] = "Selected option is not a session status."
       if self.session_date:
           if self.session_date.weekday() in self._closed_weekdays():
               errors["session_date"] = "This date is a clinic closed day."
           elif self.session_date in self._holiday_dates():
               errors["session_date"] = "This date is a holiday."
           elif self._is_in_closure_range(self.session_date):
               errors["session_date"] = "This date is inside a clinic closure range."
       if self.treatment and not self.treatment.is_active:
           errors["treatment"] = "Cannot create a session for an inactive treatment."
       if errors:
           raise ValidationError(errors)
   def save(self, *args, **kwargs):
       self.full_clean()
       super().save(*args, **kwargs)