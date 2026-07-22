# --- Étape 1 : build de la SPA React (Vite) ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# L'ID client Google est injecté au build (Vite inline les variables VITE_*).
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_FACEBOOK_APP_ID=""
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_FACEBOOK_APP_ID=$VITE_FACEBOOK_APP_ID
RUN npm run build

# --- Étape 2 : nginx edge (sert la SPA + reverse proxy + load balancer) ---
FROM nginx:1.27-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
