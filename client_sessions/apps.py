from django.apps import AppConfig


class ClientSessionsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = 'client_sessions'

    def ready(self):
        import client_sessions.signals
