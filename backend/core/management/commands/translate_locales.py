import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.translator import TARGET_LANGUAGES, TranslationError, translate_texts

BATCH_SIZE = 80


def flatten(tree, prefix=""):
    flat = {}
    for key, value in tree.items():
        if isinstance(value, dict):
            flat.update(flatten(value, f"{prefix}{key}."))
        else:
            flat[f"{prefix}{key}"] = value
    return flat


def set_nested(tree, dotted_key, value):
    *parents, leaf = dotted_key.split(".")
    for parent in parents:
        tree = tree.setdefault(parent, {})
    tree[leaf] = value


class Command(BaseCommand):
    help = (
        "Complète en.json et zh.json à partir de fr.json. Seules les clés absentes sont "
        "traduites. À lancer en développement, puis à relire avant de commiter."
    )

    def handle(self, *args, **options):
        locales = Path(settings.BASE_DIR).parent / "frontend" / "src" / "i18n" / "locales"
        if not locales.is_dir():
            raise CommandError(f"Dossier introuvable : {locales}")
        source = flatten(json.loads((locales / "fr.json").read_text(encoding="utf-8")))

        for lang in TARGET_LANGUAGES:
            path = locales / f"{lang}.json"
            tree = json.loads(path.read_text(encoding="utf-8"))
            existing = flatten(tree)
            missing = {key: text for key, text in source.items() if key not in existing}
            keys = list(missing)
            total = 0
            for start in range(0, len(keys), BATCH_SIZE):
                batch = {key: missing[key] for key in keys[start:start + BATCH_SIZE]}
                try:
                    translated = translate_texts(batch, lang)
                except TranslationError as exc:
                    raise CommandError(f"{exc} ({total} clés déjà écrites dans {lang}.json)") from exc
                for key, text in translated.items():
                    set_nested(tree, key, text)
                # Écrit lot par lot : une coupure ne perd pas ce qui est déjà payé.
                path.write_text(json.dumps(tree, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                total += len(translated)
                self.stdout.write(f"{lang} : {total}/{len(keys)} clés")
            self.stdout.write(self.style.SUCCESS(f"{lang}.json : {total} clés ajoutées."))
