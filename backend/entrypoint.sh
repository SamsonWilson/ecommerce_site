#!/bin/sh
# Prépare le conteneur backend puis lance la commande (gunicorn).
set -e

echo "→ Collecte des fichiers statiques..."
python manage.py collectstatic --noinput

exec "$@"
