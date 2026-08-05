export const offers = [
  {
    id: '1',
    title: '-50% sur votre première commande',
    description: 'Valable sur l\'ensemble du menu pour toute nouvelle inscription.',
    code: 'MIAM50',
    type: 'discount',
    color: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
    expiry: 'Valable jusqu\'au 31 Décembre',
  },
  {
    id: '2',
    title: 'Menu Duo : 1 Pizza = 1 Boisson Offerte',
    description: 'Achetez une pizza de taille Grande ou Extra Grande et recevez une boisson au choix.',
    code: 'DUO',
    type: 'combo',
    color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    expiry: 'Valable tous les soirs',
  },
  {
    id: '3',
    title: 'Lunch Break : -20%',
    description: 'Profitez de -20% sur toute votre commande entre 12h et 14h.',
    code: 'LUNCH',
    type: 'discount',
    color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    expiry: 'Du Lundi au Vendredi (12h-14h)',
  },
  {
    id: '4',
    title: 'Livraison Gratuite',
    description: 'Pour toute commande supérieure à 15000 FCFA, la livraison est offerte.',
    code: 'FREEDEL',
    type: 'delivery',
    color: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    expiry: 'Automatique au panier',
  }
]
