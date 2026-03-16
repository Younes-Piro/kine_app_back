from django.db import models

class AppOption(models.Model):
   CATEGORY_GENDER = "gender"
   CATEGORY_DOSSIER_TYPE = "dossier_type"
   CATEGORY_MARITAL_STATUS = "marital_status"
   CATEGORY_SOCIAL_SECURITY = "social_security"
   CATEGORY_SESSION_RHYTHM = "session_rhythm"
   CATEGORY_SESSION_STATUS = "session_status"
   CATEGORY_PAYMENT_STATUS = "payment_status"
   CATEGORY_PAYMENT_METHOD = "payment_method"
   CATEGORY_CHOICES = [
       (CATEGORY_GENDER, "Gender"),
       (CATEGORY_DOSSIER_TYPE, "Dossier Type"),
       (CATEGORY_MARITAL_STATUS, "Marital Status"),
       (CATEGORY_SOCIAL_SECURITY, "Social Security"),
       (CATEGORY_SESSION_RHYTHM, "Session Rhythm"),
       (CATEGORY_SESSION_STATUS, "Session Status"),
       (CATEGORY_PAYMENT_STATUS, "Payment Status"),
       (CATEGORY_PAYMENT_METHOD, "Payment Method"),
   ]
   category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
   code = models.CharField(max_length=100)
   label = models.CharField(max_length=150)
   is_active = models.BooleanField(default=True)
   sort_order = models.PositiveIntegerField(default=0)
   class Meta:
       unique_together = ("category", "code")
       ordering = ["category", "sort_order", "label"]
   def __str__(self):
       return f"{self.category} - {self.label}"

class Holiday(models.Model):
   name = models.CharField(max_length=150)
   date = models.DateField(unique=True)
   source = models.CharField(max_length=50, default="manual")  # manual / seed
   is_active = models.BooleanField(default=True)
   class Meta:
       ordering = ["date"]
   def __str__(self):
       return f"{self.name} - {self.date}"

class ClinicClosedDay(models.Model):
   DAY_CHOICES = [
       (0, "Monday"),
       (1, "Tuesday"),
       (2, "Wednesday"),
       (3, "Thursday"),
       (4, "Friday"),
       (5, "Saturday"),
       (6, "Sunday"),
   ]
   weekday = models.PositiveSmallIntegerField(choices=DAY_CHOICES, unique=True)
   is_active = models.BooleanField(default=True)
   class Meta:
       ordering = ["weekday"]
   def __str__(self):
       return dict(self.DAY_CHOICES)[self.weekday]
   
class ClinicClosureRange(models.Model):
    reason = models.CharField(max_length=150)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, null=True)
    class Meta:
        ordering = ["start_date"]
    def __str__(self):
        return f"{self.reason} ({self.start_date} -> {self.end_date})"
    def clean(self):
        from django.core.exceptions import ValidationError
        if self.end_date < self.start_date:
            raise ValidationError("end_date must be greater than or equal to start_date.")