from django.db import connection
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    """
    Sonde de santé consommée par le load balancer nginx.
    Vérifie que le process répond ET que la base est joignable.
    Renvoie 200 si tout va bien, 503 sinon.
    """
    db_ok = True
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception:  # noqa: BLE001 — on ne veut jamais que la sonde plante
        db_ok = False

    status = 200 if db_ok else 503
    return Response(
        {"status": "ok" if db_ok else "degraded", "database": "up" if db_ok else "down"},
        status=status,
    )
