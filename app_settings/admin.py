from django.contrib import admin
from .models import AppOption, Holiday, ClinicClosedDay, ClinicClosureRange

admin.site.register(AppOption)
admin.site.register(Holiday)
admin.site.register(ClinicClosedDay)
admin.site.register(ClinicClosureRange)

