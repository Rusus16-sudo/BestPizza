export const products = [
  {
    id: 1,
    title: 'Margherita',
    category: 'Pizza',
    price: 4500,
    isSpicy: false,
    image: '/margherita.png',
    rating: 4.5,
    reviews: 85,
    description: 'Un délice classique avec 100% de vraie mozzarella, du basilic frais et notre sauce tomate signature sur une pâte croustillante.',
    customizations: [
      { id: 'extra_cheese', label: 'Supplément Fromage', price: 1000 },
      { id: 'cheesy_crust', label: 'Pâte Fourrée Fromage', price: 1500 }
    ]
  },
  {
    id: 2,
    title: 'Pepperoni Épicée',
    category: 'Pizza',
    price: 6500,
    isSpicy: true,
    image: '/promo-pizza.png',
    rating: 4.8,
    reviews: 120,
    description: 'Pepperoni croustillant et épicé avec de la mozzarella fraîche, des tomates écrasées et un filet de miel pimenté sur notre pâte spéciale.',
    customizations: [
      { id: 'extra_cheese', label: 'Supplément Fromage', price: 1000 },
      { id: 'jalapenos', label: 'Ajouter Jalapenos', price: 500 },
      { id: 'extra_pepperoni', label: 'Extra Pepperoni', price: 1500 }
    ]
  },
  {
    id: 3,
    title: '4 Fromages',
    category: 'Pizza',
    price: 7500,
    isSpicy: false,
    image: '/four_cheeses.png',
    rating: 4.7,
    reviews: 94,
    description: 'Un mélange divin de Mozzarella, Gorgonzola, Parmesan et Fontina, idéal pour les amoureux de fromage.',
    customizations: [
      { id: 'truffle_oil', label: 'Huile de Truffe', price: 1000 },
      { id: 'cheesy_crust', label: 'Pâte Fourrée Fromage', price: 1500 }
    ]
  },
  {
    id: 4,
    title: 'Végétarienne Suprême',
    category: 'Pizza',
    price: 5500,
    isSpicy: false,
    image: '/veggie_supreme.png',
    rating: 4.6,
    reviews: 78,
    description: 'Garnie de poivrons colorés, oignons doux, olives noires et champignons frais sur un lit de mozzarella.',
    customizations: [
      { id: 'extra_cheese', label: 'Supplément Fromage', price: 1000 },
      { id: 'vegan_cheese', label: 'Fromage Vegan', price: 1500 },
      { id: 'jalapenos', label: 'Ajouter Jalapenos', price: 500 }
    ]
  },
  {
    id: 5,
    title: 'Ailes de Poulet BBQ',
    category: 'Sides',
    price: 3500,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&q=80&w=400',
    rating: 4.4,
    reviews: 56,
    description: 'De délicieuses ailes de poulet rôties, enrobées de notre sauce barbecue maison fumée.',
    customizations: [
      { id: 'extra_sauce', label: 'Sauce BBQ Supplémentaire', price: 500 }
    ]
  },
  {
    id: 6,
    title: 'Frites de Patate Douce',
    category: 'Sides',
    price: 2500,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1576107255627-8a4cefb4b187?auto=format&fit=crop&q=80&w=400',
    rating: 4.6,
    reviews: 42,
    description: 'Des frites de patate douce croustillantes à l\'extérieur et fondantes à l\'intérieur.',
    customizations: [
      { id: 'spicy_mayo', label: 'Mayonnaise Épicée', price: 500 }
    ]
  },
  {
    id: 7,
    title: 'Coca-Cola Frais',
    category: 'Drinks',
    price: 1500,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=400',
    rating: 4.8,
    reviews: 110,
    description: 'Un Coca-Cola bien glacé pour accompagner votre repas.',
    customizations: []
  },
  {
    id: 8,
    title: 'Thé Glacé Maison',
    category: 'Drinks',
    price: 2000,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&q=80&w=400',
    rating: 4.9,
    reviews: 34,
    description: 'Thé glacé maison infusé au citron et à la menthe fraîche.',
    customizations: []
  },
  {
    id: 9,
    title: 'Double Smash Burger',
    category: 'Burgers',
    price: 6000,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=400',
    rating: 4.8,
    reviews: 142,
    description: 'Deux steaks hachés pur boeuf caramélisés, double cheddar affiné, cornichons, oignons fondants et notre sauce secrète Foodora.',
    customizations: [
      { id: 'bacon', label: 'Bacon Fumé', price: 1000 },
      { id: 'extra_steak', label: 'Steak Supplémentaire', price: 1500 }
    ]
  },
  {
    id: 10,
    title: 'Tiramisu Maison',
    category: 'Desserts',
    price: 3500,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&q=80&w=400',
    rating: 4.9,
    reviews: 89,
    description: 'Le véritable Tiramisu italien avec mascarpone frais, biscuit cuillère imbibé de café expresso et cacao amer.',
    customizations: []
  }
];

export function getProductById(id) {
  return products.find(p => p.id === parseInt(id));
}
