from django.db.models import Q
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated

from permissions.drf_permissions import IsAdminProfile

from .models import ActivityLog
from .serializers import ActivityLogSerializer


class ActivityLogListAPIView(ListAPIView):
    queryset = ActivityLog.objects.select_related("user").all()
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated, IsAdminProfile]

    def get_queryset(self):
        queryset = super().get_queryset()

        user_id = self.request.query_params.get("user")
        action = self.request.query_params.get("action")
        model_name = self.request.query_params.get("model_name")
        search = self.request.query_params.get("search")

        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if action:
            queryset = queryset.filter(action=action)
        if model_name:
            queryset = queryset.filter(model_name__iexact=model_name)
        if search:
            queryset = queryset.filter(
                Q(description__icontains=search)
                | Q(username__icontains=search)
                | Q(model_name__icontains=search)
            )

        return queryset
