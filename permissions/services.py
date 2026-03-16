from permissions.models import Permission
from users.models import Profile


def get_user_permission_codes(user):
    if not user or not user.is_authenticated:
        return set()

    profile = Profile.objects.filter(user=user).only("role").first()
    if not profile:
        return set()

    if profile.role == Profile.ROLE_ADMIN:
        return set(Permission.objects.values_list("code", flat=True))

    return set(
        Permission.objects.filter(
            permission_profiles__profile__user=user
        ).values_list("code", flat=True)
    )


def user_has_permission(user, permission_code):
    if not permission_code:
        return False
    if not user or not user.is_authenticated:
        return False

    profile = Profile.objects.filter(user=user).only("role").first()
    if profile and profile.role == Profile.ROLE_ADMIN:
        return True

    return permission_code in get_user_permission_codes(user)
