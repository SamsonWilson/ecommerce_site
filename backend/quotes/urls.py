from django.urls import path

from .views import MyQuoteDetailView, QuoteListCreateView

urlpatterns = [
    path("", QuoteListCreateView.as_view(), name="quote-list-create"),
    path("<str:reference>/", MyQuoteDetailView.as_view(), name="quote-detail"),
]
