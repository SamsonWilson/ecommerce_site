"""Traduction du catalogue : ce qui manque, ce qui est périmé, et comment le rattraper."""
from core.translator import TARGET_LANGUAGES, translate_texts, translation_engine
from pricing.models import PriceTier
from shipping.models import ShippingMethod, ShippingZone

from .models import Category, Collection, ColorTheme, Product, WeddingMoment

TRANSLATABLE_MODELS = (
    Category, ColorTheme, WeddingMoment, Collection, Product, PriceTier, ShippingZone, ShippingMethod,
)

# Un lot = un appel à l'API, à terminer avant le délai de Gunicorn.
BATCH_SIZE = 5


def pending_objects(lang):
    """Objets sans traduction à jour dans `lang`."""
    return [
        obj
        for model in TRANSLATABLE_MODELS
        for obj in model.objects.all()
        if obj.needs_translation(lang)
    ]


def translate_objects(objects, lang):
    """Traduit des objets en un seul appel et renvoie le nombre d'objets terminés."""
    texts = {
        f"{index}.{field}": text
        for index, obj in enumerate(objects)
        for field, text in obj.source_texts().items()
    }
    translated = translate_texts(texts, lang)

    done = 0
    for index, obj in enumerate(objects):
        fields = obj.source_texts()
        result = {field: translated.get(f"{index}.{field}") for field in fields}
        # Un objet incomplet reste à traduire : on ne mélange pas deux langues.
        if all(result.values()):
            obj.set_translation(lang, result, translation_engine())
            obj.save(update_fields=obj.TRANSLATION_STORAGE_FIELDS)
            done += 1
    return done


def translate_next_batch():
    """Traduit le prochain lot en attente et renvoie le nombre d'objets terminés."""
    for lang in TARGET_LANGUAGES:
        batch = pending_objects(lang)[:BATCH_SIZE]
        if batch:
            return translate_objects(batch, lang)
    return 0


def translation_status():
    """Avancement réel du catalogue, par type de contenu et par langue."""
    scopes = []
    for model in TRANSLATABLE_MODELS:
        objects = [obj for obj in model.objects.all() if obj.source_texts()]
        scopes.append({
            "model": model._meta.model_name,
            "total": len(objects),
            "translated": {
                lang: sum(not obj.needs_translation(lang) for obj in objects)
                for lang in TARGET_LANGUAGES
            },
        })
    return {
        "engine": translation_engine(),
        "scopes": scopes,
        "remaining": sum(
            scope["total"] - scope["translated"][lang]
            for scope in scopes for lang in TARGET_LANGUAGES
        ),
    }
