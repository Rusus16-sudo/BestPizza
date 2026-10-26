# Notifications push

Chacun est prévenu de ce qui le concerne, **même app fermée**. Toucher une
notification ouvre l'espace qu'elle concerne.

| Qui | Quand | Ouvre |
|---|---|---|
| Client | Chaque étape de sa commande : paiement reçu, en préparation, prête, en route, livrée, annulée | `/orders` |
| Cuisine | Nouvelle commande (en Mobile Money : une fois payée) ; annulation d'une commande à préparer ou en préparation | `/kitchen` |
| Livreurs | Commande prête, avec le quartier et le montant à encaisser ; dès qu'un livreur la prend, la notification des autres devient « prise en charge », sans sonner ; annulation | `/delivery` |
| Gérant | Seulement les problèmes : paiement dont le montant ne correspond pas à la commande | `/admin/commandes` |

Seuls les comptes du personnel **actifs** sont prévenus. Une commande a une seule
notification par personne : chaque étape remplace la précédente.
Quand l'app est ouverte, les toasts habituels s'affichent aussi.

## Le parcours

1. Sur la page **Commandes**, un client qui a une commande en cours voit
   « Suivez votre commande, même app fermée » et touche **Activer**. On peut
   aussi l'activer dans Réglages → Notifications → « Mises à jour de commande ».
   Le personnel a le même encart sur l'écran cuisine, l'écran livreur et le
   tableau de bord du gérant : à activer **une fois sur chaque appareil**.
2. Le navigateur demande la permission. L'appareil est enregistré dans
   `push_subscriptions` et lié au compte du client.
3. Quand la cuisine, le livreur, le gérant ou le paiement change le statut d'une
   commande, Supabase appelle notre **webhook de base de données**.
4. Le serveur envoie la notification sur tous les appareils du client. La touchant,
   il arrive sur ses commandes.

À la déconnexion, l'appareil est oublié. Au prochain compte connecté qui a
accepté les notifications, il est relié à ce compte.

### Sur iPhone

Le push n'existe que dans l'app **ajoutée à l'écran d'accueil** (iOS 16.4 ou plus) :
dans Safari, bouton Partager → « Sur l'écran d'accueil ». L'app l'explique au client.
Sur Android et ordinateur, cela marche directement dans le navigateur.

## Configuration

### 1. Base de données

Exécuter `supabase/migrations/20261026_notifications_push.sql` dans Supabase.

### 2. Variables d'environnement

Déjà générées dans `.env.local`. Les copier **telles quelles** dans
Vercel → Settings → Environment Variables. Si on change de clés VAPID,
tous les appareils devront réactiver les notifications.

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clé publique VAPID, lue par le navigateur |
| `VAPID_PRIVATE_KEY` | Clé privée VAPID, **serveur uniquement** |
| `PUSH_WEBHOOK_SECRET` | Secret partagé avec le webhook Supabase |
| `VAPID_SUBJECT` | Facultatif : `mailto:` ou `https://` de contact pour les services de push. Par défaut, l'adresse du site sur Vercel |

Nouvelles clés si besoin : `npx web-push generate-vapid-keys`.

### 3. Webhook Supabase

Dans Supabase → **Database → Webhooks** (ou Integrations → Database Webhooks) →
**Create a new hook** :

| Champ | Valeur |
|---|---|
| Name | `push_suivi_commande` |
| Table | `orders` |
| Events | **Insert** et **Update** (Insert : pour prévenir la cuisine des nouvelles commandes) |
| Type | HTTP Request |
| Method | `POST` |
| URL | `https://VOTRE-DOMAINE/api/push/order-status` |
| HTTP Headers | `x-webhook-secret` = la valeur de `PUSH_WEBHOOK_SECRET` |

Le webhook n'atteint pas `localhost` : pour tester en local, exposer le serveur
(par exemple avec `ngrok`) et mettre cette adresse dans le webhook.

## Ce que fait le code

| Fichier | Rôle |
|---|---|
| `public/sw.js` | Service worker : affiche la notification, ouvre les commandes au toucher |
| `src/lib/push-client.js` | Navigateur : abonner, désabonner, garder l'appareil lié au compte |
| `src/lib/push.js` | Serveur : envoi aux appareils d'un client, oubli des appareils expirés |
| `src/lib/order-notifications.js` | Qui prévenir, et de quoi, pour chaque changement de commande |
| `src/lib/order-status-messages.js` | Les messages du client, communs aux toasts et aux notifications |
| `src/lib/payment-orders.js` | Alerte le gérant d'un paiement anormal |
| `src/app/api/push/subscribe/route.js` | Enregistre ou retire un appareil |
| `src/app/api/push/order-status/route.js` | Reçoit le webhook Supabase et envoie les notifications |
| `src/components/PushOptIn.js` | L'invitation à activer, sur chaque espace |

## Points de sécurité

- Le webhook est refusé sans le bon `x-webhook-secret`.
- La table `push_subscriptions` est fermée par la RLS : seul le serveur y accède.
- Un appareil n'est lié qu'au compte connecté qui l'enregistre.
- Une notification ne contient que le numéro de commande et son étape.
