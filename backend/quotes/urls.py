from django.urls import path

from .views import AcceptQuoteView, MyQuoteDetailView, PublicQuoteView, QuoteListCreateView

urlpatterns = [
    path("", QuoteListCreateView.as_view(), name="quote-list-create"),
    # Avant <reference>/ : « view » et « accept » ne sont pas des références.
    path("view/", PublicQuoteView.as_view(), name="quote-public"),
    path("accept/", AcceptQuoteView.as_view(), name="quote-accept"),
    path("<str:reference>/", MyQuoteDetailView.as_view(), name="quote-detail"),
]
