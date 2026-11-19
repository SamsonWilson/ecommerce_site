"""
Traductions relues du catalogue de démonstration.

Elles évitent de passer par un service automatique pour ces contenus. Un élément
n'est traduit ici que si tous ses textes français sont connus : s'il a été modifié
dans le back-office, le traducteur automatique prend le relais.
"""
from pricing.models import PriceTier

from .models import Category, Collection, ColorTheme, Product, WeddingMoment

NAMES = {
    # Paliers tarifaires
    "Revendeur": ("经销商", "Reseller"),
    "Distributeur": ("分销商", "Distributor"),
    "Grand compte": ("大客户", "Key account"),
    # Catégories
    "Épingles": ("发簪", "Hairpins"),
    "Épingles ET peignes": ("发簪与发梳", "Hairpins & combs"),
    "Éventails": ("团扇", "Fans"),
    "Bracelets": ("手镯", "Bracelets"),
    "Boucles d'oreilles": ("耳饰", "Earrings"),
    "Diadèmes ET tiares": ("冠饰与头冠", "Diadems & tiaras"),
    # Coloris
    "Ivoire": ("象牙白", "Ivory"),
    "Or": ("金色", "Gold"),
    "Rouge cinabre": ("朱砂红", "Cinnabar red"),
    "Jade": ("玉色", "Jade"),
    "Argent": ("银色", "Silver"),
    # Moments
    "Cérémonie": ("婚礼仪式", "Ceremony"),
    "Réception": ("婚宴", "Reception"),
    "Dîner": ("晚宴", "Dinner"),
    "Séance photo": ("婚纱摄影", "Photo shoot"),
    # Collection
    "Lotus d'Or": ("金莲", "Golden Lotus"),
    # Produits
    "Épingle Phénix Cinabre": ("朱砂凤凰发簪", "Cinnabar Phoenix Hairpin"),
    "Éventail Brodé Pivoine": ("牡丹刺绣团扇", "Embroidered Peony Fan"),
    "Peigne Laque Rouge": ("朱漆发梳", "Red Lacquer Comb"),
    "Bracelet Jade ET Or": ("金镶玉手镯", "Jade & Gold Bracelet"),
    "Pendants Perle de Jade": ("玉珠耳坠", "Jade Pearl Drop Earrings"),
    "Tiare Xiuhe Dorée": ("金色秀禾头冠", "Golden Xiuhe Tiara"),
    "Épingle Double Bonheur": ("囍字发簪", "Double Happiness Hairpin"),
    "Éventail Soie Rouge": ("红色真丝团扇", "Red Silk Fan"),
    "Diadème Perles Douces": ("柔光珍珠冠饰", "Soft Pearl Diadem"),
    "Boucles Larme de Cristal": ("水晶泪滴耳环", "Crystal Teardrop Earrings"),
}

TEXTS = {
    "Inspiré des symboles du mariage chinois.": (
        "灵感源自中国婚礼的吉祥寓意。", "Inspired by the symbols of Chinese weddings.",
    ),
    "Le lotus s'ouvre au-dessus de l'eau trouble sans en garder trace.": (
        "莲出淤泥而不染。", "The lotus opens above muddy water and keeps no trace of it.",
    ),
}

DESCRIPTION_SUFFIX = " — pièce façonnée à la main, collection Héritage."
LANGUAGES = ("zh", "en")


def _translate(text, index):
    if text in NAMES:
        return NAMES[text][index]
    if text in TEXTS:
        return TEXTS[text][index]
    if text.endswith(DESCRIPTION_SUFFIX):
        name = NAMES.get(text.removesuffix(DESCRIPTION_SUFFIX))
        if name:
            suffix = (" — 匠心手作，传承系列。", " — handcrafted piece, Heritage collection.")[index]
            return f"{name[index]}{suffix}"
    return None


def apply_seed_translations():
    """Pose les traductions relues sur ce qui n'en a pas encore. Renvoie le nombre d'éléments."""
    applied = 0
    for model in (Category, ColorTheme, WeddingMoment, Collection, Product, PriceTier):
        for obj in model.objects.all():
            changed = False
            for index, lang in enumerate(LANGUAGES):
                if obj.is_up_to_date(lang):
                    continue
                result = {field: _translate(text, index) for field, text in obj.source_texts().items()}
                if result and all(result.values()):
                    obj.set_translation(lang, result)
                    changed = True
            if changed:
                obj.save(update_fields=obj.TRANSLATION_STORAGE_FIELDS)
                applied += 1
    return applied
