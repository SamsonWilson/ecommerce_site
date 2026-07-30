from django.urls import path
from .views import (
    CheckoutView, OrderDetailView, OrderListView, StripeWebhookView,
    AdminOrderListView, AdminOrderDetailView, ConfirmDeliveryView
)

urlpatterns = [
    path("checkout/", CheckoutView.as_view(), name="checkout"),
    path("orders/", OrderListView.as_view(), name="order-list"),
    path("orders/<str:reference>/", OrderDetailView.as_view(), name="order-detail"),
    path("orders/<str:reference>/confirm-delivery/", ConfirmDeliveryView.as_view(), name="order-confirm-delivery"),
    path("admin/orders/", AdminOrderListView.as_view(), name="admin-order-list"),
    path("admin/orders/<int:pk>/", AdminOrderDetailView.as_view(), name="admin-order-detail"),
    path("webhooks/stripe/", StripeWebhookView.as_view(), name="stripe-webhook"),
]
