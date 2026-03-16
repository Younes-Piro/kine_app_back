from django.db import models
from app_settings.models import AppOption
from app_settings import scheduling
from datetime import date
from decimal import Decimal

class Client(models.Model):
   file_number = models.CharField(max_length=20, unique=True, blank=True, editable=False)
   full_name = models.CharField(max_length=255)
   gender = models.ForeignKey(
       AppOption,
       on_delete=models.SET_NULL,
       null=True,
       blank=True,
       related_name="clients_gender",
       limit_choices_to={"category": AppOption.CATEGORY_GENDER, "is_active": True},
   )
   cin = models.CharField(max_length=50, unique=True, blank=True, null=True)
   birth_date = models.DateField(blank=True, null=True)
   email = models.EmailField(blank=True, null=True)
   phone_number = models.CharField(max_length=30, blank=True, null=True)
   address = models.TextField(blank=True, null=True)
   marital_status = models.ForeignKey(
       AppOption,
       on_delete=models.SET_NULL,
       null=True,
       blank=True,
       related_name="clients_marital_status",
       limit_choices_to={"category": AppOption.CATEGORY_MARITAL_STATUS, "is_active": True},
   )
   social_security = models.ForeignKey(
       AppOption,
       on_delete=models.SET_NULL,
       null=True,
       blank=True,
       related_name="clients_social_security",
       limit_choices_to={"category": AppOption.CATEGORY_SOCIAL_SECURITY, "is_active": True},
   )
   dossier_type = models.ForeignKey(
       AppOption,
       on_delete=models.SET_NULL,
       null=True,
       blank=True,
       related_name="clients_dossier_type",
       limit_choices_to={"category": AppOption.CATEGORY_DOSSIER_TYPE, "is_active": True},
   )
   balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
   profile_photo = models.ImageField(upload_to="clients/profile_photos/", blank=True, null=True)
   is_active = models.BooleanField(default=True)
   created_at = models.DateTimeField(auto_now_add=True)
   updated_at = models.DateTimeField(auto_now=True)

   def save(self, *args, **kwargs):
       # Generate client number automatically
       if not self.file_number:
           last_client = Client.objects.order_by("id").last()
           if last_client is None:
               new_number = 1
           else:
               new_number = last_client.id + 1
           self.file_number = f"client_{new_number}"
       super().save(*args, **kwargs)
   class Meta:
       ordering = ["-created_at"]
   def __str__(self):
       return f"{self.file_number} - {self.full_name}"

class Treatment(models.Model):
   STATUS_OPEN = "open"
   STATUS_COMPLETED = "completed"
   STATUS_CANCELLED = "cancelled"
   STATUS_CHOICES = [
       (STATUS_OPEN, "Open"),
       (STATUS_COMPLETED, "Completed"),
       (STATUS_CANCELLED, "Cancelled"),
   ]
   client = models.ForeignKey(
       "Client",
       on_delete=models.CASCADE,
       related_name="treatments",
   )
   title = models.CharField(max_length=255, blank=True, null=True)
   treating_doctor = models.CharField(max_length=255, blank=True, null=True)
   diagnosis = models.TextField(blank=True, null=True)
   type_and_site = models.CharField(max_length=255)
   prescribed_sessions = models.PositiveIntegerField(default=0)
   completed_sessions = models.PositiveIntegerField(default=0, editable=False)
   session_rhythm = models.ForeignKey(
       AppOption,
       on_delete=models.SET_NULL,
       null=True,
       blank=False,
       related_name="treatments_session_rhythm",
       limit_choices_to={"category": AppOption.CATEGORY_SESSION_RHYTHM, "is_active": True},
   )
   start_date = models.DateField()
   end_date = models.DateField(blank=True, null=True)
   status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)
   session_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
   total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0, editable=False)
   total_remaining_amount = models.DecimalField(
       max_digits=10,
       decimal_places=2,
       default=0,
       editable=False,
   )
   balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
   notes = models.TextField(blank=True, null=True)
   is_active = models.BooleanField(default=True)
   created_at = models.DateTimeField(auto_now_add=True)
   updated_at = models.DateTimeField(auto_now=True)

   def calculate_total_remaining_amount(self):
    if not self.pk:
        remaining = (self.total_price or Decimal("0")) - (self.balance or Decimal("0"))
        return remaining if remaining > 0 else Decimal("0")

    paid_sessions_count = self.sessions.filter(
        payment_status__category=AppOption.CATEGORY_PAYMENT_STATUS,
        payment_status__code__in=["paid", "payed"],
        payment_status__is_active=True,
    ).count()
    paid_amount = (self.session_price or Decimal("0")) * Decimal(paid_sessions_count)
    remaining = (self.total_price or Decimal("0")) - (
        paid_amount + (self.balance or Decimal("0"))
    )
    return remaining if remaining > 0 else Decimal("0")

   def _rhythm_sessions_per_week(self):
    if not self.session_rhythm:
        return None
    return scheduling.get_sessions_per_week(self.session_rhythm.code)
   
   def _session_days_for_week(self):
    if not self.session_rhythm:
        return []
    return scheduling.get_session_weekdays(self.session_rhythm.code)

   def _closed_weekdays(self):
    return scheduling.get_closed_weekdays()

   def _holiday_dates(self):
    return scheduling.get_holiday_dates()

   def _is_in_closure_range(self, date_value):
    return scheduling.is_in_closure_range(date_value)

   def _is_working_day(self, date_value):
    return scheduling.is_working_day(
        date_value,
        closed_weekdays=self._closed_weekdays(),
        holiday_dates=self._holiday_dates(),
    )
   
   def _calculate_end_date(self):
    if not self.start_date or not self.session_rhythm or not self.prescribed_sessions:
        return None
    if self.completed_sessions > self.prescribed_sessions:
        return None
    remaining_sessions = self.prescribed_sessions - self.completed_sessions
    if remaining_sessions <= 0:
        return date.today()
    current_date = max(self.start_date, date.today()) if self.completed_sessions > 0 else self.start_date
    return scheduling.calculate_end_date(
        start_date=current_date,
        num_sessions=remaining_sessions,
        rhythm_code=self.session_rhythm.code,
    )
   
   def generate_sessions(self):
    from client_sessions.models import Session
    
    if self.sessions.exists():
       return
    if not self.session_rhythm:
        return
    scheduled_status = AppOption.objects.filter(
        category=AppOption.CATEGORY_SESSION_STATUS,
        code="scheduled",
        is_active=True,
    ).first()
    if not scheduled_status:
        return
    session_dates = scheduling.generate_session_dates(
        start_date=self.start_date,
        num_sessions=self.prescribed_sessions,
        rhythm_code=self.session_rhythm.code,
    )
    for session_date in session_dates:
        Session.objects.create(
            treatment=self,
            session_date=session_date,
            status=scheduled_status,
        )
   def save(self, *args, **kwargs):
       is_new = self.pk is None
       self.end_date = self._calculate_end_date()
       self.total_price = self.prescribed_sessions * self.session_price
       self.total_remaining_amount = self.calculate_total_remaining_amount()
       super().save(*args, **kwargs)
       if is_new:
          self.generate_sessions()
       recalculated_remaining = self.calculate_total_remaining_amount()
       if self.total_remaining_amount != recalculated_remaining:
          self.total_remaining_amount = recalculated_remaining
          super().save(update_fields=["total_remaining_amount", "updated_at"])
   class Meta:
       ordering = ["-created_at"]
   def __str__(self):
       return f"{self.client.full_name} - {self.title or self.type_and_site}"
