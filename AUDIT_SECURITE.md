# Audit de sécurité : site e-commerce Maison Lián

**Date :** 5 novembre 2026
**Périmètre :** backend Django, frontend React, Docker, nginx, CI, historique git
**Version analysée :** le dossier de travail, y compris les 70 fichiers modifiés et non commités

> ⚠️ **Ne commitez pas ce fichier tant que les failles ne sont pas corrigées.** Le dépôt GitHub est public, et ce rapport décrit précisément comment attaquer le site. Il ne contient aucune valeur secrète.

> ✅ **État au 10 novembre 2026 :** C4, C5, E1, E2, E3, M5 et M12 sont corrigées dans le code, mais **ni commitées ni déployées**. F2 est corrigée en partie. Le détail est dans les sections [10](#10-corrections-appliquées) et [11](#11-traduction-du-site). Tout le reste est encore ouvert, notamment les secrets exposés (C1, C2, C3).

---

## 1. Résumé

| Gravité | Nombre | Corrigées dans le code | Signification |
|---|---|---|---|
| 🔴 Critique | 6 | 2 (C4, C5) | Exploitable tout de suite, sans compte ni compétence particulière |
| 🟠 Élevée | 10 | 3 (E1, E2, E3) | Impact fort, ou exploitable sous une condition simple |
| 🟡 Moyenne | 13 | 2 (M5, M12) | À corriger, mais demande un accès ou un contexte particulier |
| 🔵 Faible | 8 | F2 en partie | Durcissement et hygiène |

**Les quatre problèmes à traiter en premier :**

1. **Le dépôt GitHub est public et son historique contient vos secrets.** Il contient un mot de passe Gmail toujours actif, et une ancienne base de données avec des comptes et des commandes.
2. **La clé qui signe les connexions est publique.** Avec votre `.env`, n'importe qui peut fabriquer un jeton administrateur sans mot de passe.
3. **Le mot de passe admin par défaut est écrit dans le README public.** Code corrigé, mais le mot de passe reste à changer.
4. **N'importe qui peut créer une commande marquée « payée » au prix de son choix**, sans compte, et vider le stock. Corrigé dans le code, à déployer.

**Comment lire les statuts :**

- **Prouvé** : j'ai exécuté le test ou la commande, et le résultat est celui indiqué.
- **Lu** : constaté en lisant le code, sans l'avoir exécuté.

**Limite importante :** je n'ai pas testé le site en ligne (`ecommerce.ginolux.com`). Les tests ont tourné sur une base temporaire en mémoire. Je ne sais donc pas quelle configuration utilise réellement votre serveur. Les points qui en dépendent sont signalés.

---

## 2. Failles critiques 🔴

### C1. Mot de passe Gmail exposé dans l'historique public

- **Statut :** Prouvé
- **Où :** commit `8e9dd84`, fichier `.env`, visible sur GitHub
- **Constat :**
  - L'API GitHub confirme que le dépôt est public et que ce commit est accessible.
  - Le fichier a été retiré plus tard (commit `9c827c0`), mais il reste dans l'historique.
  - La valeur de `EMAIL_HOST_PASSWORD` est identique à celle de votre `.env` actuel, et elle a le format d'un mot de passe d'application Gmail. Je ne l'ai pas essayée.
- **Risque :** envoyer des e-mails au nom de la boutique et, selon la configuration du compte, lire la boîte de réception.
- **Correctif :**
  1. Révoquez ce mot de passe sur https://myaccount.google.com/apppasswords et créez-en un nouveau.
  2. L'ancien `POSTGRES_PASSWORD` est aussi dans ce commit. Il diffère de l'actuel, mais ne le réutilisez nulle part.

### C2. Base de données dans l'historique public

- **Statut :** Prouvé (j'ai compté les lignes, sans lire leur contenu)
- **Où :** `backend/db.sqlite3` dans les commits `8e9dd84`, `67b149c` et `f98b6f6`
- **Constat, dans la version la plus récente :**
  - 16 comptes, dont 14 avec une adresse qui n'est pas une adresse de test
  - 14 comptes avec une empreinte de mot de passe (comptage séparé du précédent)
  - 19 commandes, 3 devis, 234 jetons JWT, 8 sessions
- **Risque :** les empreintes peuvent être attaquées hors ligne, et les commandes contiennent normalement des noms et des adresses.
- **Correctif :**
  1. Passez le dépôt en privé maintenant. Cela n'efface pas ce qui a pu être copié.
  2. Vérifiez si ces données concernent de vraies personnes. Si oui, forcez un changement de mot de passe et évaluez l'obligation de notifier la CNIL (72 h, RGPD).
  3. Purgez `.env`, `backend/db.sqlite3` et `venv/` de l'historique avec `git filter-repo`, puis faites un `push --force`. Cette opération réécrit l'historique, à préparer avec soin.

### C3. La clé de signature `SECRET_KEY` est publique

- **Statut :** Prouvé (test P06)
- **Où :** `.env`, [.env.example](.env.example), [base.py:15](backend/backend/settings/base.py#L15)
- **Constat :**
  - La `SECRET_KEY` de votre `.env` est exactement le texte d'exemple de `.env.example`, qui est public.
  - Cette clé signe tous les jetons JWT.
  - Si la variable est absente, le code retombe sur une autre valeur publique, `dev-insecure-change-me`.
- **Preuve :** avec la seule clé publique, j'ai fabriqué un jeton pour un superutilisateur. L'API `/admin/staff/` a répondu **200**, sans aucun mot de passe.
- **Risque :** si le serveur utilise cette clé, n'importe qui prend le contrôle complet du site.
- **Correctif :**
  1. Générez une vraie clé, différente pour chaque environnement :
     ```bash
     python -c "from django.core.management.utils import get_random_secret_key as k; print(k())"
     ```
  2. Supprimez la valeur par défaut pour que le démarrage échoue si la clé manque.
  3. Attendez-vous à ce que tout le monde soit déconnecté : c'est l'effet voulu.

### C4. Compte administrateur par défaut, mot de passe public ✅ code corrigé

- **Statut :** Prouvé pour la base locale. **À vérifier sur le serveur.**
- **Constat avant correction :**
  - L'e-mail et le mot de passe admin étaient écrits dans `frontend/README.md`, publié sur GitHub.
  - Le superutilisateur de votre base locale utilise bien ce mot de passe.
  - `init_admin` **remettait ce mot de passe à chaque démarrage** du conteneur, même si vous l'aviez changé.
  - [docker-compose.yml](docker-compose.yml) ne transmet pas `ADMIN_PASSWORD`, et `.env` ne le définit pas : la valeur par défaut était donc toujours utilisée.
  - Le mot de passe était aussi écrit en clair dans les logs.
- **Corrigé :** plus de mot de passe par défaut, plus d'écrasement de compte, plus d'affichage en clair, plus d'exécution au démarrage, identifiants retirés du README. Voir la [section 10](#10-corrections-appliquées).
- **Reste à faire de votre côté :** le code ne change pas les comptes déjà créés. Le mot de passe public reste actif tant que vous n'avez pas lancé `python manage.py changepassword <e-mail de l'admin>`, sur chaque environnement. Il reste aussi lisible dans l'historique git.

### C5. Commande « payée » au prix choisi, sans compte ✅ corrigé

- **Statut :** Prouvé (test P01), puis corrigé et vérifié
- **Où :** `CheckoutView`, dans [orders/views.py:127](backend/orders/views.py#L127)
- **Constat avant correction :** `/api/v1/checkout/` est ouvert à tous et faisait confiance à ce qu'envoie le navigateur :
  - `mark_paid` marquait la commande payée, sans vérifier qui demandait.
  - `unit_price` remplaçait le prix calculé par le serveur.
  - `cashier_name` permettait de se faire passer pour un caissier.
- **Preuve :** un visiteur anonyme avait acheté 10 articles à 100 € pour **0,10 € au total**. La commande était passée en **PAID** avec un faux caissier, le stock était tombé à **0** et le produit avait disparu de la boutique.
- **Cause :** la caisse ([Sales.jsx:343](frontend/src/pages/admin/Sales.jsx#L343)) passe par la même route publique que les clients.
- **Corrigé :** seul un employé ayant la section `orders` peut encaisser, et le prix vient toujours du serveur. La même attaque reçoit maintenant un refus **403**, sans commande créée et sans toucher au stock. Voir la [section 10](#10-corrections-appliquées).

### C6. Base de données dans l'image Docker publique

- **Statut :** Prouvé (fichiers lus dans l'image, sans la lancer)
- **Où :** image `hugueswilson/ecommerce:latest`, publique sur Docker Hub, 1 125 téléchargements, mise à jour le 5 novembre 2026
- **Constat :** le `Dockerfile` racine copie tout `backend/`, et il n'y a pas de `.dockerignore` à la racine. L'image contient donc `db.sqlite3` : 1 superutilisateur, 3 commandes, 90 jetons JWT. Aucun `.env` n'y figure.
- **Risque :** n'importe qui peut récupérer ces données. Si le serveur n'a pas de `DATABASE_URL`, c'est aussi cette base qui tourne en production, avec le mot de passe admin public, et chaque déploiement l'écrase.
- **Correctif :**
  1. Passez le dépôt Docker Hub en privé.
  2. Ajoutez un `.dockerignore` à la racine excluant `*.sqlite3`, puis republiez l'image. Les anciennes versions doivent être supprimées de Docker Hub.
  3. Vérifiez que le serveur a bien un `DATABASE_URL` PostgreSQL.

---

## 3. Failles élevées 🟠

### E1. Aucun paiement réel, et le site demande quand même la carte ✅ corrigé (sections 15 et 16)

- **Statut :** Prouvé pour les réglages, Lu pour le reste
- **Où :** [Checkout.jsx:328](frontend/src/pages/Checkout.jsx#L328), [orders/views.py:255-270](backend/orders/views.py#L255-L270)
- **Constat :**
  - `STRIPE_SECRET_KEY` n'existe pas dans les réglages et `stripe` n'est pas dans `requirements.txt`. Le code Stripe ne s'exécute donc jamais, et le serveur renvoie un faux `mock_pi_secret_…`.
  - La page demande un numéro de carte et un CVC. Ces champs ne sont ni envoyés ni stockés.
  - ✅ *Corrigé :* si le backend échouait, le frontend vidait le panier et affichait une fausse confirmation. Il affiche maintenant l'erreur et garde le panier.
  - Une erreur Stripe est ignorée (`except Exception: pass`). Le webhook répond « success » sans rien faire si son secret est absent, et il ne compare pas le montant payé au total.
- **Correctif :**
  1. Retirez les champs de carte tant que le paiement n'est pas branché.
  2. Utilisez Stripe Elements ou Checkout : ne manipulez jamais les numéros de carte vous-même.
  3. Dans le webhook, refusez les requêtes si le secret manque et vérifiez le montant.

### E2. Le checkout ne contrôlait ni le produit ni la quantité ✅ corrigé

- **Statut :** Prouvé (tests P02, P03), puis corrigé et vérifié
- **Constat avant correction :**
  - Un anonyme pouvait commander un produit réservé aux grossistes, ainsi qu'un produit désactivé.
  - Un article inexistant était remplacé en silence par **le premier produit de la base**.
  - La boutique envoyait `variant_id: index + 1`, c'est-à-dire la position dans le panier et non le vrai identifiant. Les vraies commandes pouvaient donc viser **le mauvais produit** et débiter le mauvais stock.
- **Corrigé :** ces cas renvoient **400**, et [Checkout.jsx:80](frontend/src/pages/Checkout.jsx#L80) envoie le slug de l'article.

### E3. Une requête anonyme cassait la liste des commandes de l'admin ✅ corrigé

- **Statut :** Prouvé (test P04), puis corrigé et vérifié
- **Constat avant correction :** si `shipping_address` n'était pas un objet JSON, la commande était tout de même enregistrée, puis `.get()` plantait à l'affichage. La liste admin passait de **200 à 500** après une seule requête anonyme.
- **Corrigé :** la requête est refusée (**400**), et [orders/serializers.py:70](backend/orders/serializers.py#L70) tolère les commandes déjà enregistrées avec ce défaut.

### E4. Aucune limite de tentatives

- **Statut :** Prouvé (tests P08, P15)
- **Où :** [base.py:187](backend/backend/settings/base.py#L187), [frontend/nginx/default.conf](frontend/nginx/default.conf)
- **Constat :**
  - 50 mauvais mots de passe de suite : aucun blocage, et le bon passe ensuite. `ACCOUNT_RATE_LIMITS` ne protège pas votre route `/auth/login/`, qui ne passe pas par allauth.
  - Rien non plus sur le PIN, l'inscription, le mot de passe oublié, le checkout ou les devis.
- **Correctif :**
  ```python
  "DEFAULT_THROTTLE_CLASSES": [
      "rest_framework.throttling.AnonRateThrottle",
      "rest_framework.throttling.UserRateThrottle",
  ],
  "DEFAULT_THROTTLE_RATES": {"anon": "60/min", "user": "300/min", "login": "5/min"},
  "NUM_PROXIES": 1,   # sinon toutes les requêtes semblent venir de nginx
  ```
  Ajoutez un `ScopedRateThrottle` sur login, reset, PIN et checkout. Avec plusieurs workers, configurez un cache Redis partagé, sinon chaque processus compte de son côté. Vous pouvez aussi ajouter `limit_req` dans nginx.

### E5. Vol de compte par pré-inscription

- **Statut :** Prouvé (test P09)
- **Où :** [accounts/views.py:141-149](backend/accounts/views.py#L141-L149), [base.py:253-254](backend/backend/settings/base.py#L253-L254), [base.py:265](backend/backend/settings/base.py#L265)
- **Scénario :**
  1. Un attaquant s'inscrit avec l'e-mail de sa victime. Le compte est utilisable sans vérification.
  2. Plus tard, la victime se connecte avec Google et arrive sur **ce même compte**.
  3. Le mot de passe de l'attaquant reste valide : il voit ses commandes et ses adresses.
- **Correctif :** dans `GoogleAuthView`, si le compte existant n'a pas d'e-mail vérifié, invalidez son mot de passe (`set_unusable_password()`) et marquez l'e-mail vérifié. Passez aussi `ACCOUNT_EMAIL_VERIFICATION` à `mandatory`, **et** vérifiez ce statut dans `CookieTokenObtainPairView` : ce réglage seul ne protège pas votre route de connexion.

### E6. Faux JPEG accepté : script malveillant stocké

- **Statut :** Prouvé pour l'envoi (test P16), Lu pour l'exécution dans le navigateur
- **Où :** [admin_serializers.py:47-86](backend/catalog/admin_serializers.py#L47-L86), [catalog/models.py:110](backend/catalog/models.py#L110), [default.conf:42](frontend/nginx/default.conf#L42)
- **Constat :** seuls les premiers octets sont contrôlés, et le nom d'origine est conservé.
- **Preuve :** un employé du rôle CATALOG a envoyé un fichier `evil.html` commençant par l'en-tête JPEG. Il a été accepté (201) et stocké sous `products/evil.html`.
- **Risque :** nginx le servirait comme une page HTML, depuis votre domaine. Si un admin ouvre ce lien, le script peut obtenir un jeton via `/auth/refresh/` et agir à sa place. C'est une escalade de CATALOG vers ADMIN.
- **Correctif :**
  1. Renommez chaque fichier avec un UUID et une extension déduite du format détecté.
  2. Validez réellement les images avec Pillow.
  3. Sur `/media/`, ajoutez dans nginx `X-Content-Type-Options: nosniff` et `Content-Security-Policy: sandbox`.

### E7. Votre `.env` lance le mode développement

- **Statut :** Prouvé pour les réglages. **À vérifier sur le serveur.**
- **Où :** `.env`, [docker-compose.yml:33](docker-compose.yml#L33), [dev.py](backend/backend/settings/dev.py)
- **Constat :** `.env` contient `DEBUG=False`, mais aussi `DJANGO_SETTINGS_MODULE=backend.settings.dev`, qui force `DEBUG=True`. Les réglages effectifs sont **`DEBUG=True` et `ALLOWED_HOSTS=['*']`**. `.env.example` a le même défaut, et Compose retombe sur `dev` par défaut.
- **Risque :** si ce fichier sert en production, les pages d'erreur exposent le code et la configuration.
- **Correctif :** utilisez `backend.settings.prod` sur le serveur, faites de `prod` la valeur par défaut de Compose et corrigez `.env.example`.

### E8. Durcissement de production désactivé par défaut

- **Statut :** Prouvé (`manage.py check --deploy` : 5 alertes)
- **Où :** [prod.py:8-14](backend/backend/settings/prod.py#L8-L14), [default.conf:12](frontend/nginx/default.conf#L12)
- **Constat :**
  - Par défaut : pas de redirection HTTPS, cookies non sécurisés, HSTS à 0.
  - Le cookie de refresh n'est pas `Secure` avec votre `.env`, donc il peut circuler en clair.
  - `ALLOWED_HOSTS` retombe sur une liste contenant `*`.
  - nginx n'écoute qu'en HTTP.
- **Correctif :** mettez ces réglages à `True` par défaut dans `prod.py`, retirez `*` et servez le site en HTTPS. Si un proxy en amont gère le TLS, nginx doit transmettre son `X-Forwarded-Proto`. Avec `$scheme`, l'en-tête vaut toujours `http` et `SECURE_SSL_REDIRECT` provoquerait une boucle de redirection.

### E9. Le rôle SUPPORT dépasse ses droits

- **Statut :** Prouvé (tests P11, P12)
- **Où :** [admin_views.py:31](backend/accounts/admin_views.py#L31), [orders/serializers.py:28-54](backend/orders/serializers.py#L28-L54), [orders/views.py:394](backend/orders/views.py#L394)
- **Constat :** un employé SUPPORT, sans accès B2B, peut :
  - faire passer n'importe quel client en grossiste ;
  - modifier le montant, l'e-mail et la référence d'une commande (test : total réécrit à 1,00 €) ;
  - supprimer définitivement une commande.

  `OrderSerializer` n'a aucun champ en lecture seule.
- **Correctif :** créez un serializer admin limité à `status` et `delivery_driver`, exigez la section `b2b` pour les changements de type de compte, et réservez la suppression aux administrateurs (ou remplacez-la par l'annulation).

### E10. Dépendances vulnérables ou plus maintenues

- **Statut :** Prouvé (`pip-audit`)
- **Où :** [requirements.txt:6](backend/requirements.txt#L6)
- **Constat :**
  - `django>=5.1,<5.2` installe **Django 5.1.15 dans Docker** : 8 avis de sécurité, et leurs correctifs n'existent qu'à partir de la 5.2. Vous y ajoutez 3 avis sur DRF 3.17.2.
  - Votre `venv` utilise Django 5.2.16 : vous ne testez donc pas la version déployée.
  - Le `venv` compte 36 avis sur 8 paquets : PyJWT (15), DRF (5), sqlparse (5), pyasn1 (4), urllib3 (3), Django (2), certifi (1), cryptography (1).
  - Les versions ne sont pas figées, donc deux builds peuvent différer.
- **Correctif :** passez à `django>=5.2.17,<5.3`, mettez à jour PyJWT (≥ 2.15), DRF (≥ 3.18.2), urllib3 (≥ 2.8), puis figez les versions avec `pip-compile` ou équivalent.

---

## 4. Failles moyennes 🟡

| # | Problème | Où | Statut | Correctif |
|---|---|---|---|---|
| M1 | Un ADMIN non-superuser peut réinitialiser le mot de passe du superuser et le recevoir en clair, puis se connecter avec (P13) | [admin_views.py:149](backend/accounts/admin_views.py#L149) | Prouvé | Interdire toute action sur un superuser à qui n'en est pas un |
| M2 | Le PIN de livraison ne prouve rien : le client le voit et se confirme lui-même, l'admin livre sans PIN, les essais sont illimités (P15). Il vient de `random`, non cryptographique | [serializers.py:47](backend/orders/serializers.py#L47), [models.py:74-78](backend/orders/models.py#L74-L78), [Deliveries.jsx:59](frontend/src/pages/admin/Deliveries.jsx#L59) | Prouvé | Définir qui détient le PIN, le retirer de la réponse de l'autre partie, utiliser `secrets`, limiter les essais |
| M3 | Après un reset de mot de passe, l'ancienne session reste valide : un voleur de session reste connecté (P07) | [accounts/urls.py:23](backend/accounts/urls.py#L23) | Prouvé | Révoquer les refresh tokens au changement de mot de passe, comme `_revoke_tokens` |
| M4 | Un compte `is_staff` sans fiche employé obtient tous les droits, gestion de l'équipe comprise (P14) | [permissions.py:14-17](backend/accounts/permissions.py#L14-L17) | Prouvé | Renvoyer `[]` : refuser par défaut |
| M5 | Survente possible : le stock est lu puis écrit sans verrou, et `max(0, …)` masque l'anomalie. **Corrigé pour le checkout et la caisse, puis pour le passage à « payée » (section 16, prouvé sur PostgreSQL).** | [orders/views.py:97](backend/orders/views.py#L97) | Prouvé sur PostgreSQL | `select_for_update()` et mise à jour avec `F()` dans `deduct_order_stock` |
| M6 | `/collections/<slug>/` montre aux anonymes les produits réservés aux grossistes, alors que leur fiche renvoie 404 (P17) | [catalog/serializers.py:153](backend/catalog/serializers.py#L153) | Prouvé | Réutiliser `public_product_queryset` |
| M7 | Les conteneurs tournent en root, et le `Dockerfile` racine copie `backend/db.sqlite3` dans l'image : il n'y a pas de `.dockerignore` à la racine | [Dockerfile](Dockerfile), [backend/Dockerfile](backend/Dockerfile) | Lu | Ajouter `USER app` et un `.dockerignore` racine |
| M8 | Aucun en-tête de sécurité côté nginx : ni CSP, ni HSTS, ni `nosniff`, ni `Referrer-Policy` | [default.conf](frontend/nginx/default.conf) | Lu | Les ajouter, en commençant la CSP en mode `Report-Only` |
| M9 | L'admin Django `/admin/` est public, et aucun compte employé n'a de double authentification | [default.conf:51](frontend/nginx/default.conf#L51) | Lu | Restreindre par IP ou VPN, ajouter la 2FA pour le staff |
| M10 | `start.sh` expose Django en mode DEBUG et Vite à tout le réseau local (`0.0.0.0`) | [start.sh:31](start.sh#L31), [start.sh:36](start.sh#L36) | Lu | Écouter sur `127.0.0.1` |
| M11 | `LOGGING` n'est pas configuré et il n'y a aucune trace des actions sensibles, comme les changements de rôle, de prix ou de statut | [base.py](backend/backend/settings/base.py) | Prouvé | Journaliser ces actions, avec leur auteur |
| M13 | Le code PIN de l'inventaire est vérifié dans le navigateur, avec les valeurs fixes `1234` et `0000` : n'importe quel employé qui lit le code peut valider un inventaire. Le message qui affichait ce code est retiré, pas la vérification | [Inventory.jsx:111](frontend/src/pages/admin/Inventory.jsx#L111) | Lu | Vérifier un PIN propre à chaque responsable côté serveur |
| M12 | ✅ **Corrigé.** Le script Google Translate était chargé sur toutes les pages, back-office compris : il pouvait tout lire, et les textes traduits, données clients comprises, partaient chez Google. Il est supprimé (voir section 11) | `frontend/src/main.jsx` | Corrigé | Fait |

---

## 5. Failles faibles 🔵

| # | Problème | Où | Correctif |
|---|---|---|---|
| F1 | L'inscription révèle si un e-mail a déjà un compte (P10) | [accounts/serializers.py:70](backend/accounts/serializers.py#L70) | Réponse neutre, ou au minimum limitation de débit |
| F2 | Des entrées invalides provoquaient des erreurs 500 (P05). **Corrigé pour le checkout.** Le panier serveur a le même défaut avec `int()` | [cart/views.py:29](backend/cart/views.py#L29), [cart/views.py:61](backend/cart/views.py#L61), [cart/views.py:94](backend/cart/views.py#L94) | Valider ces entrées et répondre 400 |
| F3 | CORS et CSRF acceptent `http://` et `localhost` dans la configuration de production | `.env`, [prod.py](backend/backend/settings/prod.py) | Garder uniquement `https://ecommerce.ginolux.com` |
| F4 | `npm audit` : 6 vulnérabilités (5 élevées, 1 modérée), toutes corrigeables. Elles touchent surtout les outils de build ; l'avis `react-router` concerne le mode RSC, a priori non utilisé ici | [package.json](frontend/package.json) | `npm audit fix` |
| F5 | La CI n'a ni audit de dépendances, ni scan de secrets, ni bloc `permissions:`, et les actions ne sont pas figées par SHA | [ci.yml](.github/workflows/ci.yml) | Ajouter `pip-audit`, `npm audit` et `gitleaks` |
| F6 | Les mots de passe temporaires des employés sont renvoyés en clair, sans changement forcé à la première connexion | [admin_views.py:155](backend/accounts/admin_views.py#L155) | Envoyer plutôt un lien d'activation |
| F7 | `callback_url` vient du client pour la connexion Facebook (non configurée aujourd'hui) | [social_views.py:50](backend/accounts/social_views.py#L50) | Toujours utiliser `SOCIAL_CALLBACK_URL` |
| F8 | Erreur de configuration : `GOOGLE_CLIENT_SECRET` contient le Client ID. **Ce n'est donc pas une fuite de secret Google.** Le dossier `venv/` figure aussi dans l'historique | `.env` | Renseigner la vraie valeur si le flux OAuth serveur est utilisé ; purger `venv/` avec C2 |

---

## 6. Ce qui est bien fait ✅

Ces points ont été vérifiés et n'ont pas besoin d'être changés :

| Contrôle | Résultat | Statut |
|---|---|---|
| Anonyme vers l'API admin | Refusé (401) | Prouvé |
| Client vers l'API admin | Refusé (403) | Prouvé |
| Client vers la commande d'un autre | Introuvable (404) | Prouvé |
| CATALOG vers les commandes, SUPPORT vers l'équipe | Refusé (403) | Prouvé |
| Prix de gros dans les réponses publiques | Absent | Prouvé |
| Se donner `is_staff` ou le statut grossiste via `/auth/me/` ou l'inscription | Ignoré | Prouvé |
| Ancien jeton d'un compte désactivé | Refusé (401) | Prouvé |
| Secrets dans le bundle frontend | Aucun (le seul résultat est le Client ID, public par nature) ; pas de source map | Prouvé |
| Injection SQL | Aucune requête brute hors `SELECT 1` de la sonde de santé | Lu |
| Jeton d'accès | Gardé en mémoire, jamais dans `localStorage` | Lu |
| Refresh token | Cookie `httpOnly`, rotation et liste noire activées | Lu |
| OAuth | Paramètre `state` vérifié | Lu |
| XSS dans React | Un seul `dangerouslySetInnerHTML`, sur un texte de traduction statique | Lu |
| `.env` et `*.sqlite3` | Désormais ignorés par git et absents de `HEAD` | Prouvé |

---

## 7. Plan d'action

### Aujourd'hui

- [ ] Passer le dépôt GitHub **et l'image Docker Hub** en **privé** (C1, C2, C6)
- [ ] **Révoquer** le mot de passe d'application Gmail et en créer un nouveau (C1)
- [ ] Générer une vraie `SECRET_KEY` pour chaque environnement (C3)
- [ ] Changer le mot de passe admin partout où le site tourne, base locale comprise (C4)
- [x] Retirer `init_admin` du démarrage et les identifiants du README (C4)
- [ ] Vérifier que le serveur utilise `backend.settings.prod` (E7)
- [x] Corriger `CheckoutView` (C5, E2, E3)
- [ ] Déployer ces corrections, backend et frontend ensemble. Si le site est en ligne, couper les commandes en attendant

### Cette semaine

- [ ] Vérifier si la base exposée contient de vraies personnes, et traiter le volet RGPD (C2)
- [ ] Purger l'historique git (C2)
- [ ] Limiter les tentatives (E4)
- [ ] Fermer la pré-inscription (E5)
- [ ] Sécuriser les envois de fichiers (E6)
- [ ] Activer le HTTPS et le durcissement de production (E8)
- [ ] Limiter les droits SUPPORT (E9)
- [ ] Passer à Django 5.2 et figer les dépendances (E10)
- [ ] Retirer le faux formulaire de carte, puis brancher un vrai paiement (E1)

### Ensuite

- [ ] Traiter les points M1 à M11 et M13 (M12 : fait)
- [ ] Traiter les points F1 à F8
- [ ] Transformer les autres tests de cet audit en tests de non-régression (checkout et `init_admin` : fait)

---

## 8. Bugs trouvés en passant (hors sécurité)

- **`docker compose up` semble bloqué** (Lu, non exécuté). Le nouvel `entrypoint.sh` ne fait plus `exec "$@"` : il lance toujours Gunicorn sur le port 5000. Le service `migrate` ne se termine donc jamais, `backend` n'est jamais démarré, et nginx vise le port 8000.
- **Les livreurs ne voient sans doute aucune course** (Lu). Le rôle DELIVERY n'a que la section `deliveries`, alors que la page appelle une API qui exige `orders`. Ne lui donnez pas `orders`, qui ouvrirait toutes les commandes : créez plutôt une route limitée à ses courses.
- **La page de confirmation est fausse** (Lu). [OrderConfirmation.jsx](frontend/src/pages/OrderConfirmation.jsx) affiche une référence écrite en dur, ignore la vraie commande et lit un panier déjà vidé. Elle annonce aussi un e-mail de confirmation, alors qu'aucun n'est envoyé.
- **`seed_catalog` écrase vos données à chaque démarrage** (Lu). `entrypoint.sh` le lance à chaque démarrage du conteneur, et il remet le stock à 50 et les prix d'origine des 10 produits de démonstration. À corriger avant de vendre pour de vrai.
- **Les frais de port ne sont pas enregistrés** (Lu). La page de paiement affiche 6,90 € ou 12,90 €, mais le serveur met `shipping_cost` à 0 : le total de la commande ne correspond pas à ce que le client a vu.

---

## 9. Journal de ce que j'ai fait

1. **Cartographie** : structure du projet, `.gitignore`, fichiers sensibles présents sur le disque ou suivis par git.
2. **Configuration** : lecture de `.env` avec les valeurs secrètes masquées, des réglages Django, de Docker, de nginx, de la CI et des scripts.
3. **Lecture du backend** : `accounts`, `orders`, `cart`, `pricing`, `quotes`, `catalog`, `core`.
4. **Historique git** : repérage de `.env` et `db.sqlite3` dans les anciens commits. Comparaison des secrets entre l'historique et le `.env` actuel, sans jamais les afficher. Comptage des lignes des anciennes bases, sans lire leur contenu. Copies temporaires supprimées ensuite.
5. **GitHub** : trois requêtes anonymes en lecture (page du dépôt, visibilité, existence du commit).
6. **Frontend** : recherche des points d'injection, du stockage local, des scripts externes et des redirections, puis lecture de `api.js`, `Checkout.jsx`, `Sales.jsx`, `Deliveries.jsx`, `OAuthCallback.jsx`, `RequireAdmin.jsx` et `googleTranslate.js`.
7. **Outils** : `manage.py check --deploy`, `npm audit` et `pip-audit` (installé dans un environnement temporaire, supprimé ensuite). Ces deux derniers envoient les noms et versions des paquets aux registres.
8. **Tests de preuve** : 18 tests Django sur une base SQLite en mémoire, e-mails bloqués et réponse Google simulée.
9. **Correction de mes propres erreurs de test :**
   - Le test P07 était d'abord invalide (la réinitialisation échouait). Je l'ai corrigé et relancé : le résultat retenu est le bon.
   - Le secret Google semblait exposé. La vérification a montré que c'est le Client ID : je l'ai reclassé de fuite en erreur de configuration (F8).
   - Les clés détectées dans `venv/` de l'historique sont des exemples de bibliothèques, donc de faux positifs.
10. **Vérification locale** : contrôle du mot de passe par défaut sur le superutilisateur de la base locale, en lecture seule.
11. **Rédaction** de ce rapport.

### Résultats des tests

| Test | Vérifie | Résultat |
|---|---|---|
| P01 | Commande payée au prix choisi | Exploitable : PAID, 0,10 € au lieu de 1 000 €, stock à 0 |
| P02 | Gros, inactif, MOQ | Exploitable : 201 |
| P03 | Article inexistant | Remplacé par le premier produit |
| P04 | Commande piégée | Liste admin 200 → 500 |
| P05 | Entrées invalides | 500, et 201 pour `quantity=0` |
| P06 | JWT forgé avec la clé publique | Exploitable : 200 |
| P07 | Session après reset du mot de passe | Toujours valide |
| P08 | 50 mauvais mots de passe | Aucun blocage |
| P09 | Pré-inscription | Exploitable |
| P10 | Énumération d'e-mails | Confirmée |
| P11 | SUPPORT vers grossiste | Exploitable : 200 |
| P12 | SUPPORT modifie et supprime une commande | Exploitable : 200 et 204 |
| P13 | ADMIN prend le superuser | Exploitable : 200 |
| P14 | `is_staff` sans fiche | Accès complet : 200 |
| P15 | PIN de livraison | Inefficace |
| P16 | Faux JPEG `.html` | Accepté : 201 |
| P17 | Fuite via `/collections/` | Confirmée |
| P90–P94 | Contrôles positifs | Tous corrects (voir section 6) |

### Ce que je n'ai pas fait pendant l'analyse

- Aucune correction à ce stade : les corrections, faites ensuite à votre demande, sont dans la section 10.
- Aucun commit, aucun push, aucune modification de l'historique.
- Aucun test sur le site en ligne, ni sur le serveur local qui écoutait sur le port 8000.
- Aucun secret essayé auprès de Google ou de Gmail.
- Aucun build Docker : le démon n'était pas démarré.
- Lecture partielle du frontend : les grandes pages admin (`Products`, `Promotions`, `AestheticMedia`, etc.) ont été analysées par recherche de motifs, pas ligne par ligne. Les routes HTML d'allauth n'ont pas été testées.
- Ce rapport ne remplace pas un test d'intrusion sur le site en production.

---

## 10. Corrections appliquées

Deuxième étape, à votre demande : failles C4 et C5, ce qui règle aussi E2 et E3. **Rien n'est commité ni déployé.**

### Ce qui change

| Situation | Avant | Après |
|---|---|---|
| Visiteur, client ou employé sans section `orders` envoie `mark_paid` | Commande payée | Refus 403 |
| Caissier habilité envoie `mark_paid` | Commande payée | Inchangé |
| Prix envoyé par le navigateur | Accepté | Ignoré pour tout le monde, caisse comprise |
| Article inconnu | Remplacé par le premier produit | Refus 400 |
| Produit inactif, ou réservé aux grossistes pour un particulier | Accepté | Refus 400 (la caisse n'est pas concernée) |
| Quantité minimale (MOQ) | Jamais vérifiée | Vérifiée pour les grossistes uniquement |
| Quantité maximale par commande | Jamais vérifiée | Vérifiée (hors caisse) |
| Même article sur deux lignes | Stock contrôlé ligne par ligne | Quantités cumulées |
| Quantité nulle, négative ou non numérique | 201 ou 500 | Refus 400 |
| `shipping_address`, e-mail ou corps de requête mal formés | Enregistré, ou 500 | Refus 400 |
| Moyen de paiement | Texte libre | `card`, `paypal`, `cod` en ligne ; `cash` et `transfer` en plus à la caisse |
| Nom de caissier envoyé par un client | Accepté | Ignoré |
| Ventes simultanées sur les derniers articles | Survente | Verrou : la vente de trop est refusée |
| Erreur au moment de commander | Fausse confirmation, panier vidé | Message d'erreur, panier conservé |
| `init_admin` | Mot de passe par défaut, écrase le compte, l'affiche, tourne à chaque démarrage | Aucune valeur par défaut, ne touche jamais un compte existant, n'affiche rien, se lance à la main |

### Fichiers modifiés

- [backend/orders/views.py](backend/orders/views.py) et [backend/orders/serializers.py](backend/orders/serializers.py) : le checkout
- [frontend/src/pages/Checkout.jsx](frontend/src/pages/Checkout.jsx) : envoi du slug, vraie erreur
- [backend/accounts/management/commands/init_admin.py](backend/accounts/management/commands/init_admin.py) : réécrite. L'option `--password` disparaît, car un mot de passe en argument reste dans l'historique du shell.
- [backend/entrypoint.sh](backend/entrypoint.sh) et [Dockerfile](Dockerfile) : plus d'`init_admin` au démarrage
- [frontend/README.md](frontend/README.md) : identifiants retirés, nouvelle procédure
- [backend/orders/tests.py](backend/orders/tests.py) et [backend/accounts/tests.py](backend/accounts/tests.py) : 27 tests ajoutés, 1 réécrit

### Trois décisions à connaître

1. **Le MOQ ne s'applique qu'aux grossistes.** La première version de ce rapport suggérait de le vérifier pour tous. Or les 10 produits de votre base ont `moq=12` : aucun particulier n'aurait plus pu acheter à l'unité. La page produit le présente d'ailleurs comme un « MOQ grossiste ».
2. **La caisse ne peut plus imposer un prix.** Elle n'a aucun écran pour le modifier et envoyait déjà le prix du catalogue, donc rien ne change pour elle. Si vous ajoutez des remises en caisse, elles devront être calculées par le serveur.
3. **`test_checkout_reduces_stock_on_valid_sale` a été réécrit.** Il envoyait `mark_paid` sans compte et validait donc la faille elle-même. Il passe maintenant par un caissier.

### Vérifications

| Vérification | Résultat |
|---|---|
| Suite backend complète sur SQLite | 57 tests OK (30 avant correction) |
| Suite backend complète sur PostgreSQL 18 (instance jetable) | 57 tests OK |
| Nouveaux tests lancés sur l'ancien code, dans une copie | 24 sur 27 échouent, comme attendu. Les 3 autres sont des garde-fous qui doivent passer dans les deux versions |
| Attaques P01 à P05 rejouées | Bloquées : 403 ou 400, stock intact, liste admin à 200. `prix=NaN` répond 201 car le prix envoyé est ignoré et la commande part au vrai prix |
| 12 ventes simultanées pour 5 en stock, sur PostgreSQL, 3 essais | 5 acceptées, 7 refusées, stock final 0, à chaque essai |
| Même test sans le verrou (témoin) | 12 acceptées à chaque essai : la survente est réelle, et le verrou la corrige |
| `init_admin` lancée en vraie commande | Crée le compte, n'affiche pas le mot de passe, ne change rien au second passage, refuse sans e-mail ou sans mot de passe |
| Lint frontend | Aucune erreur, aucune alerte sur `Checkout.jsx` |
| Build frontend | OK |
| Mot de passe par défaut dans les fichiers du dépôt | Plus aucune occurrence |

### Non vérifié

- **Vente en caisse dans un vrai navigateur.** L'achat en boutique a été vérifié ensuite dans Chrome sur une copie de la base (section 11), mais pas l'écran de caisse. Faites une vente d'essai.
- **Démarrage Docker** : seule la syntaxe de `entrypoint.sh` est contrôlée, le démon Docker n'étant pas lancé.
- Rien n'a été modifié dans votre base locale, ni testé sur le site en ligne.

### À faire de votre côté

1. Lancez `python manage.py changepassword <e-mail de l'admin>` sur chaque environnement, base locale comprise.
2. Déployez le backend et le frontend **ensemble** : l'ancien frontend envoie encore `variant_id: index + 1`, que le nouveau serveur prendrait pour un vrai identifiant.
3. Sur une nouvelle installation, aucun admin n'est créé automatiquement : utilisez `python manage.py init_admin --email <votre e-mail>`.

---

## 11. Traduction du site

Troisième étape, à votre demande : traduire le site en français, anglais et chinois. **Rien n'est commité ni déployé.**

### Ce qui a été mis en place

| Contenu | Fonctionnement | État |
|---|---|---|
| Site client (boutique, compte, paiement, commandes) | Fichiers `frontend/src/i18n/locales/{fr,en,zh}.json`, sans appel API | Fait |
| Back-office (16 pages) | Mêmes fichiers | Fait |
| Enregistrements en base (produits, catégories, coloris, moments, collections, paliers) | Traduits à l'enregistrement, stockés dans `translations` | Fait, **sans clé** |
| Médiathèque et promotions (pas en base) | Traduits à l'enregistrement, gardés dans le navigateur | Fait |
| Noms dans les commandes, le panier, les favoris et les tableaux du back-office | Suivent la langue affichée | Fait |
| Messages du serveur, rôles, sections | `gettext`, fichiers `backend/locale/` | Fait pour le paiement, l'inscription, l'équipe |
| E-mail de mot de passe oublié | Mêmes fichiers, selon la langue du visiteur | Fait |

**Deux moteurs de traduction :**

- **Sans clé** : le service gratuit MyMemory, environ 5 000 caractères par jour. Une petite liste corrige ses erreurs connues.
- **Avec `ANTHROPIC_API_KEY`** : Claude, avec un glossaire du mariage chinois. Ce que le service gratuit a traduit est alors refait automatiquement.

Les 29 éléments actuels (26 du catalogue, 3 paliers) ont été traduits à la main, et ces traductions sont posées automatiquement au démarrage par `seed_catalog`.

### Ce qui change pour la sécurité

- **M12 est fermée** : le script Google Translate est retiré du site. Les textes de vos pages et les données clients ne partent plus chez Google par ce biais.
- **Nouveau secret** : `ANTHROPIC_API_KEY`, à mettre uniquement dans `.env`, jamais dans le code. Le dépôt étant public, une clé commitée serait compromise (voir C1).
- **Données envoyées à MyMemory ou Anthropic** : uniquement le texte du catalogue, de la médiathèque et des promotions. Aucune donnée client.
- **Routes ajoutées** : `/api/v1/admin/translations/`, `run/` et `texts/`, réservées aux employés ayant la section `catalog`. Anonyme : 401. Client et SUPPORT : 403 (testé).
- **Texte du catalogue** : traité comme une donnée à traduire, jamais comme une instruction. Une traduction qui perd une variable ou une balise est rejetée.
- **Nouvelles dépendances** : `anthropic` et `pydantic`. Les colonnes `translations` et `search_text` ne sont pas exposées par l'API publique.

### Vérifications

| Vérification | Résultat |
|---|---|
| Suite backend complète, SQLite et PostgreSQL 18 | 96 tests OK sur les deux |
| Produit et catégorie enregistrés en français dans le vrai back-office, sans clé, vrai service gratuit | Affichés en chinois côté client, sans autre action |
| Visuel saisi en français dans la médiathèque | Traduit à l'enregistrement (新娘头纱) |
| 16 pages du back-office dans Chrome, en chinois | Aucun texte français résiduel |
| Requête envoyée à Claude, via le vrai SDK avec un faux réseau | Modèle, en-tête beta, format de sortie et lecture de la réponse corrects |
| Visiteur `zh-CN` dans Chrome, 19 pages publiques et compte | Passage automatique en chinois, aucun texte français résiduel, avec l'ancien catalogue de test |
| Clic sur EN, FR, 中文 sans recharger | Interface, filtres, produits et menu suivent |
| Commande réelle via le formulaire, en chinois, sur une copie de la base | Créée à 54,00 € : le prix truqué à 0,01 € est ignoré |
| Article disparu | Erreur en chinois, panier conservé, pas de fausse confirmation |
| Recherche sur PostgreSQL | 凤冠 trouve le produit ; « Phoenix » aussi, quelle que soit la langue d'affichage |
| Exceptions JavaScript et erreurs serveur pendant les essais | 0 |
| Lint et build frontend | OK |

Les essais dans Chrome ont révélé plusieurs défauts, tous corrigés : les filtres ne suivaient pas le changement de langue, du français restait à plusieurs endroits, les erreurs du serveur arrivaient en français, et le service gratuit traduisait « couronne de mariée » par 花圈, une couronne funéraire.

### Non vérifié

- **Aucun appel réel à l'API Claude** : il n'y a pas de clé.
- **Le service gratuit fait des erreurs de sens.** Seules celles déjà repérées sont corrigées. Relisez les nouveaux produits en chinois, ou ajoutez une clé Claude.
- **Mes traductions chinoises n'ont pas été relues par un natif.** `ARCHITECTURE.md` prévoyait justement une relecture native. Une relecture des pages principales est recommandée.
- **Écran de caisse** et **Docker** : non testés dans ces conditions.

### Limites connues

- Médiathèque et promotions ne sont pas enregistrées sur le serveur : la première vit dans le navigateur de l'admin, la seconde disparaît au rechargement. Leurs traductions suivent le même sort.
- Le quota gratuit est partagé par adresse IP : au-delà, les textes restent en français et se rattrapent le lendemain, avec le bouton de la page Langues ou au prochain démarrage.
- Les messages d'erreur moins courants du serveur restent en français.
- Les adresses web restent en français (`/boutique`, `/produit/…`).
- Les prix restent en euros.
- Les deux messages techniques du bouton Google restent en français : ils ne s'affichent qu'en cas d'erreur de configuration.

### Autres changements à connaître

- **Page Langues du back-office** : réécrite. Elle affiche maintenant l'avancement réel, à la place des 100 % écrits en dur. L'espagnol, l'allemand, l'ajout de langue et les boutons « publier » disparaissent : ils ne fonctionnaient qu'avec le widget Google ou dans le navigateur de l'admin.
- **« ET » parasites** : corrigés dans `en.json` et `zh.json` (ils venaient d'un ancien remplacement global).
- **Recherche** : le filtre refait dans le navigateur sur `Category.jsx` est retiré, il masquait les résultats traduits.
- **CI** : les tests de `catalog` sont maintenant lancés.
- **Base locale** : migrations `catalog.0004` et `pricing.0002` appliquées, et traductions relues posées. Elles ajoutent des colonnes, et `migrate catalog 0003` puis `migrate pricing 0001` les annulent.
- **Démarrage du serveur** : `entrypoint.sh` lance maintenant `translate_catalog` pour rattraper ce qui manque.

---

## 12. Test de charge

Quatrième étape, à votre demande : mesurer combien d'utilisateurs le site supporte. **Aucun code du projet n'a été modifié, et le site en ligne n'a pas été testé.**

### Conditions

- **Copie jetable** reproduisant le `Dockerfile` : Gunicorn avec 3 workers, `backend.settings.prod`, PostgreSQL 18, frontend compilé servi par WhiteNoise.
- **Serveur simulé** : 2 cœurs physiques (4 threads) d'un Intel i5-8265U de portable, partagés avec les autres applications de la machine. Le générateur de charge (Locust) tournait sur les 2 autres cœurs et n'a jamais dépassé 40 % d'un cœur : il n'a pas limité la mesure.
- **Visiteur simulé** : 5 à 15 s de lecture entre deux actions. Accueil, boutique, fiche produit, recherche, commande (3 %), connexion (2 %), nouvelle visite avec téléchargement du JS et du CSS (5 %). Langues : 50 % chinois, 30 % français, 20 % anglais.
- **Sans réseau ni HTTPS** : le test se fait sur la machine elle-même.

### Résultats, configuration actuelle (10 produits)

« p95 » : 95 % des requêtes répondent en moins de ce temps. Là où il y a deux valeurs, elles viennent de plusieurs passages.

| Visiteurs simultanés | Requêtes/s | Médiane | p95 | Erreurs | Verdict |
|---|---|---|---|---|---|
| 50 | 12 | 22 ms | 44 ms | 0 | Très fluide |
| 100 | 24 | 23 à 42 ms | 50 à 170 ms | 0 | Fluide |
| 150 | 40 | 160 à 570 ms | 1,2 à 2,7 s | 0 | Ralentit |
| 200 | 43 à 56 | 61 ms à 1,9 s | 1,1 à 4 s | 0 | Limite |
| 300 | 48 | 4,2 s | 7,3 s | 0 | Saturé |
| 400 | 62 | 4,8 s | 11 s | 0 | Très lent, mais ne tombe pas |

### Essais sur la copie

| Essai | Résultat |
|---|---|
| 5 workers et connexions PostgreSQL réutilisées | 74 requêtes/s (environ +50 %) ; à 300 visiteurs, p95 de 3 s |
| Même chose, plus un cache de 60 s sur les pages publiques | 300 visiteurs : p95 de 230 ms. 500 : 1,6 s. 800 : 5,5 s. 180 requêtes/s |
| Catalogue de 300 produits, configuration actuelle | 100 visiteurs : p95 de 1,6 s, contre 170 ms avec 10 produits |
| Sans aucune connexion, configuration actuelle | 150 visiteurs : p95 de 0,94 s. 200 : 2 s. 300 : 4,2 s |
| 6 mauvais mots de passe en parallèle | Une requête normale a attendu 8,5 s (échantillon de 6 requêtes) |
| 12 mauvais mots de passe en parallèle | Une requête normale a attendu 17,6 s (échantillon de 6 requêtes) |

### Ce qui limite le site

1. **Le processeur, avec 3 workers.** Il sature autour de 45 à 60 requêtes/s. Aucune réponse du catalogue n'est mise en cache.
2. **Les requêtes SQL répétées.** La boutique fait 15 requêtes SQL pour 10 produits, et 55 pour 50 produits (29 ms puis 192 ms) : la catégorie de chaque produit est lue une par une. Correctif : `select_related("category")` dans `public_product_queryset`.
3. **La connexion coûte très cher.** 1 000 000 d'itérations PBKDF2 : 1,15 s pour un bon mot de passe.
4. **Un mauvais mot de passe coûte le double** (2,32 s), car `ModelBackend` et le backend d'allauth le vérifient tous les deux. Un compte inexistant aussi (2,29 s). Sans limite de tentatives (E4), quelques requêtes suffisent à ralentir tout le site : **E4 est aussi un risque de panne, pas seulement de vol de compte.**
5. **Le JavaScript n'est pas compressé** dans le déploiement Docker sans nginx : `collectstatic` ne compresse pas les fichiers copiés directement dans `staticfiles/`. 637 Ko à télécharger, dont environ 140 Ko ajoutés par les traductions, car les trois langues sont toutes dans le fichier. Un CDN peut le compenser.
6. **Workers synchrones sans nginx** (Lu, non mesuré) : si Gunicorn est exposé directement, un client lent occupe un worker pendant tout son téléchargement.

### Par ordre d'intérêt

1. Limiter les tentatives de connexion (E4) et supprimer la double vérification.
2. Ajouter `select_related("category")` : une ligne.
3. Mettre en cache le catalogue public. **Attention :** les prix de gros dépendent du compte, le cache ne doit servir que les visiteurs anonymes. Avec plusieurs workers, il faut un cache partagé (Redis est déjà dans `docker-compose.yml`, mais inutilisé).
4. Passer à 5 workers et réutiliser les connexions PostgreSQL (`CONN_MAX_AGE`).
5. Compresser le JS et charger seulement la langue utilisée.

### Limites de cette mesure

- Les chiffres valent pour cette machine, pas pour votre serveur, dont je ne connais pas la puissance.
- La machine était occupée par d'autres applications, d'où les écarts entre deux passages.
- Sans réseau ni HTTPS, un vrai visiteur sera plus lent, et un CDN pourrait au contraire soulager le serveur.
- Le paiement réel, les images produits et le back-office n'étaient pas dans le scénario.
- Les essais de mauvais mots de passe reposent sur très peu d'échantillons : c'est un ordre de grandeur.
- Tout a été démonté ensuite. Le test n'a pas utilisé votre base locale.

---

## 13. Load balancing

Cinquième étape, à votre demande. **Rien n'est commité ni déployé.**

### Constat

Le projet contenait déjà un load balancer : nginx et `--scale backend=3` dans `docker-compose.yml`. Il ne pouvait pas fonctionner, pour deux raisons prouvées sur le code d'origine :

- `entrypoint.sh` ignorait la commande reçue. Le service `migrate` lançait Gunicorn sur le port 5000 et ne se terminait jamais, donc `backend` ne démarrait pas, et nginx visait le port 8000. Chaque réplica aurait aussi relancé `seed_catalog`.
- Le frontend se compilait avec la base `/static/`, que nginx envoie au backend : page blanche.

La production ne l'utilise pas : elle tourne sur l'image unique `hugueswilson/ecommerce`, en `arm64`, sans nginx.

### Modifications

- [backend/entrypoint.sh](backend/entrypoint.sh) : avec une commande, le conteneur n'exécute que celle-ci. Sans commande (votre image de production), le démarrage complet ne change pas.
- [frontend/Dockerfile](frontend/Dockerfile) : compilation avec `--base=/`.
- [docker-compose.yml](docker-compose.yml) : commentaire sur `seed_catalog`.

### Vérifications

Dans de vrais conteneurs Docker, sur une copie, avec les commandes `docker` équivalentes à Compose. Le binaire officiel de Compose n'a pas pu être utilisé, et `docker-compose` du snap ne lit pas le dossier temporaire. Seule la validité du fichier a été contrôlée avec lui.

| Vérification | Résultat |
|---|---|
| Service `migrate` | Se termine (code 0), sans recharger le catalogue |
| 3 réplicas | Tous sains (`/health/` à 200) |
| Pages à travers nginx | Accueil, JS, CSS, API, admin Django, routes SPA : 200 |
| Répartition de 300 requêtes | 105 / 105 / 90 |
| Connexion puis requêtes sur les autres réplicas | 30 réponses sur 30, sur 3 réplicas |
| Un réplica arrêté en pleine charge | 433 réponses sur 433, aucune erreur ; pire attente 3,1 s |

### Capacité sur une seule machine

Même requête, 24 clients, sur l'ordinateur de test (8 threads, partagés avec le reste) :

| Configuration | Débit |
|---|---|
| 1 réplica, 3 workers | 37 requêtes/s |
| 1 réplica, 9 workers | 46 requêtes/s |
| 3 réplicas, 3 workers | 56 requêtes/s |

Sur un seul serveur, le gain est d'environ 50 %, pas de 3 fois, car le processeur est partagé. Le principal bénéfice est de rester en ligne si un réplica tombe. Pour multiplier la capacité, il faut plusieurs serveurs.

### Conditions pour plusieurs serveurs

- **PostgreSQL partagé** : SQLite est impossible avec plusieurs réplicas.
- **Photos dans un bucket** : `USE_S3=True`, déjà prévu dans le code.
- **Redis** comme cache partagé, s'il est ajouté, et pour les futures limites de tentatives.
- **Migrations une seule fois**, jamais à chaque réplica.
- **`seed_catalog`** à corriger : il remet stock et prix à zéro.

### Limites

- Le test a porté sur une seule requête, sur une machine occupée : les débits sont des ordres de grandeur.
- `docker compose up` lui-même n'a pas été lancé.
- Le cache de construction Docker garde quelques centaines de Mo de ce test (`docker builder prune` le libère).
- Sur cet ordinateur, `docker rm -f` échoue avec `permission denied` : le test a arrêté ses conteneurs de l'intérieur.

---

## 14. Paiement et logistique : analyse et plan

Sixième étape, à votre demande : analyser l'existant et proposer comment mettre en place le système décrit dans votre texte. **Analyse seulement, aucun code modifié.** Les tarifs des prestataires cités dans votre texte n'ont pas été vérifiés.

### Ce qui existe : paiement

| Élément | État |
|---|---|
| Paiement à la livraison | Fonctionne : la commande reste « en attente » et le livreur encaisse |
| Carte bancaire | Formulaire factice : le numéro saisi est ignoré, rien n'est débité |
| PayPal | Affiché, mais rien derrière |
| Stripe côté serveur | Code mort : paquet non installé, aucune clé. Le webhook répond « succès » sans rien vérifier |
| Virement (T/T) | Seulement à la caisse, pas pour un grossiste en ligne |
| Devis B2B | Un montant est chiffré, mais aucun moyen de le payer |
| Devises | Euro seulement. La devise préférée du client (EUR, USD, CNY) est enregistrée mais jamais utilisée |
| Remboursement | Le statut « remboursée » remet le stock, mais ne rembourse rien |
| E-mails de commande | Aucun |

### Ce qui existe : logistique

| Élément | État |
|---|---|
| Modes de livraison | 3, écrits en dur dans le navigateur : standard 6,90 € (offert dès 150 €), express 12,90 €, retrait à Paris |
| Frais de port | Affichés au client, jamais enregistrés : la commande les met à 0 |
| Pays de livraison | 4, écrits en dur : France, Belgique, Suisse, Canada |
| Poids | `weight_grams` existe sur chaque déclinaison, mais ne sert à rien |
| Transporteur et numéro de suivi | Inexistants |
| Données de douane | Inexistantes : pas de code SH, d'origine ni de valeur déclarée |
| Livraison locale | Livreurs internes avec code PIN : utile pour Paris |
| Stock | Un seul emplacement |

### Architecture proposée

Comme le recommande votre texte, deux chaînes séparées.

**Paiement**

1. **Page de paiement hébergée par le prestataire** (Stripe Checkout, ou page hébergée d'Airwallex). Le numéro de carte ne passe jamais par votre site. 3-D Secure, Apple Pay et Google Pay sont inclus. Les moyens locaux (iDEAL, Bancontact, SEPA, Klarna…) s'activent dans le tableau de bord du prestataire, sans code par moyen.
2. **Le prestataire confirme, pas le navigateur.** La commande est créée « en attente », avec prix et frais calculés par le serveur. Le client paie chez le prestataire, puis seul le webhook signé passe la commande en « payée », retire le stock et envoie l'e-mail. La page de retour affiche le statut réel.
3. **Un modèle `Payment`** (commande, prestataire, référence, montant, devise, statut, événement traité) pour gérer plusieurs tentatives, les remboursements et les doublons.
4. **Une interface commune par prestataire** (créer la session, vérifier le webhook, rembourser). Ajouter PayPal ou changer de prestataire revient alors à ajouter un fichier.
5. **Contrôles** : le montant et la devise reçus doivent correspondre à la commande. Un événement déjà traité est ignoré. Le stock est revérifié au paiement. Le remboursement se lance depuis le back-office.
6. **Virement pour les grossistes** : statut « en attente de virement », IBAN et référence affichés, validation par un employé à réception. Un devis accepté donne un lien de paiement.
7. **Hors du code** : la centralisation des encaissements (WorldFirst, PingPong…) se règle chez le prestataire et la banque.

**Logistique**

1. **Une grille tarifaire en base** (`ShippingMethod`) : nom traduisible, pays, tranches de poids, plafond de valeur, seuil de gratuité, délai, transporteur, assurance. Elle reprend la règle de votre texte : moins de 1 kg en colis postal, de 1 à 5 kg en ligne dédiée, forte valeur en express assuré.
2. **Le serveur calcule les frais** à partir du poids (somme de `weight_grams` × quantité) et les enregistre avec le mode choisi. Le navigateur n'affiche que ce que le serveur propose, ce qui corrige l'écart actuel.
3. **Un modèle `Shipment`** : transporteur, numéro de suivi, lien, dates. Il est saisi au passage en « expédiée », visible par le client et envoyé par e-mail. Les numéros de suivi servent aussi contre les rétrofacturations.
4. **La douane** : code SH, pays d'origine et description anglaise sur le produit. La valeur déclarée vient de la commande, pour les formulaires CN22 et CN23.
5. **Les pays** viennent des zones de la grille, plus de liste en dur.
6. **Plus tard** : étiquettes via l'API d'un agrégateur, stock par entrepôt, suivi automatique.
7. **La livraison locale avec code PIN** est conservée, comme un mode « Livraison locale Paris ».

### Ordre de travail

Les durées sont des estimations pour un développeur, tests compris.

| Étape | Contenu | Durée |
|---|---|---|
| 0. Prérequis | Secrets C1 à C3, image publique C6, HTTPS (E8), limite de tentatives (E4), bug de `seed_catalog` | 1 à 2 jours, en partie de votre côté |
| 1. Bases | Frais de port côté serveur, vraie page de confirmation, retrait du faux formulaire de carte | 1 à 2 jours |
| 2. Paiement | Un prestataire : session, webhook, `Payment`, remboursements, e-mails | 3 à 5 jours |
| 3. B2B | Virement pour les grossistes et paiement des devis | 1 à 2 jours |
| 4. Logistique | Grille par poids et par zone, suivi, données de douane | 3 à 4 jours |
| 5. Plus tard | Second prestataire, multi-devise, étiquettes, entrepôts | Selon les besoins |

Pour les e-mails de commande, Gmail est limité à environ 500 envois par jour : un service comme Brevo est préférable en production.

### Décisions qui vous reviennent

1. Le pays d'enregistrement de l'entreprise, qui fixe le prestataire de paiement.
2. D'où partent les colis : Paris, la Chine, ou les deux.
3. Où sont vos clients.
4. Les transporteurs que vous utilisez déjà.

---

## 15. Étape 1 : frais de port calculés par le serveur

Septième étape : la première du plan de la section 14. Elle ne dépend d'aucun prestataire. **Rien n'est commité ni déployé.**

### Vos réponses

| Question | Réponse |
|---|---|
| Pays de l'entreprise | La Chine, avec une activité internationale |
| Origine des colis | « Partout dans le monde » : à préciser, voir plus bas |
| Clients | Partout dans le monde |
| Transporteurs | Pas encore répondu |

Une entreprise chinoise ne peut pas ouvrir de compte Stripe sans société à Hong Kong, à Singapour ou aux États-Unis. Pour l'étape 2, je recommande donc **Airwallex**, qui accepte les entreprises de Chine continentale (cartes, Apple Pay, Alipay, WeChat Pay, moyens locaux), avec **PayPal** en complément.

### Ce qui change pour le client

| Avant | Maintenant |
|---|---|
| Frais de port calculés par le navigateur, et enregistrés à 0 € | Calculés et enregistrés par le serveur |
| Une commande de 100 € annonçait 106,90 €, la base gardait 100 € | La base garde 106,90 € |
| 4 pays écrits en dur | Pays lus dans la grille, noms affichés dans la langue du visiteur |
| Formulaire de carte factice : rien n'était débité | Retiré, comme PayPal : seul le paiement à la livraison ou au retrait reste |
| Retrait en boutique obligeait à choisir la « carte » | Paiement au retrait |
| Confirmation factice : référence `CMD-2026-00042` pour tout le monde, e-mail annoncé jamais envoyé, « total payé » faux | Référence, articles, port et total réels de la commande, montant à régler à la remise |
| Panier : port estimé dans le navigateur | « Calculée à la commande » |
| « Résumé de la commande », garantie et mention SSL en français seulement | Traduits en anglais et en chinois |
| Montants affichés « 6,9 € » | « 6,90 € » (un montant rond reste « 66 € ») |

Vos tarifs sont repris à l'identique : standard 6,90 € offert dès 150 €, express 12,90 €, retrait gratuit à Paris. **Aucun prix n'a été inventé pour d'autres pays.**

### Modifications

**Nouvelle application [backend/shipping/](backend/shipping/)**

- `ShippingZone` : un nom traduisible et une liste de codes pays ISO.
- `ShippingMethod` :
  - code, nom et délai traduisibles, zones, prix, seuil de gratuité ;
  - poids minimum et maximum, valeur maximum du panier (par exemple un colis postal limité à 1 kg et 100 €) ;
  - paiement à la livraison autorisé ou non, retrait, transporteur, actif, ordre d'affichage.
- La migration `0002` crée les trois modes actuels, avec leurs traductions relues en anglais et en chinois. Elle ne touche pas une grille existante.
- `GET /api/v1/shipping/countries/` : pays desservis.
- `POST /api/v1/shipping/options/` : modes et frais pour un pays et un panier. Prix et poids viennent de la base, avec le prix pro pour un grossiste connecté.
- La grille se gère dans `/admin/` (Livraison). Elle apparaît aussi dans la page **Langues** du back-office.

**Commande** ([backend/orders/views.py](backend/orders/views.py))

- Le serveur additionne le poids (`weight_grams` × quantité), puis vérifie que le mode choisi est bien proposé pour ce pays, ce poids et ce montant. Il calcule ensuite les frais et les ajoute au total.
- Le pays est enregistré en code ISO, avec le mode et le transporteur.
- Refus traduits, sans rien enregistrer :
  - pays invalide ou non desservi ;
  - mode inconnu, inactif ou hors limites ;
  - paiement à la livraison refusé par le mode.
- En ligne, seul `cod` est accepté. La caisse garde carte, espèces, virement et PayPal, sans frais de port.

**Front**

- [Checkout.jsx](frontend/src/pages/Checkout.jsx) : pays et modes viennent du serveur, et sont recalculés quand le pays, le panier ou la langue changent. Le bouton reste bloqué tant qu'aucun mode valable n'est choisi.
- [OrderConfirmation.jsx](frontend/src/pages/OrderConfirmation.jsx) : affiche la commande renvoyée par le serveur. Ouverte sans commande, la page le dit au lieu d'inventer.
- [cart.jsx](frontend/src/data/cart.jsx) : `cartTotals` ne calcule plus de port ; `eur()` affiche les centimes.
- [Cart.jsx](frontend/src/pages/Cart.jsx), [AccountCart.jsx](frontend/src/pages/account/AccountCart.jsx), [Shop.jsx](frontend/src/pages/account/Shop.jsx) : « Total hors livraison ».
- Langues :
  - 19 clés ajoutées en français, anglais et chinois ;
  - 15 clés devenues inutiles retirées (formulaire de carte, pays en dur, anciens libellés de livraison) ;
  - 3 messages serveur ajoutés aux `.po`, `.mo` recompilés.

### Ce qui change pour la sécurité

- Le montant enregistré ne dépend plus du navigateur, port compris. Un `shipping_cost` ou un `total_amount` envoyé par le client est ignoré (test dédié).
- La page ne réclame plus de numéro de carte. Elle en demandait un sans le transmettre, ce qui ressemblait à un formulaire d'hameçonnage et laissait croire au client qu'il avait payé.
- `/shipping/options/` est public, comme le checkout. Il accepte au plus 100 lignes et ne lit que des articles actifs. Sans limite de débit (E4), il peut servir à charger la base, comme les autres pages publiques.

### Vérifications

| Vérification | Résultat |
|---|---|
| Tests SQLite | 111 sur 111 (96 avant, 15 ajoutés) |
| Tests PostgreSQL 18 | 111 sur 111 |
| `npm run lint` et `vite build` | Aucune erreur, aucun avertissement dans les fichiers modifiés |
| Chrome, client connecté, copie de la base, éventail à 66 € | France : 3 modes, 6,90 € de port, total 72,90 € |
| Même panier, Canada | 2 modes : le retrait disparaît |
| Commande express vers le Canada | Base : sous-total 66,00, port 12,90, total 78,90, pays `CA`, mode `express`, paiement `cod` |
| Page de confirmation | Référence réelle, port 12,90 €, « Vous réglerez 78,90 € à la livraison » ; panier vidé |
| Confirmation ouverte sans commande | Message « Aucune commande à afficher » |
| Checkout en chinois | 比利时, 法国, 加拿大, 瑞士 ; 标准配送, 快速配送, 门店自取 |
| Erreurs JavaScript et erreurs 500 | Aucune |

Tests ajoutés : seuil de gratuité, express, retrait réservé à la France, code pays normalisé, pays non desservi ou mal formé, mode inconnu ou désactivé, paiement à la livraison interdit par le mode, carte et PayPal refusés en ligne, limites de poids et de valeur, devis identique à la commande, traduction des modes, requêtes mal formées.

### Limites et points à connaître

- **Le paiement à la livraison est le seul moyen en ligne** jusqu'à l'étape 2. Pour un colis parti de Chine vers le Canada, ce n'est pas réaliste. Désactivez-le par mode dans `/admin/` si besoin : le client voit alors que ce mode ne peut pas encore être réglé sur le site.
- **Les poids du catalogue de démonstration valent tous 80 g.** Les tranches de poids n'ont de sens qu'avec les vrais poids.
- Un employé ayant la section « Commandes » est traité comme la caisse, même depuis la boutique : sa commande n'a pas de frais de port. Ce comportement existait déjà pour les moyens de paiement.
- Les lignes du récapitulatif utilisent le prix du panier, mais le sous-total et le total viennent du serveur. Pour un grossiste, les lignes peuvent donc différer du total jusqu'au rechargement du panier.
- Recharger la page de confirmation garde la commande affichée (historique du navigateur). C'est voulu.
- L'adresse de retrait (12 rue de la Paix, Paris) reste écrite dans le front.
- Le code Stripe mort et son webhook, qui répond « succès » sans vérifier, sont toujours là : ils seront remplacés à l'étape 2.
- Tout reste en euros.

### Pour ajouter un pays ou un tarif

Dans `/admin/` → Livraison :

1. Créez une zone : un nom, et les codes pays, par exemple `["US", "GB", "DE"]`.
2. Créez un ou plusieurs modes pour cette zone, avec prix, seuil de gratuité, poids maximum, valeur maximum et transporteur.

Le nom et le délai sont traduits automatiquement, comme les produits. Le checkout propose le nouveau pays sans autre modification.

### Questions encore ouvertes

1. **Origine des colis** : vous avez répondu « partout dans le monde ». Est-ce que tout part de Chine ? Ou avez-vous aussi du stock à Paris ou ailleurs ?
2. **Transporteurs** : lesquels utilisez-vous (China Post, YunExpress, 4PX, DHL, La Poste…) ?
3. **Tarifs des autres pays** : par zone, et par tranche de poids si possible.
4. **Étape 2** : ouvrir un compte Airwallex (et PayPal Business) et me donner les clés de test (sandbox), jamais les clés de production.

---

## 16. Étape 2 : paiement en ligne avec Airwallex

Huitième étape, à votre demande. **Rien n'est commité ni déployé. Aucun appel au vrai Airwallex n'a été fait** : sans vos clés, tout a été testé contre un faux serveur qui imite la documentation officielle.

### Choix techniques

- **Airwallex**, parce que votre entreprise est en Chine (voir section 15).
- **PaymentIntent puis page de paiement hébergée**, plutôt que la « Checkout Session » d'Airwallex. Celle-ci est encore en bêta. Elle exige la version d'API 2026-05-29 et des objets « Price » créés chez Airwallex pour chaque montant.
- **Aucun numéro de carte ne passe par le site.** Le client saisit sa carte chez Airwallex, qui gère aussi 3-D Secure, Apple Pay, Google Pay, Alipay et WeChat Pay.
- **Sources**, consultées le 10 novembre 2026 :
  - [création d'un PaymentIntent](https://www.airwallex.com/docs/api/payments/payment_intents/create.md) ;
  - [remboursements](https://www.airwallex.com/docs/api/payments/refunds/create.md) ;
  - [webhooks et signature](https://www.airwallex.com/docs/developer-tools/webhooks/listen-for-webhook-events.md) ;
  - [page hébergée](https://www.airwallex.com/docs/js/payments/hosted-payment-page.md) ;
  - [démarrage rapide](https://www.airwallex.com/docs/payments/get-started/quickstart.md).

### Le circuit

1. **Commande.** Le checkout crée la commande « en attente », avec prix et frais de port calculés par le serveur. Il remet au client un jeton secret aléatoire de 256 bits, propre à la commande.
2. **Démarrage.** Avec la référence et ce jeton, le serveur crée un PaymentIntent :
   - montant et devise viennent de la commande ;
   - chaque tentative a sa propre clé d'idempotence (`request_id`) ;
   - le serveur vérifie que le montant enregistré par Airwallex est bien le sien, et que le stock couvre encore la commande.
3. **Redirection.** Le navigateur charge le kit officiel `@airwallex/components-sdk` (version 1.36.0, fixée, téléchargée seulement au moment de payer), qui redirige vers la page hébergée.
4. **Confirmation.** Seul un webhook signé fait passer la commande en « payée ». Il faut aussi que le montant et la devise correspondent. Le stock est alors retiré, et l'e-mail de confirmation part.
5. **Retour du client.** La page de retour interroge le serveur, qui relit l'état chez Airwallex. L'adresse de retour ne prouve rien.
   - Si le client a abandonné, il peut reprendre le paiement.
   - Si la banque n'a pas encore tranché, la reprise n'est pas proposée, pour éviter un double débit.
6. **Remboursement.** Depuis la fiche commande du back-office, total ou partiel, sur le moyen de paiement d'origine.

### Ce qui protège l'argent et le stock

| Risque | Protection |
|---|---|
| Faux « paiement réussi » | Webhook rejeté sans signature HMAC-SHA256 valide (`x-timestamp` + corps brut) ; webhook désactivé si Airwallex n'est pas configuré |
| Événement rejoué ou en double | Chaque événement n'est traité qu'une fois (contrainte unique). Un événement en retard ne défait jamais un paiement réussi |
| Mauvais montant encaissé | Paiement marqué « montant incohérent », commande non validée, alerte dans le back-office |
| Paiement après annulation, ou deux paiements pour une commande | Commande inchangée, alerte « à rembourser » dans le back-office |
| Webhook perdu | La page de retour relit le PaymentIntent chez Airwallex |
| Accès à la commande d'un autre | Jeton secret comparé en temps constant ; référence seule refusée |
| Remboursement abusif | Réservé aux administrateurs et responsables boutique ; plafonné au montant payé, y compris pour deux demandes simultanées |
| Remboursement refusé par Airwallex | Non compté, rien ne change |
| Panne d'e-mail | Journalisée, la commande n'est jamais annulée |
| Clés exposées | Aucune clé n'est envoyée au navigateur ni écrite dans les journaux |

### Corrigé au passage

- **E1 corrigée.** L'ancien code Stripe mort est supprimé, ainsi que son webhook, qui répondait « succès » sans rien vérifier. `/api/v1/webhooks/stripe/` renvoie maintenant 404.
- **M5 corrigée.** Le retrait du stock au passage en « payée » verrouille les déclinaisons. Preuve sur PostgreSQL avec deux paiements simultanés de 3 pièces sur un stock de 10 :
  - sans verrou, le stock finit à 7 : un retrait est perdu ;
  - avec verrou, il finit à 4.
- **Stock gonflé à l'annulation.** Annuler une commande « en attente » rendait au stock des pièces qui n'en étaient jamais sorties, car le stock n'est retiré qu'au paiement. C'est corrigé et testé.
- **Montants modifiables par les employés.** Tout employé ayant la section « Commandes » pouvait réécrire par l'API le total, le sous-total, le moyen de paiement ou l'e-mail d'une commande. L'interface ne s'en servait pas.
  - Ces champs sont maintenant en lecture seule.
  - Les frais de port ne changent plus que pour un paiement à la livraison, et le total suit alors.
- **Suppression bloquée.** Une commande liée à un paiement en ligne ne peut plus être supprimée.
- **E-mail de confirmation.** Il part pour chaque commande en ligne, dans la langue du client : à la commande pour le paiement à la livraison, au paiement pour Airwallex.
- **README.** À l'étape 1, mon ajout de la section « Livraison » avait effacé le titre « Load balancing » : il est rétabli.

### Fichiers

- **Nouvelle application [backend/payments/](backend/payments/)** :
  - modèles `Payment`, `Refund` et `WebhookEvent` ;
  - interface commune des prestataires dans [providers/base.py](backend/payments/providers/base.py), et Airwallex dans [providers/airwallex.py](backend/payments/providers/airwallex.py). Ajouter PayPal reviendra à écrire un fichier de plus ;
  - règles dans [services.py](backend/payments/services.py), e-mail dans [emails.py](backend/payments/emails.py), API dans [views.py](backend/payments/views.py), 28 tests.
- **Commandes** :
  - champs `public_token` et `language` ;
  - suppression de `stripe_payment_intent_id`, migration `0005` ;
  - montants en lecture seule ;
  - paiements et alertes visibles dans l'API.
- **Réglages** : `AIRWALLEX_CLIENT_ID`, `AIRWALLEX_API_KEY`, `AIRWALLEX_WEBHOOK_SECRET`, `AIRWALLEX_ENV`, `AIRWALLEX_API_BASE`. Documentés dans `.env.example`, `docker-compose.yml` et le README.
- **Front** :
  - choix du paiement dans [Checkout.jsx](frontend/src/pages/Checkout.jsx) ;
  - nouvelle page [PaymentReturn.jsx](frontend/src/pages/PaymentReturn.jsx) (`/commande/paiement`) ;
  - [lib/payment.js](frontend/src/lib/payment.js) et le récapitulatif partagé [OrderSummary.jsx](frontend/src/components/OrderSummary.jsx) ;
  - paiements, alertes et bouton « Rembourser… » dans la fiche commande du back-office ;
  - libellés dans « Mes commandes » et la caisse.
- **Traductions** : 21 messages serveur et 40 textes d'interface, en anglais et en chinois.

### Vérifications

| Vérification | Résultat |
|---|---|
| Tests SQLite | 140 réussis, 1 ignoré (le test de concurrence, propre à PostgreSQL) |
| Tests PostgreSQL 18 | 141 réussis |
| `npm run lint` et `vite build` | Aucune erreur ; le kit Airwallex est dans un fichier à part, chargé à la demande |
| Chrome, client connecté, éventail à 66 € | Choix « Paiement en ligne sécurisé » ou « À la livraison » ; bouton « Payer 72,90 € » |
| Redirection | Le vrai kit Airwallex redirige vers `https://checkout.sandbox.airwallex.com/` (interceptée pendant l'essai) |
| PaymentIntent reçu par le faux Airwallex | 72,9 EUR, référence de la commande, adresse de retour avec jeton |
| Retour sans payer | « Paiement non effectué » ; « Reprendre le paiement » crée une 2e tentative avec une autre clé d'idempotence |
| Webhook signé, puis retour | « Paiement reçu, merci ! », « Total payé 72,90 € » ; base : commande `PAID`, stock 47 → 46, webhook enregistré une fois |
| E-mail | Envoyé en français, avec articles, port et total |
| Remboursement de 10 € depuis le back-office | Montant, motif et confirmation demandés ; Airwallex reçoit 10 € sur le bon PaymentIntent ; statut « Remboursé en partie » |
| Exceptions JavaScript, erreurs 500 | Aucune |

Pendant l'essai, le navigateur a contacté Airwallex pour télécharger son kit. Ses requêtes de mesure d'audience (`o11y.airwallex.com`) ont été bloquées, et la page hébergée n'a jamais été chargée : aucune donnée n'a été envoyée à Airwallex.

### Limites

- **Jamais testé contre le vrai Airwallex.** Les chemins, champs et signatures suivent la documentation, mais seuls vos essais en sandbox le confirmeront.
- **Points que la documentation ne précise pas :**
  - l'adresse de l'API de production : `https://api.airwallex.com` par défaut, à vérifier dans votre tableau de bord ;
  - l'unité des montants : des euros (72.9), d'après les exemples ;
  - la prise en compte de `cancelUrl` par la page hébergée.
- **Pas de fenêtre de validité sur l'horodatage des webhooks**, car Airwallex n'en indique pas. Un webhook rejoué est sans effet, puisque chaque événement n'est traité qu'une fois et que rien ne revient en arrière.
- **Jeton dans les journaux.** Le jeton de commande figure dans l'adresse de retour, donc dans les journaux du serveur. Il ne donne accès qu'au statut et au paiement de cette commande.
- **Commandes abandonnées.** Elles restent « en attente » sans retirer de stock. Les tentatives abandonnées restent « En attente du client ».
- **E-mail envoyé pendant la requête.** Un serveur SMTP lent ralentit la confirmation.
- **Euro seulement.** Airwallex convertit pour le client étranger, mais le site ne gère pas d'autre devise.
- **Restitution du stock au remboursement.** Le stock n'est rendu que si la commande n'est pas encore expédiée. Pour un colis renvoyé, passez par la gestion du stock.
- **Kit téléchargé chez Airwallex.** Au moment de payer, le navigateur charge du code depuis `checkout.airwallex.com` et `static.airwallex.com`. Si vous ajoutez un jour une politique CSP, autorisez ces domaines.
- **Remboursement par boîtes de dialogue** du navigateur : fonctionnel, mais simple.

### Ce qu'il vous reste à faire

1. **Ouvrir un compte Airwallex** (entreprise de Chine continentale), puis activer les moyens de paiement voulus.
2. **Sandbox.** Créer des clés de test et un webhook vers `https://ecommerce.ginolux.com/api/v1/webhooks/airwallex/`. Événements :
   - `payment_intent.succeeded`, `payment_intent.cancelled` ;
   - `refund.accepted`, `refund.settled`, `refund.failed`.
3. **Configurer le serveur.** Mettre les trois valeurs et `AIRWALLEX_ENV=sandbox` dans l'environnement du serveur, sans jamais les commiter. Appliquer les migrations.
4. **Essayer** quelques paiements et un remboursement avec les cartes de test d'Airwallex.
5. **Passer en production.** Clés de production, nouveau webhook, `AIRWALLEX_ENV=prod`, et vérification de l'adresse de l'API.

---

## 17. Étape 3 : virement bancaire (B2B) et paiement des devis

Neuvième étape, à votre demande. **Rien n'est commité ni déployé.** Aucune vraie coordonnée bancaire n'a été utilisée : les essais ont tourné avec un compte fictif.

### Constat de départ

- **Pas de parcours devis.** Un modèle `QuoteRequest` existait, mais sans écran : le client ne pouvait pas demander de devis sur des produits, l'équipe ne pouvait pas en chiffrer, et un devis chiffré ne pouvait pas être payé.
- **Formulaire « Espace pro » sans effet.** Il envoyait une demande sans e-mail, que le serveur refusait (400), mais affichait quand même « Demande transmise avec succès ». Toutes les demandes d'ouverture de compte grossiste étaient perdues. Prouvé : 400, aucune ligne en base.
- **MOQ appliqué à tort.** Les demandes de devis imposaient le MOQ à tout le monde, alors qu'il ne vaut que pour les grossistes validés.
- **Totaux modifiables.** Un employé B2B pouvait écrire n'importe quel total de devis, sans lien avec les lignes.
- **Année figée.** Les références de commande portaient l'année 2026 en dur.

### Le virement (T/T)

1. **Disponibilité.** Proposé au panier aux grossistes validés, et pour tout devis accepté, à condition que titulaire, numéro de compte et BIC soient configurés.
2. **Commande.** Après validation, la page et l'e-mail affichent les coordonnées, la référence à indiquer, le montant et la date limite. Les articles sont réservés (sortis du stock) pendant `BANK_TRANSFER_DAYS` jours, 7 par défaut.
3. **Réception.** Dans la fiche commande, **Virement reçu…** : montant reçu et référence bancaire. Réservé aux administrateurs et responsables boutique.
   - Plusieurs virements partiels s'additionnent.
   - Un manque, par exemple des frais bancaires, peut être accepté explicitement : il est noté.
   - Une même référence bancaire ne peut pas être saisie deux fois.
4. **Échéance.** `python manage.py expire_transfers` annule les commandes non réglées à l'échéance et rend le stock. Une commande ayant reçu un virement partiel est laissée à un humain.

### Le devis

1. **Demande.** Le client, connecté ou non, clique sur **Demander un devis pour ce panier**. Les articles du panier sont repris tels quels, et le panier n'est pas vidé.
2. **Chiffrage.** Dans **Devis** du back-office (section B2B), l'équipe saisit un prix par ligne, le port et la date de validité. Elle voit le stock, le prix de détail et le prix de gros. Le serveur calcule le total et envoie au client un e-mail avec un lien secret.
3. **Acceptation.** Le lien ouvre le devis. Le client donne son adresse et choisit le virement ou le paiement en ligne. Le serveur revérifie, sous verrou :
   - le statut et la validité du devis ;
   - le stock ;
   - la cohérence du total.

   Il crée ensuite une commande « gros » aux prix du devis. Un devis ne peut être accepté qu'une fois.
4. **Règlement.**
   - Par virement : réservation et instructions, comme au panier.
   - En ligne : Airwallex, comme à l'étape 2.
   - Dans les deux cas, le lien du devis mène ensuite à la commande et à son règlement.
5. **Demandes d'ouverture de compte.** Celles de l'« Espace pro » arrivent dans **Devis**, avec SIRET, activité et volume. L'accès grossiste s'ouvre toujours depuis la page Clients.
6. **Suivi.** L'« Espace pro » liste les devis du client connecté, avec leur lien.

### Ce qui protège l'argent et le stock

| Risque | Protection |
|---|---|
| Coordonnées bancaires remplacées pour détourner les paiements | Lues dans l'environnement du serveur, pas en base : aucun compte du back-office ne peut les changer |
| Faux « virement reçu » | Réservé aux administrateurs et responsables ; référence bancaire unique ; montant strictement positif |
| Stock retiré deux fois (réservation, puis paiement) | Nouvel indicateur `stock_deducted` : sortie et retour du stock n'agissent qu'une fois. Les commandes existantes sont reprises d'après les mouvements de stock (vérifié sur une copie : 3 commandes payées sur 3) |
| Devis accepté par un tiers | Jeton secret de 256 bits, comparé en temps constant ; la référence seule ne suffit pas |
| Devis accepté deux fois, expiré, ou sans stock | Refus, vérifié sous verrou |
| Total de devis falsifié | Total calculé par le serveur ; champ en lecture seule ; total revérifié à l'acceptation |
| Statut de devis forcé (« accepté » à la main) | Seuls « nouveau », « en étude » et « refusé » se règlent à la main |

### Fichiers

- **Virement** :
  - [payments/transfer.py](backend/payments/transfer.py) : disponibilité, instructions, réception, échéance ;
  - commande `expire_transfers` ;
  - réception dans [payments/views.py](backend/payments/views.py) ;
  - instructions dans l'e-mail de confirmation.
- **Commandes** :
  - champs `stock_deducted` et `payment_deadline`, migration `0006` avec reprise des données ;
  - virement au checkout ;
  - `bank_transfer` dans l'API.
- **Devis** :
  - [quotes/services.py](backend/quotes/services.py) (chiffrage, acceptation) et [quotes/emails.py](backend/quotes/emails.py) ;
  - lien public et acceptation dans [quotes/views.py](backend/quotes/views.py) ;
  - action `send` du back-office ;
  - migration `0002`.
- **Front** :
  - choix du virement au panier ;
  - encadré [BankTransferDetails.jsx](frontend/src/components/BankTransferDetails.jsx) sur la confirmation, la page de retour et « Mes commandes » ;
  - **Virement reçu…** dans la fiche commande ;
  - écran [Quotes.jsx](frontend/src/pages/admin/Quotes.jsx) ;
  - page publique [QuotePage.jsx](frontend/src/pages/QuotePage.jsx) (`/devis/:reference`) ;
  - formulaire [QuoteRequestForm.jsx](frontend/src/components/QuoteRequestForm.jsx) dans le panier ;
  - « Espace pro » corrigé, avec la liste des devis.
- **Configuration** : `BANK_TRANSFER_*` dans `.env.example`, `docker-compose.yml` et le README.
- **Traductions** : 23 messages serveur et 96 textes d'interface, en anglais et en chinois.

### Vérifications

| Vérification | Résultat |
|---|---|
| Tests SQLite | 159 réussis, 1 ignoré (concurrence, propre à PostgreSQL) ; 19 nouveaux |
| Tests PostgreSQL 18 | 160 réussis |
| `npm run lint` et `vite build` | Aucune erreur |
| Chrome, grossiste, 12 éventails | Moyens proposés : en ligne, virement, à la livraison. Confirmation : 475,20 €, coordonnées, référence, « avant le 17 novembre 2026 » |
| Back-office, **Virement reçu…** | 475,20 € et référence `TT-E2E-0001` : commande « Payée », stock non retiré une seconde fois |
| Devis depuis le panier (invité, 20 éventails) | `DEV-2026-00001` enregistré |
| Chiffrage dans **Devis** | 20 × 35 € + 25 € = 725 € ; e-mail avec le lien |
| Lien ouvert, virement choisi | Commande `WHOLESALE` de 725 € « en attente », 20 pièces réservées ; lien rouvert : « Devis accepté : commande … » |
| Devis de 60 pièces pour 35 en stock | Acceptation refusée (« Stock insuffisant ») ; stock en rouge dans le back-office |
| Formulaire « Espace pro » | Demande enregistrée avec SIRET, activité et volume |
| E-mails | 4 attendus, 4 envoyés : instructions de virement, paiement reçu, devis, instructions de la commande issue du devis |
| Stock de la copie | 47 → 35 → 15, un seul mouvement par commande |
| Erreurs JavaScript et erreurs 500 | Aucune |

### Limites

- **Expiration à lancer chaque jour.** `expire_transfers` doit être planifiée. Votre image de production unique n'a pas de planificateur : sans tâche planifiée chez votre hébergeur, les réservations échues restent jusqu'à une annulation manuelle.
- **Réservation de stock sans payer.** Un grossiste validé peut réserver du stock sans payer pendant le délai. C'est limité aux comptes validés et à `BANK_TRANSFER_DAYS`, et la commande peut être annulée à la main.
- **Pas d'acompte automatique** (par exemple 30 % à la commande, 70 % avant expédition). Les virements partiels s'additionnent, mais la commande n'est réglée qu'au total.
- **Remboursement d'un virement à la banque.** L'annulation rend le stock, mais aucun argent.
- **Devis d'invité.** La commande issue du devis n'est pas rattachée à un compte : le client la suit par son lien.
- **Port des devis à la main.** L'équipe fixe le port, la grille de livraison ne s'applique pas.
- **Pas de facture pro forma en PDF.** L'e-mail du devis est en texte simple.
- **Demandes de devis publiques.** Comme le checkout, elles n'ont pas de limite de débit (E4). Elles n'envoient aucun e-mail par elles-mêmes : seule l'équipe en envoie, après lecture.

### Ce qu'il vous reste à faire

1. **Coordonnées bancaires.** Mettre les vraies dans l'environnement du serveur (`BANK_TRANSFER_HOLDER`, `BANK_TRANSFER_BANK`, `BANK_TRANSFER_ACCOUNT`, `BANK_TRANSFER_BIC`), sans les commiter. Si vous avez un compte Airwallex, ses « Global Accounts » donnent des coordonnées locales en euros.
2. **Tâche quotidienne.** Planifier `python manage.py expire_transfers` chez votre hébergeur.
3. **Migrations.** Les appliquer au déploiement.
