from .models import ActivityLog
from .services import log_activity


class LoggingMixin:
    log_model_name = ""

    def _resolve_log_model_name(self, instance=None):
        if self.log_model_name:
            return self.log_model_name
        if instance is not None:
            return instance.__class__.__name__
        return self.__class__.__name__.replace("ViewSet", "")

    def log_create_action(self, instance, description=None):
        model_name = self._resolve_log_model_name(instance)
        log_activity(
            self.request.user,
            ActivityLog.ACTION_CREATE,
            model_name,
            instance.pk,
            description or f"Created {model_name} #{instance.pk}: {instance}",
        )

    def log_update_action(self, instance, description=None):
        model_name = self._resolve_log_model_name(instance)
        log_activity(
            self.request.user,
            ActivityLog.ACTION_UPDATE,
            model_name,
            instance.pk,
            description or f"Updated {model_name} #{instance.pk}: {instance}",
        )

    def log_deactivate_action(self, instance, description=None):
        model_name = self._resolve_log_model_name(instance)
        log_activity(
            self.request.user,
            ActivityLog.ACTION_DEACTIVATE,
            model_name,
            instance.pk,
            description or f"Deactivated {model_name} #{instance.pk}: {instance}",
        )

    def log_other_action(self, model_name, object_id=None, description=""):
        log_activity(
            self.request.user,
            ActivityLog.ACTION_OTHER,
            model_name,
            object_id,
            description,
        )

    def perform_create(self, serializer):
        instance = serializer.save()
        self.log_create_action(instance)

    def perform_update(self, serializer):
        instance = serializer.save()
        self.log_update_action(instance)
