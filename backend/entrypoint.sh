#!/bin/sh
set -e

echo "=========================================================="
echo "🚀 Démarrage du conteneur e-commerce"
echo "=========================================================="

echo "⏳ [1/5] Attente de la base de données..."
python - << 'EOF'
import os, sys, time, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', os.environ.get('DJANGO_SETTINGS_MODULE', 'backend.settings.prod'))
django.setup()
from django.db import connection

max_retries = 30
for attempt in range(1, max_retries + 1):
    try:
        connection.ensure_connection()
        print("✅ Base de données connectée avec succès !")
        sys.exit(0)
    except Exception as exc:
        print(f"⏳ En attente de PostgreSQL (tentative {attempt}/{max_retries})...")
        time.sleep(2)
print("❌ ERREUR : Impossible de joindre PostgreSQL après 60 secondes.")
sys.exit(1)
EOF

# Avec une commande (docker-compose.yml), le conteneur ne fait que son rôle : un
# réplica ne doit ni migrer ni recharger le catalogue, sinon chaque réplica le
# referait au démarrage. C'est le service "migrate" qui migre, une seule fois.
if [ "$#" -gt 0 ]; then
    python manage.py collectstatic --noinput
    exec "$@"
fi

echo "📦 [2/5] Application automatique des migrations..."
python manage.py migrate --noinput

echo "🛍️ [3/5] Initialisation du catalogue de démonstration..."
python manage.py seed_catalog || true

echo "🌐 [4/5] Traduction de ce qui manque dans le catalogue..."
python manage.py translate_catalog || true

echo "🎨 [5/5] Collecte des fichiers statiques..."
python manage.py collectstatic --noinput

echo "=========================================================="
echo "⚡ Démarrage de Gunicorn (0.0.0.0:5000)..."
echo "=========================================================="
exec gunicorn backend.wsgi:application --bind 0.0.0.0:5000 --workers 3 --timeout 60
