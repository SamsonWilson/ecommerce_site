# ==============================================================================
# DOCKERFILE UNIFIÉ : Pure Python / Django + SPA React (SANS NGINX)
# ==============================================================================

# --- Étape 1 : Build du Frontend React ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm config set fetch-retries 10 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install --no-audit

COPY frontend/ ./
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_FACEBOOK_APP_ID=""
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_FACEBOOK_APP_ID=$VITE_FACEBOOK_APP_ID
RUN npm run build

# --- Étape 2 : Image Unifiée Pure Python (Django + Gunicorn + WhiteNoise) ---
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=backend.settings.prod

WORKDIR /app

# Installation des paquets système nécessaires
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copie & installation des dépendances Python
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copie du code source backend
COPY backend/ ./backend/

# Integration du frontend compilé directement dans Django
COPY --from=frontend-builder /app/frontend/dist/index.html /app/backend/templates/index.html
COPY --from=frontend-builder /app/frontend/dist /app/backend/staticfiles/

EXPOSE 5000

WORKDIR /app/backend

# Script d'exécution (Collectstatic + Migrate + Gunicorn direct sur port 5000)
RUN echo '#!/bin/sh\n\
python manage.py collectstatic --noinput\n\
python manage.py migrate --noinput\n\
exec gunicorn backend.wsgi:application --bind 0.0.0.0:5000 --workers 3 --timeout 60\n\
' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
