import hashlib
import json

from django.db import models

from core.translator import SOURCE_LANGUAGE, current_language, translation_engine


class TranslatableModel(models.Model):
    """
    Contenu saisi en français, traduit dans `translations` :
    {"zh": {"name": "…", "_hash": "…"}, "en": {…}}.

    `_hash` retient le texte français traduit. S'il a changé depuis, la
    traduction est périmée : on affiche le français plutôt qu'un texte faux.
    Une correction manuelle dans /admin/ reste en place tant que le français ne bouge pas.

    `_engine: free` signale une traduction du service gratuit, à refaire avec
    Claude dès qu'une clé est renseignée.
    """

    TRANSLATABLE_FIELDS = ()
    TRANSLATION_STORAGE_FIELDS = ("translations",)

    translations = models.JSONField(default=dict, blank=True)

    class Meta:
        abstract = True

    def source_texts(self):
        return {f: getattr(self, f) for f in self.TRANSLATABLE_FIELDS if getattr(self, f)}

    def source_hash(self):
        source = json.dumps(self.source_texts(), sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(source.encode()).hexdigest()[:16]

    def is_up_to_date(self, lang):
        return self.translations.get(lang, {}).get("_hash") == self.source_hash()

    def needs_translation(self, lang):
        if not self.source_texts():
            return False
        if not self.is_up_to_date(lang):
            return True
        return self.translations[lang].get("_engine") == "free" and translation_engine() == "claude"

    def set_translation(self, lang, texts, engine=None):
        self.translations[lang] = {**texts, "_hash": self.source_hash()}
        if engine == "free":
            self.translations[lang]["_engine"] = engine

    def translated(self, field, lang=None):
        """Valeur de `field` dans la langue de la requête, en français à défaut."""
        lang = lang or current_language()
        if lang == SOURCE_LANGUAGE or not self.is_up_to_date(lang):
            return getattr(self, field)
        return self.translations[lang].get(field) or getattr(self, field)
