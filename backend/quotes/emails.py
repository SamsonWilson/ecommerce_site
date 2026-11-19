"""E-mail d'envoi d'un devis chiffré, avec le lien pour l'accepter."""
import logging
from urllib.parse import urlencode

from django.conf import settings
from django.core.mail import send_mail
from django.utils import formats, translation
from django.utils.translation import gettext as _

logger = logging.getLogger(__name__)


def quote_link(quote):
    query = urlencode({"token": quote.public_token})
    return f"{settings.FRONTEND_URL.rstrip('/')}/devis/{quote.reference}?{query}"


def send_quote_email(quote_id):
    """N'échoue jamais : le devis reste consultable même si l'e-mail ne part pas."""
    from .models import QuoteRequest

    try:
        quote = QuoteRequest.objects.prefetch_related("items__variant__product").get(pk=quote_id)
        with translation.override(quote.language or settings.LANGUAGE_CODE):
            money = lambda value: f"{formats.number_format(value, 2, use_l10n=True)} €"  # noqa: E731
            lines = [_("Bonjour,"), "", _("Voici notre devis %(reference)s :") % {"reference": quote.reference}, ""]
            for item in quote.items.all():
                lines.append(
                    f"- {item.variant.product.translated('name')} × {item.quantity} : "
                    f"{money(item.proposed_unit_price)} → {money(item.proposed_unit_price * item.quantity)}"
                )
            lines += [
                "",
                _("Livraison : %(amount)s") % {"amount": money(quote.shipping_cost or 0)},
                _("Total : %(amount)s") % {"amount": money(quote.quoted_total)},
                _("Valable jusqu'au %(date)s.") % {"date": formats.date_format(quote.valid_until, "DATE_FORMAT")},
                "",
                _("Pour l'accepter et le régler :"),
                quote_link(quote),
                "",
                "Maison Lián",
            ]
            send_mail(_("Votre devis %(reference)s") % {"reference": quote.reference},
                      "\n".join(lines), None, [quote.contact_email])
    except Exception:
        logger.exception("Devis %s non envoyé par e-mail", quote_id)
