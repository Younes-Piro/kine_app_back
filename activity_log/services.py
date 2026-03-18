from .models import ActivityLog


def log_activity(user, action, model_name, object_id=None, description=""):
    if not user or not getattr(user, "is_authenticated", False):
        return None

    return ActivityLog.objects.create(
        user=user,
        username=user.username,
        action=action,
        model_name=model_name,
        object_id=object_id,
        description=description,
    )
