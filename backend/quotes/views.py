from rest_framework import generics, viewsets
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated

from .models import QuoteRequest
from .serializers import AdminQuoteSerializer, QuoteCreateSerializer, QuoteSerializer


class QuoteListCreateView(generics.ListCreateAPIView):
    """
    POST : dépôt d'une demande de devis (ouvert — client connecté ou invité).
    GET  : suivi de SES propres devis (authentification requise).
    """

    def get_permissions(self):
        return [AllowAny()] if self.request.method == "POST" else [IsAuthenticated()]

    def get_serializer_class(self):
        return QuoteCreateSerializer if self.request.method == "POST" else QuoteSerializer

    def get_queryset(self):
        # Un client ne voit jamais que ses propres devis.
        return QuoteRequest.objects.filter(customer=self.request.user).prefetch_related("items")


class MyQuoteDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = QuoteSerializer
    lookup_field = "reference"

    def get_queryset(self):
        return QuoteRequest.objects.filter(customer=self.request.user).prefetch_related("items")


class AdminQuoteViewSet(viewsets.ModelViewSet):
    """Gestion des devis côté back-office (is_staff uniquement)."""

    permission_classes = [IsAdminUser]
    serializer_class = AdminQuoteSerializer
    queryset = QuoteRequest.objects.prefetch_related("items__variant__product").all()
    filterset_fields = ["status"]
    search_fields = ["reference", "company", "contact_email"]
    http_method_names = ["get", "patch", "head", "options"]  # pas de création/suppression ici
