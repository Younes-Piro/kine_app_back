from django.contrib import admin
from .models import Client, Treatment

admin.site.register(Client)
admin.site.register(Treatment)