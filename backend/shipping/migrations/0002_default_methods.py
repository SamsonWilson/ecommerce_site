"""Reprend à l'identique les trois modes affichés jusqu'ici par le navigateur."""
import hashlib
import json
from decimal import Decimal

from django.db import migrations


# Traductions relues : (chinois, anglais). Même calcul d'empreinte que
# core.models.TranslatableModel.source_hash, recopié pour figer la migration.
REVIEWED = {
    "Europe et Canada": ("欧洲及加拿大", "Europe and Canada"),
    "France": ("法国", "France"),
    "Livraison Standard": ("标准配送", "Standard delivery"),
    "48h à 72h ouvrés": ("48至72个工作小时", "48 to 72 business hours"),
    "Livraison Express": ("快速配送", "Express delivery"),
    "24h chrono sécurisé": ("24小时安全送达", "Secure 24-hour delivery"),
    "Retrait Boutique": ("门店自取", "In-store pickup"),
    "Prêt sous 2h à l'Atelier": ("2小时内可在工作室取货", "Ready within 2 hours at the Atelier"),
}


def _translations(**fields):
    source = json.dumps(fields, sort_keys=True, ensure_ascii=False)
    digest = hashlib.sha256(source.encode()).hexdigest()[:16]
    return {
        lang: {**{field: REVIEWED[text][index] for field, text in fields.items()}, "_hash": digest}
        for index, lang in enumerate(("zh", "en"))
    }


def create_defaults(apps, schema_editor):
    Zone = apps.get_model("shipping", "ShippingZone")
    Method = apps.get_model("shipping", "ShippingMethod")
    if Method.objects.exists():
        return
    served = Zone.objects.create(
        name="Europe et Canada", countries=["FR", "BE", "CH", "CA"],
        translations=_translations(name="Europe et Canada"),
    )
    france = Zone.objects.create(name="France", countries=["FR"], translations=_translations(name="France"))
    for code, name, delay, price, free_from, pickup, position, zone in (
        ("standard", "Livraison Standard", "48h à 72h ouvrés", "6.90", "150.00", False, 0, served),
        ("express", "Livraison Express", "24h chrono sécurisé", "12.90", None, False, 1, served),
        ("pickup", "Retrait Boutique", "Prêt sous 2h à l'Atelier", "0.00", None, True, 2, france),
    ):
        method = Method.objects.create(
            code=code, name=name, delay=delay, price=Decimal(price),
            free_from=Decimal(free_from) if free_from else None,
            is_pickup=pickup, cash_on_delivery=True, position=position,
            translations=_translations(name=name, delay=delay),
        )
        method.zones.add(zone)


class Migration(migrations.Migration):
    dependencies = [("shipping", "0001_initial")]
    operations = [migrations.RunPython(create_defaults, migrations.RunPython.noop)]
