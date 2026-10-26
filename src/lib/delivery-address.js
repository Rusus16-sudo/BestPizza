// L'adresse d'une commande est enregistrée sous la forme
// "Quartier: X | Tél: Y | Paiement: Z"
export function parseAddress(addressStr) {
  const out = { quartier: addressStr || 'Adresse non précisée', phone: '', payment: 'Paiement à la livraison' }
  if (!addressStr || !addressStr.includes('|')) return out
  addressStr.split('|').map(p => p.trim()).forEach(p => {
    if (p.startsWith('Quartier:')) out.quartier = p.replace('Quartier:', '').trim()
    else if (p.startsWith('Tél:')) out.phone = p.replace('Tél:', '').trim()
    else if (p.startsWith('Paiement:')) out.payment = p.replace('Paiement:', '').trim()
  })
  return out
}

export const isCash = (payment) => payment === 'Paiement à la livraison' || /esp[eè]ces/i.test(payment)
