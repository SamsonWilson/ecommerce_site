# Architecture technique — Site e-commerce accessoires de mariage & style chinois

**Version** 1.0 — 20 juillet 2026
**Stack retenue** Django 5 (API REST) + Next.js 15 en JavaScript (SSR) + PostgreSQL

---

## 1. Principes directeurs

Cinq règles qui gouvernent toutes les décisions de ce document. En cas de doute
pendant le développement, revenir ici.

1. **Le backend est la seule source de vérité pour les prix.** Aucun calcul de
   prix, de remise ou de MOQ côté client. Voir §5.
2. **Toute page publique doit être rendue côté serveur.** Le SEO et le partage
   social sont l'objectif commercial n°1 ; une page qui a besoin de JavaScript
   pour afficher son contenu n'existe pas pour un crawler.
3. **On intègre plutôt qu'on développe** dès qu'une brique n'est pas notre
   métier (emailing, analytics, taux de change, messagerie). Voir §10.
4. **Chaque phase se termine par une mise en production.** Pas de branche qui
   vit trois mois. Voir §11.
5. **Le multilingue est structurel, pas un ajout final.** Les modèles portent
   les traductions dès la phase 1, même si une seule langue est exposée.

---

## 2. État actuel du dépôt

```
site_ecommerce_giovane/
├── backend/            squelette django-admin startproject, aucune app
│   ├── manage.py
│   └── backend/        settings.py (SQLite, INSTALLED_APPS par défaut)
├── frontend/           Vite + React 19 — À REMPLACER par Next.js
└── venv/               Python 3.11.9, VIDE (Django non installé)
```

**Actions préalables**

- Installer les dépendances backend dans le venv (§3).
- Remplacer `frontend/` par un projet Next.js. Le seul élément à conserver est
  `frontend/src/assets/hero.png` et `frontend/public/`.
- Initialiser un dépôt Git — le projet n'est pas versionné actuellement.
- Passer `DATABASES` sur PostgreSQL avant d'écrire la première migration.

---

## 3. Stack et dépendances

### Backend (`backend/requirements.txt`)

| Paquet | Rôle |
|---|---|
| `django~=5.1` | Framework |
| `djangorestframework` | API REST |
| `djangorestframework-simplejwt` | Authentification JWT |
| `psycopg[binary]` | Driver PostgreSQL |
| `django-cors-headers` | Autoriser le domaine Next.js |
| `django-environ` | Configuration par variables d'environnement |
| `django-parler` | Traduction des contenus produits |
| `django-filter` | Filtres API (couleur, moment, prix) |
| `Pillow` | Traitement images |
| `django-storages[s3]` | Stockage médias sur S3 / Cloudflare R2 |
| `celery` + `redis` | Tâches asynchrones |
| `stripe` | Paiement carte |
| `paypal-server-sdk` | Paiement PayPal |
| `weasyprint` | Génération des fiches PDF B2B |
| `sentry-sdk` | Suivi des erreurs en production |

### Frontend

**Langage : JavaScript (ESM), pas TypeScript.** Tous les fichiers en `.js` /
`.jsx`. Next.js fonctionne nativement en JavaScript — aucune configuration
particulière, il suffit de ne pas créer de `tsconfig.json`.

> Next.js **est** React : mêmes composants, mêmes hooks, même JSX. Il ajoute le
> rendu serveur, le routage par fichiers et l'optimisation des images. Le code
> React que vous écrivez est identique à celui d'un projet Vite.

| Paquet | Rôle |
|---|---|
| `next@15` | Framework React SSR/ISR |
| `next-intl` | Routage et traductions multilingues |
| `tailwindcss` | Styles |
| `@tanstack/react-query` | Cache des appels API côté client |
| `zustand` | État du panier |
| `zod` | Validation des formulaires (fonctionne en JS pur) |
| `prop-types` | Contrat des props des composants |
| `jsconfig.json` | Alias d'import `@/` + autocomplétion dans l'éditeur |

**Compensations à l'absence de TypeScript.** Sans typage statique, les erreurs
de forme de données ne se voient qu'à l'exécution — sur une API à ~25 endpoints,
c'est le principal risque de régression :

- `prop-types` sur tout composant recevant un objet produit, variante ou
  commande.
- Un module `lib/api.js` unique : **aucun `fetch` dispersé dans les composants**.
  Toute réponse de l'API y est normalisée en un seul endroit.
- `zod` pour valider les réponses API critiques (prix, panier, checkout) en plus
  des formulaires — c'est le filet de sécurité qui remplace le type.
