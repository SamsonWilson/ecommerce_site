from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from .admin_serializers import AdminCustomerSerializer
from .models import CustomerProfile


class AdminCustomerViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """
    Gestion des comptes clients côté back-office (is_staff uniquement).
    Permet de valider/refuser un compte pro et de lui affecter un palier tarifaire.
    """

    permission_classes = [IsAdminUser]
    serializer_class = AdminCustomerSerializer
    queryset = CustomerProfile.objects.select_related("user", "price_tier").order_by("-created_at")
    filterset_fields = ["status", "account_type"]
    search_fields = ["user__email", "company_name", "vat_number"]

    def _set_status(self, request, pk, new_status):
        profile = self.get_object()
        profile.status = new_status
        profile.save(update_fields=["status"])
        return Response(self.get_serializer(profile).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Valide le compte : les tarifs de gros s'appliqueront à la prochaine connexion."""
        return self._set_status(request, pk, CustomerProfile.Status.APPROVED)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        return self._set_status(request, pk, CustomerProfile.Status.REJECTED)

    @action(detail=True, methods=["post"], url_path="to-wholesale")
    def to_wholesale(self, request, pk=None):
        """
        Active le statut grossiste. C'est LE seul chemin vers le tarif de gros :
        aucun client ne peut se l'attribuer lui-même à l'inscription.
        Un palier tarifaire peut être fourni dans la foulée (`price_tier`).
        """
        profile = self.get_object()
        profile.account_type = CustomerProfile.AccountType.WHOLESALE
        profile.status = CustomerProfile.Status.APPROVED
        tier = request.data.get("price_tier")
        if tier:
            profile.price_tier_id = tier
        profile.save(update_fields=["account_type", "status", "price_tier"])
        return Response(self.get_serializer(profile).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="to-retail")
    def to_retail(self, request, pk=None):
        """Repasse le compte en détail : le palier tarifaire est retiré."""
        profile = self.get_object()
        profile.account_type = CustomerProfile.AccountType.RETAIL
        profile.status = CustomerProfile.Status.APPROVED
        profile.price_tier = None
        profile.save(update_fields=["account_type", "status", "price_tier"])
        return Response(self.get_serializer(profile).data, status=status.HTTP_200_OK)
