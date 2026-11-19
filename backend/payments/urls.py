from django.urls import path

from .views import (
    AdminRecordTransferView, AdminRefundView, AirwallexWebhookView, PaymentConfigView, PaymentStatusView,
    StartPaymentView,
)

urlpatterns = [
    path("payments/config/", PaymentConfigView.as_view(), name="payment-config"),
    path("payments/start/", StartPaymentView.as_view(), name="payment-start"),
    path("payments/status/", PaymentStatusView.as_view(), name="payment-status"),
    path("webhooks/airwallex/", AirwallexWebhookView.as_view(), name="airwallex-webhook"),
    path("admin/orders/<int:pk>/refund/", AdminRefundView.as_view(), name="admin-order-refund"),
    path("admin/orders/<int:pk>/record-transfer/", AdminRecordTransferView.as_view(), name="admin-order-record-transfer"),
]
