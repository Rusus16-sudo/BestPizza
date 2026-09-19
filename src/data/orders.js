export const mockOrders = [
  {
    id: 'CMD-10294',
    date: '2026-08-05T09:30:00Z',
    status: 'en_preparation',
    total: 12500,
    items: [
      { name: 'Pepperoni Épicée', quantity: 1, price: 6500 },
      { name: 'Double Smash Burger', quantity: 1, price: 6000 }
    ],
    restaurant: 'Best Pizza'
  },
  {
    id: 'CMD-09832',
    date: '2026-08-01T19:45:00Z',
    status: 'livre',
    total: 8000,
    items: [
      { name: '4 Fromages', quantity: 1, price: 7500 },
      { name: 'Sauce Piquante', quantity: 1, price: 500 }
    ],
    restaurant: 'Best Pizza'
  },
  {
    id: 'CMD-08711',
    date: '2026-07-28T12:15:00Z',
    status: 'livre',
    total: 10000,
    items: [
      { name: 'Margherita', quantity: 2, price: 4500 },
      { name: 'Coca-Cola Frais', quantity: 2, price: 500 }
    ],
    restaurant: 'Best Pizza'
  },
  {
    id: 'CMD-07542',
    date: '2026-07-20T20:00:00Z',
    status: 'annule',
    total: 5500,
    items: [
      { name: 'Végétarienne Suprême', quantity: 1, price: 5500 }
    ],
    restaurant: 'Best Pizza'
  }
];
