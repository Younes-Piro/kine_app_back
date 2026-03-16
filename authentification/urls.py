from django.urls import path
from .views import LoginAPIView, RefreshAPIView, LogoutAPIView, MeAPIView
urlpatterns = [
   path("login/", LoginAPIView.as_view(), name="login"),
   path("refresh/", RefreshAPIView.as_view(), name="refresh"),
   path("logout/", LogoutAPIView.as_view(), name="logout"),
   path("me/", MeAPIView.as_view(), name="me"),
]