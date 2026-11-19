from django.core.management.base import BaseCommand, CommandError

from catalog.translation import BATCH_SIZE, pending_objects, translate_objects
from core.translator import TARGET_LANGUAGES, TranslationError


class Command(BaseCommand):
    help = (
        "Traduit le catalogue (produits, catégories, coloris, moments, collections). "
        "Seuls les contenus nouveaux ou modifiés sont envoyés : relancer ne coûte rien de plus."
    )

    def add_arguments(self, parser):
        parser.add_argument("--lang", choices=sorted(TARGET_LANGUAGES), help="Une seule langue")

    def handle(self, *args, **options):
        languages = [options["lang"]] if options["lang"] else list(TARGET_LANGUAGES)
        for lang in languages:
            total = 0
            while True:
                batch = pending_objects(lang)[:BATCH_SIZE]
                if not batch:
                    break
                try:
                    done = translate_objects(batch, lang)
                except TranslationError as exc:
                    raise CommandError(f"{exc} ({total} traduits en {lang} avant l'arrêt)") from exc
                if not done:
                    raise CommandError(f"Aucun résultat exploitable pour {lang}, relancez la commande.")
                total += done
                self.stdout.write(f"{lang} : {total} traduits, {len(pending_objects(lang))} restants")
            self.stdout.write(self.style.SUCCESS(f"{lang} : terminé ({total} traduits)."))
