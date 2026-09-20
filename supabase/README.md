# Base de données Best Pizza

La base vit dans Supabase. Ces fichiers en sont la référence : ils remplacent
l'ancien `database_schema.sql`, qui ne décrivait plus la base réelle
(on peut encore le consulter dans l'historique git, avant le commit qui l'a retiré).

## Appliquer les scripts

Dans Supabase → **SQL Editor**, exécuter dans cet ordre. Chaque fichier peut être
relancé sans risque : il ne recrée pas ce qui existe déjà.

| Ordre | Fichier | Ce qu'il fait |
|---|---|---|
| 1 | `migrations/20260919_aligner_base_et_securite.sql` | Aligne la base sur l'application et la sécurise |
| 2 | `seed_products.sql` | Importe les 10 plats de la carte de démonstration |
| 3 | `migrations/20260920_profils_automatiques.sql` | Crée le profil de chaque nouveau compte, avec son prénom |
| 4 | `migrations/20260920_paiements_notchpay.sql` | Paiement Mobile Money : statut « paiement » et suivi du règlement |

## Ce que contient la migration principale

- **Colonnes ajoutées** : `orders` (numéro court, montant, instructions, livreur…),
  `order_items` (produit, taille, options), `products` (temps de préparation, suppléments).
- **Tables créées** : `offers`, `reviews`, `favorites`.
- **Statuts de commande** : `en_attente` → `en_preparation` → `prete` → `en_route` → `livre`,
  plus `annule`. Le statut `prete` distingue « la pizza est prête » de « le livreur est parti ».
- **Sécurité (RLS)** : un client ne voit que ses commandes ; la cuisine voit et fait avancer
  toutes les commandes ; un livreur voit les commandes prêtes et les siennes ; le gérant voit tout.
  Personne ne peut changer son propre rôle.
- **Temps réel** activé sur `orders`, et **espace de stockage** `products` pour les photos.

Le paiement en ligne est décrit dans [`docs/paiement-notchpay.md`](../docs/paiement-notchpay.md).

## Points d'attention

- Les commandes ne sont jamais créées depuis le navigateur : elles passent par
  `src/app/api/orders/route.js`, qui recalcule les prix depuis la base.
- Les routes `src/app/api/admin/*` utilisent la clé `service_role` et vérifient
  que l'appelant est bien un gérant actif.
- Rôles attendus dans `profiles.role` : `client`, `cuisinier`, `livreur`, `gerant` ou `admin`
  (ces deux derniers sont équivalents).
