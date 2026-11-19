"""
Devis B2B : l'équipe chiffre, le client accepte, une commande naît.

Le total est toujours recalculé par le serveur à partir des prix proposés
ligne par ligne et du port : personne ne saisit un total à la main.
"""
import secrets
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.translation import get_language

from catalog.models import ProductVariant
from orders.models import Order, OrderItem
from payments.providers import configured_providers
from payments.transfer import bank_details, new_deadline

from .models import QuoteRequest

DEFAULT_VALIDITY_DAYS = 30
ADDRESS_FIELDS = ("full_name", "company", "address", "postal_code", "city", "country", "phone")


class QuoteError(Exception):
    """Refus métier : `code` dit lequel, la vue choisit le message."""

    def __init__(self, code, **params):
        super().__init__(code)
        self.code, self.params = code, params


def payment_methods_for_quote():
    """Un devis accepté se règle par virement (si configuré) ou en ligne."""
    return [*(["transfer"] if bank_details() else []), *configured_providers()]


def is_expired(quote):
    return bool(quote.valid_until and quote.valid_until < timezone.localdate())


def send_quote(quote, prices, shipping_cost, valid_until=None):
    """Fixe les prix ligne par ligne et le port, calcule le total, envoie le devis."""
    from .emails import send_quote_email

    with transaction.atomic():
        quote = QuoteRequest.objects.select_for_update().get(pk=quote.pk)
        if quote.status not in (QuoteRequest.Status.NEW, QuoteRequest.Status.IN_REVIEW, QuoteRequest.Status.QUOTED):
            raise QuoteError("not_editable")
        items = list(quote.items.all())
        if not items:
            raise QuoteError("no_items")
        if set(prices) != {item.pk for item in items}:
            raise QuoteError("missing_prices")
        for item in items:
            item.proposed_unit_price = prices[item.pk]
            item.save(update_fields=["proposed_unit_price"])
        quote.shipping_cost = shipping_cost
        quote.quoted_total = sum((item.proposed_unit_price * item.quantity for item in items), Decimal("0.00")) + shipping_cost
        quote.valid_until = valid_until or timezone.localdate() + timedelta(days=DEFAULT_VALIDITY_DAYS)
        quote.status = QuoteRequest.Status.QUOTED
        quote.sent_at = timezone.now()
        if not quote.public_token:
            quote.public_token = secrets.token_urlsafe(32)
        quote.save()
        transaction.on_commit(lambda: send_quote_email(quote.pk))
    return quote


def accept_quote(quote, payment_method, address):
    """Transforme un devis chiffré en commande à régler. Renvoie la commande."""
    from orders.views import deduct_order_stock, new_order_reference
    from payments.emails import send_order_confirmation

    if payment_method not in payment_methods_for_quote():
        raise QuoteError("payment_method")
    with transaction.atomic():
        quote = QuoteRequest.objects.select_for_update().get(pk=quote.pk)
        if quote.status != QuoteRequest.Status.QUOTED or quote.order_id:
            raise QuoteError("not_quoted")
        if is_expired(quote):
            raise QuoteError("expired")
        items = list(quote.items.select_related("variant__product"))
        variants = ProductVariant.objects.select_for_update().in_bulk([item.variant_id for item in items])
        for item in items:
            variant = variants[item.variant_id]
            if variant.stock < item.quantity:
                raise QuoteError("stock", name=variant.product.translated("name"), stock=variant.stock)

        subtotal = sum((item.proposed_unit_price * item.quantity for item in items), Decimal("0.00"))
        shipping = quote.shipping_cost or Decimal("0.00")
        if subtotal + shipping != quote.quoted_total:
            raise QuoteError("not_quoted")
        order = Order.objects.create(
            reference=new_order_reference(),
            customer=quote.customer,
            email=quote.contact_email,
            order_type=Order.OrderType.WHOLESALE,
            status=Order.Status.PENDING,
            currency="EUR",
            subtotal=subtotal,
            shipping_cost=shipping,
            tax_amount=Decimal("0.00"),
            total_amount=quote.quoted_total,
            shipping_address={**address, "method": "quote", "quote": quote.reference, "payment_method": payment_method},
            payment_method=payment_method,
            public_token=secrets.token_urlsafe(32),
            language=get_language() or settings.LANGUAGE_CODE,
            payment_deadline=new_deadline() if payment_method == "transfer" else None,
        )
        for item in items:
            OrderItem.objects.create(
                order=order, variant=item.variant, product_name=item.variant.product.name,
                sku=item.variant.sku, unit_price=item.proposed_unit_price, quantity=item.quantity,
            )
        if payment_method == "transfer":
            deduct_order_stock(order)  # réservé jusqu'à l'échéance du virement
            transaction.on_commit(lambda: send_order_confirmation(order.pk))
        quote.status = QuoteRequest.Status.ACCEPTED
        quote.order = order
        quote.save(update_fields=["status", "order", "updated_at"])
    return order
