// Les problèmes qu'un livreur peut signaler pendant une livraison, et ce qu'on en dit
// au livreur (bouton), au gérant et au client.
export const DELIVERY_ISSUES = {
  injoignable: {
    label: 'Client injoignable',
    staff: 'le client ne répond pas au téléphone',
    customer: 'Votre livreur n’arrive pas à vous joindre. Gardez votre téléphone près de vous.',
  },
  absent: {
    label: 'Personne sur place',
    staff: 'personne sur place pour recevoir la commande',
    customer: 'Votre livreur est arrivé mais ne vous trouve pas. Appelez le restaurant.',
  },
  adresse: {
    label: 'Adresse introuvable',
    staff: 'il ne trouve pas l’adresse',
    customer: 'Votre livreur ne trouve pas votre adresse. Appelez le restaurant pour le guider.',
  },
}