- `jsconfig.json` avec `checkJs: false` : vous gardez l'autocomplétion de
  l'éditeur sans contrainte de compilation.

### Infrastructure

- **PostgreSQL 16** — obligatoire (JSONB, recherche full-text, contraintes).
  SQLite est inadapté dès la phase 2.
- **Redis** — file Celery + cache.
- **S3 ou Cloudflare R2** — médias. Les photos HD et vidéos produits ne doivent
  jamais être servies par Django.

---

## 4. Architecture applicative

```
                  ┌──────────────────────┐
   Visiteur ─────▶│  Next.js 15 (SSR)    │  pages publiques rendues serveur
                  │  /fr /en /zh         │  hreflang, Open Graph, sitemap
                  └──────────┬───────────┘
                             │ REST + JWT
                  ┌──────────▼───────────┐
                  │  Django + DRF        │◀── Django Admin (gestion interne)
                  │  PriceResolver       │
                  └──┬────────┬──────┬───┘
                     │        │      │
              PostgreSQL   Redis   S3/R2
                             │
                          Celery ──▶ PDF, emails, taux de change, vignettes
```

### Découpage en apps Django

| App | Responsabilité |
|---|---|
| `accounts` | Utilisateurs, profils B2C/B2B, validation des comptes pro |
| `catalog` | Produits, variantes, catégories, couleurs, moments de mariage |
| `pricing` | Tiers tarifaires, résolution de prix, devises |
| `cart` | Panier serveur (invité + connecté) |
| `orders` | Commandes, statuts, livraison |
| `payments` | Stripe, PayPal, webhooks |
| `quotes` | Demandes de devis B2B |
| `content` | Blog, guides de style, galerie clientes, témoignages |
| `core` | Utilitaires partagés, modèles de base, pagination |

Règle de dépendance : `catalog` ne connaît pas `orders`. `pricing` ne connaît
pas `cart`. Les dépendances vont toujours du plus spécifique vers le plus
général, jamais l'inverse.

---

## 5. Modèle de données

### 5.1 Comptes et niveaux tarifaires

```python
# accounts/models.py
class User(AbstractUser):
    email = EmailField(unique=True)      # login par email, pas username
    preferred_language = CharField(choices=LANGUAGES, default="fr")
    preferred_currency = CharField(default="EUR")

class CustomerProfile(models.Model):
    user = OneToOneField(User)
    account_type = CharField(choices=[("RETAIL", ...), ("WHOLESALE", ...)])
    status = CharField(choices=[("PENDING", ...), ("APPROVED", ...),
                                ("REJECTED", ...)], default="PENDING")
    price_tier = ForeignKey("pricing.PriceTier", null=True)
    company_name = CharField(blank=True)
    vat_number = CharField(blank=True)
    country = CharField()
```

**Parcours B2B** : inscription → `status=PENDING` (prix de détail affichés) →
validation manuelle dans le Django admin → `status=APPROVED` + affectation d'un
`price_tier` → les tarifs préférentiels apparaissent à la connexion suivante.

La validation manuelle est volontaire : elle protège les tarifs de gros et ne
coûte que quelques clics par semaine au démarrage.

### 5.2 Tarification

```python
# pricing/models.py
class PriceTier(models.Model):
    name = CharField()                   # "Revendeur", "Distributeur", "VIP"
    discount_percent = DecimalField()    # appliqué au wholesale_price
    priority = IntegerField()

class Currency(models.Model):
    code = CharField(max_length=3)       # EUR, USD, CNY
    rate_to_base = DecimalField(max_digits=12, decimal_places=6)
    updated_at = DateTimeField()         # rafraîchi quotidiennement par Celery
```

### 5.3 Catalogue

