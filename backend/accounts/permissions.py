"""Permissions du back-office, basées sur le rôle porté par la fiche employé."""
from rest_framework.permissions import BasePermission

from .models import StaffProfile


def staff_sections(user):
    """Sections de /gestion autorisées pour cet utilisateur."""
    if not user or not user.is_authenticated or not user.is_staff:
        return []
    if user.is_superuser:
        return list(StaffProfile.ROLE_SECTIONS[StaffProfile.Role.ADMIN])
    profile = getattr(user, "staff_profile", None)
    if profile is None:
        # Compte is_staff historique, sans fiche employé : on le traite en ADMIN
        # plutôt que de le bloquer hors de son propre back-office.
        return list(StaffProfile.ROLE_SECTIONS[StaffProfile.Role.ADMIN])
    return profile.sections


class HasStaffSection(BasePermission):
    """
    Autorise un employé dont le rôle couvre `required_section`.
    À déclarer sur la vue : `required_section = "catalog"`.
    """

    message = "Votre rôle ne donne pas accès à cette section."

    def has_permission(self, request, view):
        section = getattr(view, "required_section", None)
        if section is None:
            return bool(request.user and request.user.is_staff)
        return section in staff_sections(request.user)


class IsStaffAdmin(BasePermission):
    """Réservé aux administrateurs : eux seuls gèrent les comptes employés."""

    message = "Seul un administrateur peut gérer les comptes employés."

    def has_permission(self, request, view):
        return "staff" in staff_sections(request.user)
