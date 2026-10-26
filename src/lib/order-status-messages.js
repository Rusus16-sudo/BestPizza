// Ce que l'on dit au client quand sa commande change de statut.
// Partagé entre les toasts dans l'app et les notifications push.
export const ORDER_STATUS_MESSAGES = {
  en_attente: { icon: '✅', text: 'Paiement reçu : votre commande part en cuisine.' },
  en_preparation: { icon: '🧑‍🍳', text: 'La cuisine prépare votre commande !' },
  prete: { icon: '🍕', text: 'Votre commande est prête, un livreur va la récupérer.' },
  en_route: { icon: '🛵', text: 'Votre livreur est en route !' },
  livre: { icon: '🎉', text: 'Votre commande a été livrée. Bon appétit !' },
  annule: { icon: '❌', text: 'Votre commande a été annulée.' },
}
