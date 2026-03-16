from django.core.management.base import BaseCommand
from app_settings.models import AppOption

DATA = {
   "gender": [
       ("male", "Male"),
       ("female", "Female"),
   ],
   "dossier_type": [
       ("cnss", "CNSS"),
       ("private", "Private"),
   ],
   "marital_status": [
       ("single", "Single"),
       ("married", "Married"),
       ("divorced", "Divorced"),
       ("widowed", "Widowed"),
   ],
   "social_security": [
       ("cnss", "CNSS"),
       ("amo", "AMO"),
       ("none", "None"),
   ],
   "session_rhythm": [
       ("1_per_week", "1 per week"),
       ("2_per_week", "2 per week"),
       ("3_per_week", "3 per week"),
   ],
   "session_status": [
        ("scheduled", "Scheduled"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
        ("missed", "Missed"),
   ],
    "payment_status": [
        ("paid", "Paid"),
        ("unpaid", "Unpaid"),
    ],
    "payment_method": [
        ("cash", "Cash"),
        ("card", "Card"),
        ("bank_transfer", "Bank Transfer"),
        ("check", "Check"),
    ],
}
class Command(BaseCommand):
   def handle(self, *args, **kwargs):
       for category, items in DATA.items():
           for index, (code, label) in enumerate(items, start=1):
               AppOption.objects.update_or_create(
                   category=category,
                   code=code,
                   defaults={"label": label, "sort_order": index, "is_active": True},
               )
       self.stdout.write(self.style.SUCCESS("App options seeded successfully."))