from rest_framework.permissions import BasePermission

from users.models import Profile

from .services import user_has_permission


class IsAdminProfile(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "profile")
            and request.user.profile.role == Profile.ROLE_ADMIN
        )


class HasPermission(BasePermission):
    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        permission_map = getattr(view, "permission_map", None) or {}
        action = getattr(view, "action", None)
        required_permission_code = permission_map.get(action)

        # Deny by default if action is not mapped.
        if not required_permission_code:
            return False

        return user_has_permission(request.user, required_permission_code)
