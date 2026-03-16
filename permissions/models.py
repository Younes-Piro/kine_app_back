from django.db import models
from users.models import Profile

class Permission(models.Model):
   code = models.CharField(max_length=100, unique=True)
   label = models.CharField(max_length=150)
   def __str__(self):
       return self.code

class ProfilePermission(models.Model):
   profile = models.ForeignKey(
       Profile,
       on_delete=models.CASCADE,
       related_name="profile_permissions"
   )
   permission = models.ForeignKey(
       Permission,
       on_delete=models.CASCADE,
       related_name="permission_profiles"
   )
   class Meta:
       unique_together = ("profile", "permission")
   def __str__(self):
       return f"{self.profile.user.username} - {self.permission.code}"
