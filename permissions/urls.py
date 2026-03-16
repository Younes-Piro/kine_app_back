from django.urls import path
from .views import permissions_catalog_view, my_permissions_view, user_permissions_view

urlpatterns = [
   path("", permissions_catalog_view, name="permissions-catalog"),
   path("me/", my_permissions_view, name="my-permissions"),
   path("users/<int:user_id>/", user_permissions_view, name="user-permissions"),
]