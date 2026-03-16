from django.contrib import admin
from .models import Session

@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
   list_display = [
       "id",
       "treatment",
       "session_date",
       "status",
   ]
   list_filter = [
       "session_date",
       "status",
   ]
   search_fields = [
       "treatment__client__full_name",
       "treatment__title",
       "treatment__type_and_site",
       "notes",
   ]
