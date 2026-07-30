from rest_framework import viewsets
from accounts.permissions import HasStaffSection

from .models import PriceTier
from .serializers import PriceTierSerializer


class PriceTierViewSet(viewsets.ModelViewSet):
    """Paliers tarifaires B2B — réservé à l'équipe (is_staff)."""

    permission_classes = [HasStaffSection]
    required_section = "b2b"
    serializer_class = PriceTierSerializer
    queryset = PriceTier.objects.all()
    pagination_class = None
