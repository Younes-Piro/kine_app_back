from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from app_settings.models import AppOption
from activity_log.mixins import LoggingMixin
from permissions.drf_permissions import HasPermission
from .models import Session
from .serializers import SessionSerializer

class SessionViewSet(LoggingMixin, viewsets.ModelViewSet):
   queryset = Session.objects.select_related(
       "treatment",
       "treatment__client",
       "status",
   ).all()
   serializer_class = SessionSerializer
   log_model_name = "Session"
   permission_classes = [IsAuthenticated, HasPermission]
   permission_map = {
       "list": "session:view",
       "retrieve": "session:view",
       "create": "session:create",
       "update": "session:update",
       "partial_update": "session:update",
       "destroy": "session:delete",
       "mark_completed": "session:update",
   }
   def get_queryset(self):
       queryset = super().get_queryset()
       client_id = self.request.query_params.get("client_id")
       treatment_id = self.request.query_params.get("treatment_id")
       if client_id:
           queryset = queryset.filter(treatment__client_id=client_id)
       if treatment_id:
           queryset = queryset.filter(treatment_id=treatment_id)
       return queryset
   def destroy(self, request, *args, **kwargs):
       return Response(
           {"detail": "Hard delete is disabled."},
           status=status.HTTP_405_METHOD_NOT_ALLOWED,
       )
   @action(detail=True, methods=["patch"])
   def mark_completed(self, request, pk=None):
       session = self.get_object()
       completed_status = AppOption.objects.filter(
           category=AppOption.CATEGORY_SESSION_STATUS,
           code="completed",
           is_active=True,
       ).first()
       if not completed_status:
           return Response(
               {"detail": "Completed status option not found."},
               status=status.HTTP_400_BAD_REQUEST,
           )
       session.status = completed_status
       session.save(update_fields=["status", "updated_at"])
       self.log_other_action(
           "Session",
           session.pk,
           description=f"Marked Session #{session.pk} as completed.",
       )
       return Response(SessionSerializer(session).data)
