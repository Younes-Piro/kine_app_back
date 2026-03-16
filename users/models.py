from django.conf import settings
from django.db import models

class Profile(models.Model):
   ROLE_ADMIN = "admin"
   ROLE_STAFF = "staff"
   ROLE_CHOICES = [
       (ROLE_ADMIN, "Admin"),
       (ROLE_STAFF, "Staff"),
   ]
   user = models.OneToOneField(
       settings.AUTH_USER_MODEL,
       on_delete=models.CASCADE,
       related_name="profile",
   )
   role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_STAFF)
   is_active = models.BooleanField(default=True)
   def __str__(self):
       return f"{self.user.username} - {self.role}"