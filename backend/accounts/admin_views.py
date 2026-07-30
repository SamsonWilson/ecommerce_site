from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.crypto import get_random_string
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from .admin_serializers import (
    AdminCustomerSerializer,
    AdminStaffCreateSerializer,
    AdminStaffSerializer,
)
from .models import CustomerProfile, StaffProfile
from .permissions import HasStaffSection, IsStaffAdmin


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

    permission_classes = [HasStaffSection]
    required_section = "customers"
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


def _revoke_tokens(user):
    """Blackliste les refresh tokens : l'employé est déconnecté partout."""
    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)


class AdminStaffViewSet(viewsets.ModelViewSet):
    """
    Gestion des comptes employés — réservée au rôle ADMIN.

    L'administrateur crée le compte, choisit son rôle (dont « Livreur ») et peut
    le désactiver. La suppression du compte est remplacée par une désactivation :
    on ne veut pas perdre l'historique attaché à l'employé (commandes livrées,
    devis traités).
    """

    permission_classes = [IsStaffAdmin]
    queryset = StaffProfile.objects.select_related("user", "created_by")
    filterset_fields = ["role"]
    search_fields = ["user__email", "user__first_name", "user__last_name", "job_title"]

    def get_serializer_class(self):
        return AdminStaffCreateSerializer if self.action == "create" else AdminStaffSerializer

    def perform_destroy(self, instance):
        """Désactivation plutôt que suppression : le compte ne peut plus se connecter."""
        instance.user.is_active = False
        instance.user.save(update_fields=["is_active"])
        _revoke_tokens(instance.user)

    def _guard_self(self, profile, message):
        """Empêche un administrateur de se retirer ses propres droits."""
        if profile.user_id == self.request.user.id:
            raise ValidationError({"detail": message})

    def update(self, request, *args, **kwargs):
        profile = self.get_object()
        if "role" in request.data and request.data["role"] != profile.role:
            self._guard_self(profile, "Vous ne pouvez pas modifier votre propre rôle.")
        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="set-role")
    def set_role(self, request, pk=None):
        """Attribue un rôle à l'employé."""
        profile = self.get_object()
        role = request.data.get("role")
        if role not in StaffProfile.Role.values:
            return Response({"role": "Rôle inconnu."}, status=status.HTTP_400_BAD_REQUEST)
        self._guard_self(profile, "Vous ne pouvez pas modifier votre propre rôle.")
        profile.role = role
        profile.save(update_fields=["role"])
        return Response(AdminStaffSerializer(profile, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        profile = self.get_object()
        self._guard_self(profile, "Vous ne pouvez pas désactiver votre propre compte.")
        profile.user.is_active = False
        profile.user.save(update_fields=["is_active"])
        _revoke_tokens(profile.user)
        return Response(AdminStaffSerializer(profile, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        profile = self.get_object()
        profile.user.is_active = True
        profile.user.save(update_fields=["is_active"])
        return Response(AdminStaffSerializer(profile, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        """
        Réinitialise le mot de passe de l'employé et renvoie le nouveau,
        à transmettre de vive voix. Il n'est plus consultable ensuite.
        """
        profile = self.get_object()
        raw = request.data.get("password") or get_random_string(12)
        try:
            validate_password(raw, user=profile.user)
        except DjangoValidationError as exc:
            return Response({"password": list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
        profile.user.set_password(raw)
        profile.user.save(update_fields=["password"])
        # Un JWT reste valide après un changement de mot de passe : on révoque
        # les refresh tokens de l'employé pour le déconnecter réellement.
        _revoke_tokens(profile.user)
        return Response({"password": raw}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def roles(self, request):
        """Catalogue des rôles disponibles, pour alimenter le formulaire."""
        return Response([
            {
                "value": value,
                "label": label,
                "sections": list(StaffProfile.ROLE_SECTIONS.get(value, ())),
            }
            for value, label in StaffProfile.Role.choices
        ])
