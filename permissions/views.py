from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from users.models import Profile
from .models import Permission, ProfilePermission
from .serializers import PermissionSerializer, AssignPermissionsSerializer

class IsAdminProfile(BasePermission):
   def has_permission(self, request, view):
       return (
           request.user
           and request.user.is_authenticated
           and hasattr(request.user, "profile")
           and request.user.profile.role == "admin"
       )

@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminProfile])
def permissions_catalog_view(request):
   permissions = Permission.objects.all().order_by("id")
   serializer = PermissionSerializer(permissions, many=True)
   return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_permissions_view(request):
   profile = request.user.profile
   if profile.role == "admin":
       all_codes = list(Permission.objects.values_list("code", flat=True))
       return Response({
           "role": "admin",
           "permissions": all_codes
       })
   codes = list(
       Permission.objects.filter(permission_profiles__profile=profile)
       .values_list("code", flat=True)
   )
   return Response({
       "role": "staff",
       "permissions": codes
   })

@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated, IsAdminProfile])
def user_permissions_view(request, user_id):
   try:
       user = User.objects.select_related("profile").get(id=user_id)
   except User.DoesNotExist:
       return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
   profile = user.profile
   if request.method == "GET":
       if profile.role == "admin":
           return Response({
               "user_id": user.id,
               "role": "admin",
               "permissions": "all"
           })
       permissions = Permission.objects.filter(permission_profiles__profile=profile).order_by("id")
       serializer = PermissionSerializer(permissions, many=True)
       return Response({
           "user_id": user.id,
           "role": "staff",
           "permissions": serializer.data
       })
   if request.method == "PATCH":
       if profile.role == "admin":
           return Response(
               {"detail": "Admin users do not need assigned permissions."},
               status=status.HTTP_400_BAD_REQUEST
           )
       serializer = AssignPermissionsSerializer(data=request.data)
       serializer.is_valid(raise_exception=True)
       permission_ids = serializer.validated_data["permission_ids"]
       ProfilePermission.objects.filter(profile=profile).delete()
       profile_permissions = [
           ProfilePermission(profile=profile, permission_id=pid)
           for pid in permission_ids
       ]
       ProfilePermission.objects.bulk_create(profile_permissions)
       updated_permissions = Permission.objects.filter(
           permission_profiles__profile=profile
       ).order_by("id")
       return Response({
           "detail": "Permissions assigned successfully.",
           "user_id": user.id,
           "permissions": PermissionSerializer(updated_permissions, many=True).data
       })
   if request.method == "DELETE":
       if profile.role == "admin":
           return Response(
               {"detail": "Admin users do not have assigned permissions to clear."},
               status=status.HTTP_400_BAD_REQUEST
           )
       ProfilePermission.objects.filter(profile=profile).delete()
       return Response({"detail": "Permissions cleared successfully."})