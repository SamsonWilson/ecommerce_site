"""
Grille de livraison : des zones (listes de pays) et des modes de livraison.

Le serveur calcule seul les frais, à partir du pays, du poids et du montant du
panier : le navigateur affiche ce qu'on lui propose, rien de plus.
"""
from decimal import Decimal

from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import TranslatableModel


class ShippingZone(TranslatableModel):
    """Pays desservis ensemble, aux mêmes tarifs."""

    TRANSLATABLE_FIELDS = ("name",)

    name = models.CharField(_("nom"), max_length=120)
    countries = models.JSONField(
        _("pays"), default=list,
        help_text=_('Codes ISO à deux lettres, par exemple ["FR", "BE", "US"].'),
    )

    class Meta:
        verbose_name = _("zone de livraison")
        verbose_name_plural = _("zones de livraison")

    def __str__(self):
        return f"{self.name} ({', '.join(self.countries)})"


class ShippingMethod(TranslatableModel):
    """
    Un mode de livraison et son tarif. Plusieurs modes par zone permettent de
    suivre la règle des colis légers : postal sous 1 kg, ligne dédiée de 1 à
    5 kg, express assuré au-delà d'une certaine valeur.
    """

    TRANSLATABLE_FIELDS = ("name", "delay")

    code = models.SlugField(_("code"), unique=True)
    name = models.CharField(_("nom"), max_length=120)
    delay = models.CharField(_("délai annoncé"), max_length=120, blank=True)
    zones = models.ManyToManyField(ShippingZone, related_name="methods", verbose_name=_("zones"))

    price = models.DecimalField(_("prix (€)"), max_digits=10, decimal_places=2, default=Decimal("0.00"))
    free_from = models.DecimalField(
        _("offert à partir de (€)"), max_digits=10, decimal_places=2, null=True, blank=True,
    )
    min_weight_grams = models.PositiveIntegerField(_("poids minimum (g)"), default=0)
    max_weight_grams = models.PositiveIntegerField(_("poids maximum (g)"), null=True, blank=True)
    max_order_value = models.DecimalField(
        _("valeur maximum du panier (€)"), max_digits=10, decimal_places=2, null=True, blank=True,
        help_text=_("Au-delà, le mode n'est pas proposé : par exemple un colis postal sans assurance."),
    )

    cash_on_delivery = models.BooleanField(_("paiement à la livraison ou au retrait"), default=False)
    is_pickup = models.BooleanField(_("retrait en boutique"), default=False)
    carrier = models.CharField(_("transporteur"), max_length=80, blank=True)
    is_active = models.BooleanField(_("actif"), default=True)
    position = models.PositiveIntegerField(_("ordre d'affichage"), default=0)

    class Meta:
        ordering = ("position", "id")
        verbose_name = _("mode de livraison")
        verbose_name_plural = _("modes de livraison")

    def __str__(self):
        return f"{self.name} ({self.code})"

    def serves(self, country):
        return any(country in zone.countries for zone in self.zones.all())

    def accepts(self, weight_grams, subtotal):
        if weight_grams < self.min_weight_grams:
            return False
        if self.max_weight_grams is not None and weight_grams > self.max_weight_grams:
            return False
        return self.max_order_value is None or subtotal <= self.max_order_value

    def cost_for(self, subtotal):
        if self.free_from is not None and subtotal >= self.free_from:
            return Decimal("0.00")
        return self.price
