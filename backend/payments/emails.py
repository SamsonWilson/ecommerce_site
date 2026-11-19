"""E-mail de confirmation, dans la langue du client au moment de la commande."""
import logging
from decimal import Decimal

from django.conf import settings
from django.core.mail import send_mail
from django.utils import formats, timezone, translation
from django.utils.translation import gettext as _

logger = logging.getLogger(__name__)


def _money(value, currency):
    symbol = "€" if currency == "EUR" else currency
    return f"{formats.number_format(value, 2, use_l10n=True)} {symbol}"


def send_order_confirmation(order_id):
    """N'échoue jamais : une panne d'e-mail ne doit pas défaire une commande."""
    from orders.models import Order

    from .transfer import instructions

    try:
        order = Order.objects.prefetch_related("items__variant__product").get(pk=order_id)
        with translation.override(order.language or settings.LANGUAGE_CODE):
            money = lambda value: _money(value, order.currency)  # noqa: E731
            lines = [
                _("Bonjour,"),
                "",
                _("Merci pour votre commande %(reference)s.") % {"reference": order.reference},
                "",
            ]
            for item in order.items.all():
                name = item.variant.product.translated("name") if item.variant_id else item.product_name
                lines.append(f"- {name} × {item.quantity} : {money(item.unit_price * item.quantity)}")
            lines += [
                "",
                _("Sous-total : %(amount)s") % {"amount": money(order.subtotal)},
                _("Livraison : %(amount)s") % {"amount": money(order.shipping_cost)},
                _("Total : %(amount)s") % {"amount": money(order.total_amount)},
                "",
            ]
            transfer = instructions(order)
            if order.status == Order.Status.PAID:
                lines.append(_("Votre paiement a bien été reçu."))
            elif transfer:
                deadline = formats.date_format(timezone.localtime(transfer["deadline"]), "DATE_FORMAT")
                lines += [
                    _("Merci de virer %(amount)s avant le %(date)s, en indiquant la référence %(reference)s :") % {
                        "amount": money(Decimal(transfer["amount_due"])), "date": deadline, "reference": order.reference,
                    },
                    "",
                    _("Titulaire : %(value)s") % {"value": transfer["holder"]},
                    _("Banque : %(value)s") % {"value": transfer["bank"]},
                    _("IBAN / n° de compte : %(value)s") % {"value": transfer["account"]},
                    _("BIC / SWIFT : %(value)s") % {"value": transfer["bic"]},
                ]
                if transfer["bank_address"]:
                    lines.append(_("Adresse de la banque : %(value)s") % {"value": transfer["bank_address"]})
                lines += ["", _("Les articles vous sont réservés jusqu'à cette date.")]
            else:
                lines.append(_("Vous réglerez %(amount)s à la livraison ou au retrait.") % {"amount": money(order.total_amount)})
            lines += ["", _("Conservez cette référence pour tout échange avec nous."), "", "Maison Lián"]
            subject = _("Votre commande %(reference)s") % {"reference": order.reference}
            send_mail(subject, "\n".join(lines), None, [order.email])
    except Exception:
        logger.exception("E-mail de confirmation non envoyé pour la commande %s", order_id)
