from django.core.management.base import BaseCommand

from permissions.models import Permission


PERMISSIONS = [
    ("client:view", "View Clients"),
    ("client:create", "Create Clients"),
    ("client:update", "Update Clients"),
    ("treatment:view", "View Treatments"),
    ("treatment:create", "Create Treatments"),
    ("treatment:update", "Update Treatments"),
    ("session:view", "View Sessions"),
    ("session:create", "Create Sessions"),
    ("session:update", "Update Sessions"),
    ("payment:view", "View Payments"),
    ("payment:create", "Create Payments"),
    ("payment:update", "Update Payments"),
    ("invoice:view", "View Invoices"),
    ("invoice:create", "Create Invoices"),
    ("invoice:update", "Update Invoices"),
    ("user:view", "View Users"),
    ("user:create", "Create Users"),
    ("user:update", "Update Users"),
    ("settings:view", "View Settings"),
    ("settings:update", "Update Settings"),
]


class Command(BaseCommand):
    help = "Seed all API permission codes used by the permission_map system."

    def handle(self, *args, **kwargs):
        created = 0
        updated = 0

        for code, label in PERMISSIONS:
            _, is_created = Permission.objects.update_or_create(
                code=code,
                defaults={"label": label},
            )
            if is_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Permissions seeded successfully. Created: {created}, Updated: {updated}"
            )
        )
