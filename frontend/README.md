# Site e-commerce – accès local

## Identifiants de connexion admin

Le compte d’administration local est le suivant :

- E-mail : admin@maisonlian.com
- Mot de passe : Admin123456!
- URL : http://localhost:3000/gestion/connexion

> Ces identifiants sont pour l’environnement local de développement. À changer avant mise en production.

## Démarrage rapide

### 1) Backend Django

```bash
cd /home/star/Desktop/site_ecommerce_giovane
source venv/bin/activate
cd backend
python manage.py migrate
python manage.py init_admin
python manage.py runserver 0.0.0.0:8000
```

### 2) Frontend

```bash
cd /home/star/Desktop/site_ecommerce_giovane/frontend
npm install
npm run dev -- --host 0.0.0.0 --port 3000
```

Ensuite ouvrir :

- Frontend : http://localhost:3000
- Admin : http://localhost:3000/gestion/connexion

## Comptes de test utiles

- Admin : admin@maisonlian.com / Admin123456!
- Client pro en attente (déjà présent en base) : pro@ivoire.be

## Notes de projet

Le projet est une boutique e-commerce B2C/B2B avec :

- Django REST API
- React + Vite frontend
- PostgreSQL en cible de production
- espace client, panier, checkout, gestion admin, comptes pro

## Verification rapide

Le compte admin a bien été vérifié en base via Django :

```bash
python manage.py shell -c "from accounts.models import User; u=User.objects.filter(is_superuser=True).first(); print(u.email); print(u.check_password('Admin123456!'))"
```

La sortie attendue doit afficher :

```text
admin@maisonlian.com
True
```
