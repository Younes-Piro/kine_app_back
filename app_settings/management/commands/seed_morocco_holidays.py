from django.core.management.base import BaseCommand
from app_settings.models import Holiday
import holidays

class Command(BaseCommand):
   help = "Seed Morocco holidays for a given year range"
   def add_arguments(self, parser):
       parser.add_argument("--start", type=int, required=True)
       parser.add_argument("--end", type=int, required=True)
   def handle(self, *args, **options):
       start = options["start"]
       end = options["end"]
       ma_holidays = holidays.country_holidays(
           "MA",
           years=range(start, end + 1),
           language="fr",
       )
       for holiday_date, holiday_name in ma_holidays.items():
           Holiday.objects.update_or_create(
               date=holiday_date,
               defaults={
                   "name": str(holiday_name),
                   "source": "seed",
                   "is_active": True,
               },
           )
       self.stdout.write(
           self.style.SUCCESS(f"Seeded Morocco holidays from {start} to {end}.")
       )