from rest_framework import viewsets, permissions
from .models import PlanDefinition
from .serializers import PlanDefinitionSerializer


class PlanDefinitionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PlanDefinition.objects.filter(is_active=True)
    serializer_class = PlanDefinitionSerializer
    permission_classes = [permissions.AllowAny]