```python
# catalog/models.py
class Product(TranslatableModel):
    translations = TranslatedFields(
        name=CharField(),
        slug=SlugField(),                # URL distincte par langue → SEO
        description=TextField(),
        cultural_story=TextField(blank=True),   # origine, philosophie du design
        seo_title=CharField(blank=True),
        seo_description=TextField(blank=True),
    )
    category = ForeignKey("Category")
    wedding_moments = ManyToManyField("WeddingMoment")
    colors = ManyToManyField("ColorTheme")
    collection = ForeignKey("Collection", null=True)
    is_wholesale_only = BooleanField(default=False)
    is_active = BooleanField(default=True)

class ProductVariant(models.Model):
    product = ForeignKey(Product, related_name="variants")
    sku = CharField(unique=True)
    attributes = JSONField(default=dict)     # {"taille": "M", "métal": "or"}
    retail_price = DecimalField()            # devise de base (EUR)
    wholesale_price = DecimalField()
    moq = PositiveIntegerField(default=1)    # quantité minimale de commande
    max_order_qty = PositiveIntegerField(null=True)
    stock = PositiveIntegerField(default=0)
    weight_grams = PositiveIntegerField()    # nécessaire au calcul du port

class ProductMedia(models.Model):
    product = ForeignKey(Product, related_name="media")
    file = FileField(storage=S3Storage)
    media_type = CharField(choices=[("IMAGE", ...), ("VIDEO", ...)])
    angle = CharField(blank=True)            # face, profil, détail, porté
    alt_text = JSONField(default=dict)       # {"fr": "...", "en": "..."}
    position = PositiveIntegerField(default=0)

class WeddingMoment(TranslatableModel):      # cérémonie, réception, dîner, photo
class ColorTheme(TranslatableModel):         # + code hexadécimal pour le filtre
class Collection(TranslatableModel):         # + inspiration, storytelling
```

`attributes` en JSONB permet d'ajouter un axe de variation (longueur de voile,
type de fermoir) sans migration — c'est précisément ce qu'un catalogue
d'accessoires exige.

### 5.4 Commandes et devis

```python
# orders/models.py
class Order(models.Model):
    reference = CharField(unique=True)       # CMD-2026-00042
    customer = ForeignKey(User, null=True)   # null = commande invité
    email = EmailField()
    order_type = CharField(choices=[("RETAIL", ...), ("WHOLESALE", ...)])
    status = CharField(choices=[("PENDING", ...), ("PAID", ...),
                                ("PREPARING", ...), ("SHIPPED", ...),
                                ("DELIVERED", ...), ("CANCELLED", ...),
                                ("REFUNDED", ...)])
    currency = CharField()                   # devise FIGÉE à la commande
    exchange_rate = DecimalField()           # taux FIGÉ à la commande
    subtotal / shipping_cost / tax_amount / total = DecimalField()
    shipping_address = JSONField()           # copie figée, pas une FK

class OrderItem(models.Model):
    order = ForeignKey(Order, related_name="items")
    variant = ForeignKey(ProductVariant, on_delete=PROTECT)
    product_name = CharField()               # copie figée
    sku = CharField()                        # copie figée
    unit_price = DecimalField()              # copie figée
    quantity = PositiveIntegerField()
```

**Point critique** : une ligne de commande **copie** le nom, le SKU et le prix.
Si le prix du produit change six mois plus tard, la facture historique doit
rester exacte. Même logique pour l'adresse (`JSONField`) et le taux de change.
C'est l'erreur la plus fréquente et la plus difficile à rattraper après coup.

```python
# quotes/models.py
class QuoteRequest(models.Model):
    reference = CharField(unique=True)       # DEV-2026-00017
    customer = ForeignKey(User, null=True)
    contact_email / contact_name / company = CharField()
    message = TextField(blank=True)
    status = CharField(choices=[("NEW", ...), ("IN_REVIEW", ...),
                                ("QUOTED", ...), ("ACCEPTED", ...),
                                ("DECLINED", ...)])
    quoted_total = DecimalField(null=True)
    quote_pdf = FileField(null=True)         # généré par Celery
    valid_until = DateField(null=True)

class QuoteItem(models.Model):
    quote = ForeignKey(QuoteRequest, related_name="items")
    variant = ForeignKey(ProductVariant)
    quantity = PositiveIntegerField()
    proposed_unit_price = DecimalField(null=True)
```

---

## 6. Le PriceResolver — pièce maîtresse

Toute la logique B2B/B2C converge ici. Un seul point d'entrée, utilisé par
l'API, le panier, le checkout et la génération de PDF.

```python
# pricing/services.py
@dataclass(frozen=True)
class ResolvedPrice:
    unit_price: Decimal
    currency: str
    original_price: Decimal | None      # prix barré si remise
    moq: int
    max_qty: int | None
    is_wholesale: bool

def resolve_price(variant, user=None, quantity=1, currency="EUR") -> ResolvedPrice:
    """
    Unique autorité en matière de prix.
    Un client au détail ne doit JAMAIS pouvoir obtenir un wholesale_price,
    quelle que soit la requête envoyée.
    """
```

**Règles de sécurité non négociables**

- `ProductVariantSerializer` n'expose **jamais** le champ `wholesale_price`.
  Il expose un champ calculé `price` issu de `resolve_price()`.
- Le MOQ et `max_order_qty` sont revalidés à l'ajout au panier **et** au
  checkout. Le formulaire React n'est qu'un confort d'usage.
