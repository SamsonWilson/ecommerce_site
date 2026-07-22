"""
Résolution de prix — unique autorité en matière de prix (ARCHITECTURE.md §6).

Règle de sécurité non négociable : un client au détail (ou anonyme) ne doit
JAMAIS obtenir un `wholesale_price`, quelle que soit la requête. Les sérialiseurs
publics n'exposent que le prix calculé ici.
"""
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP


@dataclass(frozen=True)
class ResolvedPrice:
    unit_price: Decimal
    currency: str
    original_price: Decimal | None  # prix barré si remise
    is_wholesale: bool
    moq: int
    max_qty: int | None


def _q(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def resolve_price(variant, user=None, currency="EUR") -> ResolvedPrice:
    retail = variant.retail_price
    unit_price = retail
    original = None
    is_wholesale = False

    profile = None
    if user is not None and getattr(user, "is_authenticated", False):
        profile = getattr(user, "profile", None)

    # Tarif de gros uniquement pour un compte pro VALIDÉ.
    from accounts.models import CustomerProfile  # import local (évite le cycle)

    if (
        profile
        and profile.account_type == CustomerProfile.AccountType.WHOLESALE
        and profile.status == CustomerProfile.Status.APPROVED
    ):
        base = variant.wholesale_price
        tier = profile.price_tier
        if tier and tier.discount_percent:
            base = _q(base * (Decimal(100) - tier.discount_percent) / Decimal(100))
        unit_price = base
        is_wholesale = True
        original = retail if retail > unit_price else None

    return ResolvedPrice(
        unit_price=_q(unit_price),
        currency=currency,
        original_price=_q(original) if original is not None else None,
        is_wholesale=is_wholesale,
        moq=variant.moq,
        max_qty=variant.max_order_qty,
    )
