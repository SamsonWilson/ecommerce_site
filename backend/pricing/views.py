from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser

from .models import PriceTier
from .serializers import PriceTierSerializer


class PriceTierViewSet(viewsets.ModelViewSet):
    """Paliers tarifaires B2B — réservé à l'équipe (is_staff)."""

    permission_classes = [IsAdminUser]
    serializer_class = PriceTierSerializer
    queryset = PriceTier.objects.all()
    pagination_class = None
