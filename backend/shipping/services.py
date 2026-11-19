import re

from .models import ShippingMethod

COUNTRY_CODE = re.compile(r"^[A-Z]{2}$")


def normalize_country(value):
    """Code pays ISO à deux lettres, ou None s'il n'en est pas un."""
    code = value.strip().upper() if isinstance(value, str) else ""
    return code if COUNTRY_CODE.match(code) else None


def _active_methods():
    return ShippingMethod.objects.filter(is_active=True).prefetch_related("zones")


def served_countries():
    """Pays vers lesquels au moins un mode actif livre."""
    return sorted({code for method in _active_methods() for zone in method.zones.all() for code in zone.countries})


def available_methods(country, subtotal, weight_grams):
    """Modes proposés pour ce pays, ce montant et ce poids, dans l'ordre d'affichage."""
    country = normalize_country(country)
    if not country:
        return []
    return [m for m in _active_methods() if m.serves(country) and m.accepts(weight_grams, subtotal)]


def find_method(code, country, subtotal, weight_grams):
    """Le mode choisi par le client, s'il est vraiment proposé pour cette commande."""
    return next((m for m in available_methods(country, subtotal, weight_grams) if m.code == code), None)
