from django.contrib.auth.models import User
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from activity_log.mixins import LoggingMixin
from permissions.drf_permissions import IsAdminProfile
from .serializers import (
   UserCreateSerializer,
   UserDetailSerializer,
   UserListSerializer,
   UserUpdateSerializer,
)

class UserViewSet(LoggingMixin, viewsets.ModelViewSet):
   queryset = User.objects.select_related("profile").all().order_by("id")
   log_model_name = "User"
   permission_classes = [IsAuthenticated, IsAdminProfile]
   def get_serializer_class(self):
       if self.action == "list":
           return UserListSerializer
       if self.action == "create":
           return UserCreateSerializer
       if self.action in ["update", "partial_update"]:
           return UserUpdateSerializer
       return UserDetailSerializer
   def destroy(self, request, *args, **kwargs):
       return Response(
           {"detail": "Hard delete is disabled. Use deactivate instead."},
           status=status.HTTP_405_METHOD_NOT_ALLOWED,
       )
   @action(detail=True, methods=["patch"])
   def deactivate(self, request, pk=None):
       user = self.get_object()
       user.is_active = False
       user.save(update_fields=["is_active"])
       user.profile.is_active = False
       user.profile.save(update_fields=["is_active"])
       self.log_deactivate_action(
           user,
           description=f"Deactivated User #{user.pk} and linked profile.",
       )
       return Response({"detail": "User deactivated successfully."})
