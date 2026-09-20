# Paiement Mobile Money avec Notch Pay

Le client paie MTN ou Orange Money avant que la commande parte en cuisine.
Le paiement à la livraison reste disponible et n'a pas changé.

## Le parcours

1. Le client choisit « Mobile Money » et valide son panier.
2. Le serveur recalcule le total, crée la commande au statut **`paiement`**
   (invisible en cuisine), puis ouvre un paiement chez Notch Pay.
3. Le client est redirigé vers la page de paiement Notch Pay, choisit son
   opérateur et valide sur son téléphone (USSD, 5 à 30 secondes).
4. Notch Pay appelle notre **webhook**. La commande passe alors à `en_attente` :
   c'est à ce moment qu'elle apparaît en cuisine.
5. Le client revient sur `/paiement/retour`, qui interroge aussi Notch Pay
   directement — ainsi il est fixé même si le webhook tarde.

Si le paiement échoue, la commande reste au statut `paiement` et le client peut
relancer le paiement depuis cette page ou depuis ses commandes.

## Configuration

### 1. Base de données

Exécuter `supabase/migrations/20260920_paiements_notchpay.sql` dans Supabase.

### 2. Variables d'environnement

Dans `.env.local` en local, et dans Vercel → Settings → Environment Variables
en ligne. Ces clés sont **uniquement côté serveur** : jamais de préfixe `NEXT_PUBLIC_`.

| Variable | Où la trouver |
|---|---|
| `NOTCHPAY_PUBLIC_KEY` | Business suite Notch Pay → Settings → Developer → API keys |
| `NOTCHPAY_WEBHOOK_HASH` | Même écran, le « hash » de l'endpoint webhook |

Les clés de test commencent par `test_` : les paiements faits avec elles
n'apparaissent pas dans les vraies données.

### 3. Webhook

Dans le Business suite Notch Pay, déclarer l'adresse :

```
https://VOTRE-DOMAINE/api/payments/notchpay/webhook
```

Événements utiles : `payment.complete`, `payment.failed`, `payment.canceled`,
`payment.expired`.

Le webhook n'atteint pas `localhost` : pour tester en local, exposer le serveur
(par exemple avec `ngrok`) ou se reposer sur la page de retour, qui interroge
Notch Pay elle-même.

## Ce que fait le code

| Fichier | Rôle |
|---|---|
| `src/lib/notchpay.js` | Appels à l'API (création, consultation) et vérification de signature |
| `src/lib/payment-orders.js` | Applique le résultat d'un paiement à une commande, sans double effet |
| `src/app/api/orders/route.js` | Crée la commande puis ouvre le paiement |
| `src/app/api/payments/notchpay/webhook/route.js` | Reçoit les notifications de Notch Pay |
| `src/app/api/payments/notchpay/verify/route.js` | Vérification à la demande, pour la page de retour |
| `src/app/api/payments/notchpay/retry/route.js` | Relance un paiement non abouti |
| `src/app/paiement/retour/page.js` | Ce que voit le client au retour du paiement |

## Points de sécurité

- Le montant envoyé à Notch Pay est **recalculé par le serveur** depuis la base,
  jamais repris du navigateur.
- Le webhook est refusé si la signature `x-notch-signature` ne correspond pas
  (HMAC SHA-256 du corps brut, avec le hash du webhook).
- À la confirmation, le montant payé est comparé au total de la commande :
  en cas d'écart, rien n'est validé et l'incident est tracé dans les journaux.
- Webhook et page de retour passent par le même code : recevoir les deux, ou
  deux fois le même, ne change rien.
