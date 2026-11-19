# Site e-commerce – accès local

## Compte administrateur

Aucun compte n’est fourni par défaut. Créez le vôtre une seule fois, le mot de passe vous est demandé :

```bash
cd backend
python manage.py init_admin --email votre@adresse.fr
```

Sans terminal (serveur, CI), passez par les variables `ADMIN_EMAIL` et `ADMIN_PASSWORD`.

La commande ne modifie jamais un compte existant. Pour changer un mot de passe :

```bash
python manage.py changepassword votre@adresse.fr
```

## Démarrage rapide

### 1) Backend Django

```bash
cd /home/star/Desktop/site_ecommerce_giovane
source venv/bin/activate
cd backend
python manage.py migrate
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

- Client pro en attente (déjà présent en base) : pro@ivoire.be

## Traductions (français, anglais, chinois)

Le français est la langue source. Le site se traduit à trois niveaux :

- **Interface** : fichiers `src/i18n/locales/{fr,en,zh}.json`, livrés avec le site. Aucune clé API n'est nécessaire.
- **Enregistrements** (produits, catégories, coloris, moments, collections, paliers) : traduits à l'enregistrement et stockés en base.
- **Messages du serveur et e-mails** : `backend/locale/*/LC_MESSAGES/django.po`. Après modification, lancez `python manage.py compilemessages` et commitez le `.mo`.

Rien à configurer : ce qui est enregistré en français est traduit automatiquement par le service gratuit MyMemory (environ 5 000 caractères par jour). La page **Langues** du back-office affiche l'avancement réel et relance ce qui manque.

Pour une qualité supérieure, créez une clé sur https://console.anthropic.com et ajoutez-la dans `.env`. Ce que le service gratuit a traduit est alors refait par Claude :

```bash
ANTHROPIC_API_KEY=votre-cle
```

```bash
cd backend
python manage.py translate_catalog
```

Si le français d'un produit change, sa traduction est refaite, et le français s'affiche en attendant. Pour corriger une traduction à la main, modifiez le champ `translations` dans `/admin/` : la correction reste en place tant que le français ne change pas.

Pour un nouveau texte d'interface, ajoutez-le dans `fr.json`, puis complétez les autres langues :

```bash
python manage.py translate_locales    # en développement, puis relisez le résultat
```

## Livraison

Les frais de port sont calculés par le serveur, d'après le pays, le poids des articles (`weight_grams`) et le montant du panier. Le navigateur affiche seulement ce que le serveur propose.

La grille se gère dans `/admin/` → **Livraison** :

- une **zone** regroupe des pays (codes ISO, par exemple `["US", "GB"]`) ;
- un **mode** a un prix, un seuil de gratuité éventuel, des limites de poids et de valeur, et un transporteur.

Un nouveau pays apparaît dans le checkout dès qu'un mode actif le dessert. Son nom et son délai sont traduits comme les produits.

## Paiement en ligne (Airwallex)

Sans configuration, seul le paiement à la livraison ou au retrait est proposé. Pour activer la carte, Apple Pay, Google Pay, Alipay et WeChat Pay, ajoutez dans `.env` :

```bash
AIRWALLEX_CLIENT_ID=...
AIRWALLEX_API_KEY=...
AIRWALLEX_WEBHOOK_SECRET=...
AIRWALLEX_ENV=sandbox      # prod pour encaisser réellement
```

Dans le tableau de bord Airwallex, déclarez le webhook `https://<votre-domaine>/api/v1/webhooks/airwallex/` avec les événements `payment_intent.succeeded`, `payment_intent.cancelled`, `refund.accepted`, `refund.settled` et `refund.failed`.

Le client est redirigé vers la page de paiement d'Airwallex : aucune donnée bancaire ne passe par le site. Une commande ne devient « payée » que lorsque le webhook signé d'Airwallex le confirme, avec le bon montant. Les remboursements se font depuis la fiche commande du back-office, par un administrateur ou un responsable.

## Virement bancaire et devis (B2B)

**Virement (T/T).** Proposé aux grossistes validés et pour les devis acceptés, dès que ces valeurs sont dans `.env` :

```bash
BANK_TRANSFER_HOLDER="Nom du titulaire"
BANK_TRANSFER_BANK="Nom de la banque"
BANK_TRANSFER_ACCOUNT="IBAN ou numéro de compte"
BANK_TRANSFER_BIC="code SWIFT"
BANK_TRANSFER_DAYS=7
```

Le client reçoit les coordonnées et la référence à indiquer. Les articles lui sont réservés `BANK_TRANSFER_DAYS` jours. À réception, un administrateur ou un responsable clique sur **Virement reçu…** dans la fiche commande. Pour libérer chaque jour les réservations échues :

```bash
python manage.py expire_transfers            # --dry-run pour voir sans annuler
```

**Devis.** Le client clique sur **Demander un devis pour ce panier**. L'équipe B2B chiffre chaque ligne dans **Devis** du back-office et l'envoie. Le client reçoit un lien pour l'accepter, puis payer par virement ou en ligne. Les demandes d'ouverture de compte pro arrivent aussi dans **Devis**.

## Load balancing

`docker-compose.yml` lance nginx devant plusieurs réplicas du backend. Il faut un `.env` complet, avec `DJANGO_SETTINGS_MODULE=backend.settings.prod` :

```bash
docker compose up -d --build --scale backend=3
docker compose run --rm backend python manage.py seed_catalog   # catalogue de démo : une seule fois
```

nginx répartit les requêtes, écarte un réplica en panne et relance sur un autre les lectures qui échouent. Sur un seul serveur, cela protège surtout des pannes : le processeur reste partagé.

## Notes de projet

Le projet est une boutique e-commerce B2C/B2B avec :

- Django REST API
- React + Vite frontend
- PostgreSQL en cible de production
- espace client, panier, checkout, gestion admin, comptes pro
