from django.db import models
from app_settings.models import AppOption, Holiday, ClinicClosedDay, ClinicClosureRange
from datetime import date, timedelta
from datetime import timedelta
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
    mapping = {
        "1_per_week": 1,
        "2_per_week": 2,
        "3_per_week": 3,
    }
    return mapping.get(self.session_rhythm.code)
   
   def _session_days_for_week(self):
    sessions_per_week = self._rhythm_sessions_per_week()
    if sessions_per_week == 1:
        return [0]          # Monday
    elif sessions_per_week == 2:
        return [0, 3]       # Monday, Thursday
    elif sessions_per_week == 3:
        return [0, 2, 4]    # Monday, Wednesday, Friday
    return [] 

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
        end_date__gte=date_value
    ).exists()

   def _is_working_day(self, date_value):
    if date_value.weekday() in self._closed_weekdays():
        return False
    if date_value in self._holiday_dates():
        return False
    if self._is_in_closure_range(date_value):
        return False
    return True
   
   def _calculate_end_date(self):
    if not self.start_date or not self.session_rhythm or not self.prescribed_sessions:
        return None
    if self.completed_sessions > self.prescribed_sessions:
        return None
    remaining_sessions = self.prescribed_sessions - self.completed_sessions
    if remaining_sessions <= 0:
        return date.today()
    session_days = self._session_days_for_week()
    if not session_days:
        return None
    current_date = max(self.start_date, date.today()) if self.completed_sessions > 0 else self.start_date
    sessions_counted = 0
    while sessions_counted < remaining_sessions:
        if self._is_working_day(current_date) and current_date.weekday() in session_days:
            sessions_counted += 1
            if sessions_counted == remaining_sessions:
                return current_date
        current_date += timedelta(days=1)
    return current_date
   
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
    session_days = self._session_days_for_week()
    closed_days = set(
        ClinicClosedDay.objects.filter(is_active=True)
        .values_list("weekday", flat=True)
    )
    holidays = set(
        Holiday.objects.filter(is_active=True)
        .values_list("date", flat=True)
    )
    closure_ranges = list(
        ClinicClosureRange.objects.filter(is_active=True)
    )
    current_date = self.start_date
    sessions_created = 0
    while sessions_created < self.prescribed_sessions:
        is_closure_range = any(
            r.start_date <= current_date <= r.end_date
            for r in closure_ranges
        )
        if (
            current_date.weekday() in session_days
            and current_date.weekday() not in closed_days
            and current_date not in holidays
            and not is_closure_range
        ):
            Session.objects.create(
                treatment=self,
                session_date=current_date,
                status=scheduled_status,
            )
            sessions_created += 1
        current_date += timedelta(days=1)
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