- Le total de la commande est recalculé côté serveur avant l'appel à Stripe.
  Le montant envoyé par le client est ignoré.
- Les produits `is_wholesale_only=True` sont filtrés du queryset public, pas
  masqués côté front.

Un test dédié doit vérifier qu'un utilisateur anonyme et un utilisateur
`RETAIL` ne peuvent obtenir un prix de gros par aucun endpoint. À écrire en
même temps que le resolver, pas après.

---

## 7. API REST

Préfixe `/api/v1/`. Authentification JWT (`Authorization: Bearer <token>`),
refresh token en cookie `httpOnly`.

### Catalogue (public)

```
GET  /api/v1/products/                 liste + filtres + pagination
     ?category=&moment=&color=&collection=&min_price=&max_price=
     &search=&ordering=&page=
GET  /api/v1/products/{slug}/          fiche complète (média, storytelling, SEO)
GET  /api/v1/categories/
GET  /api/v1/wedding-moments/
GET  /api/v1/colors/
GET  /api/v1/collections/{slug}/
```

La langue est portée par l'en-tête `Accept-Language`, envoyé par Next.js selon
le segment d'URL (`/zh/...` → `Accept-Language: zh`).

### Comptes

```
POST /api/v1/auth/register/            + account_type
POST /api/v1/auth/login/
POST /api/v1/auth/refresh/
GET  /api/v1/auth/me/                  profil + statut B2B + tier tarifaire
POST /api/v1/auth/password-reset/
```

### Panier et commande

```
GET|POST|PATCH|DELETE /api/v1/cart/items/
POST /api/v1/checkout/                 crée la commande + PaymentIntent Stripe
GET  /api/v1/orders/                   historique du client
GET  /api/v1/orders/{reference}/
POST /api/v1/webhooks/stripe/          idempotent, signature vérifiée
POST /api/v1/webhooks/paypal/
```

### B2B

```
POST /api/v1/quotes/                   demande de devis multi-produits
GET  /api/v1/quotes/                   suivi (authentifié)
GET  /api/v1/products/{slug}/datasheet.pdf     fiche technique PDF
```

### Contenu et marketing

```
GET  /api/v1/posts/                    blog, guides de style
GET  /api/v1/testimonials/             galerie clientes
POST /api/v1/newsletter/subscribe/     relais vers Brevo
```

---

## 8. Frontend Next.js

### Arborescence des routes

```
app/
├── [locale]/
│   ├── layout.jsx                  hreflang, JSON-LD Organization
│   ├── page.jsx                     accueil — ISR 1 h
│   ├── boutique/
│   │   ├── page.jsx                 catalogue + filtres — SSR
│   │   └── [slug]/page.jsx          fiche produit — ISR + generateMetadata
│   ├── collections/[slug]/page.jsx  storytelling collection
│   ├── inspiration/page.jsx         galerie clientes / social proof
│   ├── blog/[slug]/page.jsx         guides — ISR
│   ├── panier/page.jsx              client-side
│   ├── checkout/page.jsx            client-side
│   ├── devis/page.jsx               formulaire B2B
│   └── compte/**                    client-side, protégé
├── sitemap.js                       généré depuis l'API, toutes langues
└── robots.js
```

### Stratégie de rendu

| Type de page | Rendu | Justification |
|---|---|---|
| Accueil, collections | ISR 1 h | Contenu stable, doit être indexé |
| Fiche produit | ISR 15 min + revalidation à la sauvegarde | SEO + stock à jour |
| Catalogue filtré | SSR | Combinaisons de filtres trop nombreuses |
| Blog | ISR 24 h | Statique |
| Panier, checkout, compte | Client | Personnel, `noindex` |

Django déclenche la revalidation Next.js via un webhook au `post_save` d'un
produit — le contenu modifié en admin apparaît en ligne en quelques secondes.

### SEO — exigences concrètes

- URL distincte par langue **avec slug traduit** :
  `/fr/boutique/couronne-mariee-perles`, `/en/shop/pearl-bridal-crown`,
  `/zh/shop/zhenzhu-hunsha-huangguan`. Ne pas se contenter de préfixer.
- Balises `hreflang` réciproques + `x-default` sur chaque page.
- JSON-LD `Product` (prix, disponibilité, avis) et `BreadcrumbList`.
- Open Graph complet — **Pinterest est votre premier canal d'acquisition** :
  ajouter les Rich Pins et des images verticales 2:3.
