from django.urls import path
from .views import CheckoutView, OrderDetailView, OrderListView, StripeWebhookView

urlpatterns = [
    path("checkout/", CheckoutView.as_view(), name="checkout"),
    path("orders/", OrderListView.as_view(), name="order-list"),
    path("orders/<str:reference>/", OrderDetailView.as_view(), name="order-detail"),
    path("webhooks/stripe/", StripeWebhookView.as_view(), name="stripe-webhook"),
]
