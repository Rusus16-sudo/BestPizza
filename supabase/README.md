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
| 5 | `migrations/20261026_notifications_push.sql` | Appareils abonnés aux notifications push du suivi de commande |
| 6 | `migrations/20261026_tchopi_1_etablissements.sql` | Tchopi : enseignes, points de vente, membres ; Best Pizza devient le premier établissement |
| 6b | `migrations/20261026_tchopi_1b_correctif.sql` | Corrige l'étape 6 : l'ajout d'un plat, d'une offre ou d'un avis échouait |
| 7 | `migrations/20261026_tchopi_2_securite.sql` | Tchopi : chacun ne voit que son établissement (retour arrière : `20261026_tchopi_2_retour_arriere.sql`) |
| 8 | `migrations/20261026_tchopi_3_fin_transition.sql` | Tchopi : fin de la transition (établissement obligatoire, codes promo par enseigne, photos par dossier). **Après** le déploiement du code des équipes |
| 9 | `migrations/20261027_plats_nouveaux.sql` | Le gérant marque un plat « Nouveau » (30 jours) |
| 10 | `migrations/20261027_tchopi_4_vitrines.sql` | Tchopi : partie publique des restaurants pour les vitrines (nom, logo, couleur), adresses réservées |
| 11 | `migrations/20261027_tchopi_5_commande_sans_compte.sql` | Tchopi : commande sans compte (lien de suivi secret, notifications par commande) |
| 12 | `migrations/20261027_tchopi_6_horaires_livraison.sql` | Tchopi : horaires, frais de livraison et quartiers de chaque point de vente, réglés par le gérant |
| 13 | `migrations/20261027_tchopi_7_formats_des_plats.sql` | Tchopi : les choix de chaque plat (taille, formule, suppléments), définis par le gérant |
| 14 | `migrations/20261027_tchopi_8_finitions.sql` | Tchopi : numéros de commande #1, #2… par restaurant ; prénom de l’auteur sur chaque avis |
| 15 | `migrations/20261028_tchopi_9_inscription.sql` | Tchopi : réserve les adresses des pages de Tchopi (/creer, /tarifs…) |
| 16 | `migrations/20261028_tchopi_10_mon_restaurant.sql` | Tchopi : photo de couverture et accroche de la vitrine (page « Mon restaurant ») |
| 17 | `migrations/20261028_tchopi_11_offre_protegee.sql` | Tchopi : seul Tchopi change l’offre, l’essai et l’adresse d’un restaurant |
| 18 | `migrations/20261028_tchopi_12_suppression_compte.sql` | Tchopi : un compte peut être supprimé (son profil part avec lui, ses commandes restent au restaurant) |

Après l'étape 7, `node scripts/test-isolation.js` vérifie qu'aucun établissement ne voit
les données d'un autre (il crée deux faux restaurants, sans envoyer d'email, puis les efface).

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

Le paiement en ligne est décrit dans [`docs/paiement-notchpay.md`](../docs/paiement-notchpay.md),
les notifications push dans [`docs/notifications-push.md`](../docs/notifications-push.md).

## Points d'attention

- Les commandes ne sont jamais créées depuis le navigateur : elles passent par
  `src/app/api/orders/route.js`, qui recalcule les prix depuis la base.
- Les routes `src/app/api/admin/*` utilisent la clé `service_role` et vérifient
  que l'appelant est bien un gérant actif.
- Rôles attendus dans `profiles.role` : `client`, `cuisinier`, `livreur`, `gerant` ou `admin`
  (ces deux derniers sont équivalents).
