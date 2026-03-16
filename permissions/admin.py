from django.contrib import admin
from .models import Permission, ProfilePermission

admin.site.register(Permission)
admin.site.register(ProfilePermission)