- Sitemap XML segmenté par langue, soumis à Google Search Console.
- `robots.txt` autorisant explicitement `GPTBot`, `ClaudeBot`,
  `PerplexityBot`, `Google-Extended` — c'est la condition d'entrée du GEO.
- Images : `next/image`, format AVIF/WebP, `alt` traduit et descriptif.

---

## 9. Tâches asynchrones (Celery)

| Tâche | Déclencheur |
|---|---|
| Génération fiche PDF produit | À la demande + au `post_save` du produit |
| Génération PDF de devis | Passage du devis en `QUOTED` |
| Emails transactionnels | Commande, expédition, validation compte B2B |
| Mise à jour des taux de change | Cron quotidien |
| Vignettes et conversion AVIF | À l'upload d'un média |
| Synchronisation newsletter Brevo | À l'inscription |
| Relance panier abandonné | Cron horaire (phase 6) |

---

## 10. Ce que l'on n'écrit pas

Chaque ligne évitée ici est une semaine gagnée.

| Besoin | Solution intégrée |
|---|---|
| Analytics de trafic et de source | Google Analytics 4 + Meta / Pinterest Pixel |
| Emailing et automatisations | Brevo (API + templates) |
| WhatsApp, Messenger | Widgets officiels embarqués |
| Taux de change | `exchangerate.host`, cache 24 h |
| Recherche produits | `SearchVector` PostgreSQL (Elasticsearch inutile avant 10 000 réf.) |
| Back-office produits | Django Admin personnalisé |
| Hébergement médias | Cloudflare R2 + CDN |
| Suivi d'erreurs | Sentry |
| Frais de port (phase initiale) | Grille manuelle par zone et poids, API transporteur plus tard |

---

## 11. Feuille de route

| Phase | Livrable | Estimation |
|---|---|---|
| **0** | Git, PostgreSQL, Docker Compose, Next.js, CI, déploiement à blanc | 1 sem |
| **1** | Modèles catalogue, Django admin, API, catalogue + fiche produit SSR (FR) | 3–4 sem |
| **2** | Panier, Stripe, commandes, emails transactionnels, espace client | 3 sem |
| **3** | Comptes B2B, tiers tarifaires, MOQ, devis, PDF | 3–4 sem |
| **4** | Multilingue FR/EN/ZH, hreflang, sitemap, JSON-LD, Search Console | 2–3 sem |
| **5** | Filtres moment/couleur, galerie clientes, blog, storytelling collections | 2–3 sem |
| **6** | Multi-devises, PayPal, transporteurs, pixels sociaux, panier abandonné | 2 sem |

**Total ≈ 4 à 5 mois** à temps plein pour un développeur expérimenté.

**Jalon de validation** : ne pas entamer la phase 3 avant qu'une commande
réelle ait été payée en production en phase 2. C'est le principal risque du
projet — construire six mois de fonctionnalités avant la première vente.

---

## 12. Risques identifiés

| Risque | Impact | Mitigation |
|---|---|---|
| Fuite des prix de gros via l'API | Élevé | `PriceResolver` + tests dédiés (§6) |
| SEO absent si le SSR est contourné | Élevé | Interdire `"use client"` sur les pages publiques |
| Conformité PCI | Élevé | Stripe Elements uniquement, aucune donnée carte ne transite par Django |
| Traductions chinoises approximatives | Moyen | Traducteur natif, pas de traduction automatique publiée |
| Poids des médias HD | Moyen | R2 + CDN + AVIF + `next/image` |
| Périmètre qui s'étend | Élevé | Jalon de la phase 2, phases figées |
| TVA / OSS UE et douanes | Moyen | Ne pas improviser — cadrer avec un comptable en phase 6 |
| Erreurs de forme de données (pas de TypeScript) | Moyen | `lib/api.js` centralisé + `zod` sur les réponses critiques + `prop-types` (§3) |

---

## 13. Prochaine étape

Phase 0, dans l'ordre :

1. `git init` + `.gitignore` (le projet n'est pas versionné).
2. `docker-compose.yml` : PostgreSQL 16 + Redis.
3. Installer les dépendances backend dans le venv (vide actuellement).
4. Découper `settings.py` en `base / dev / prod` avec `django-environ`.
5. Créer les apps `core`, `accounts`, `catalog`, `pricing`.
6. Remplacer `frontend/` par Next.js 15 en JavaScript + Tailwind + `next-intl` :
   `npx create-next-app@latest frontend --js --app --tailwind --eslint`
   (l'option `--js` évite TypeScript).
7. Valider la chaîne complète : une page Next.js SSR affichant une donnée
   issue de l'API Django.
