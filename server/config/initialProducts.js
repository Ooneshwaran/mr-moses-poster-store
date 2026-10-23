// Real products and exact prices for Mr Moses Poster Store
// STRICT REQUIREMENT: No dummy data, no fake listings, no calendars.

const INITIAL_PRODUCTS = [
  // --- POSTERS ---
  {
    productId: 'poster-a3',
    category: 'posters',
    name: 'A3 Poster',
    size: 'A3',
    dimensions: '13 × 19 inches',
    description: 'High-definition vibrant poster printing on premium thick matte art card.',
    price: 130,
    inStock: true,
    isCustomizable: true,
    badge: 'Popular Size'
  },
  {
    productId: 'poster-a4',
    category: 'posters',
    name: 'A4 Poster',
    size: 'A4',
    dimensions: '13 × 9.5 inches',
    description: 'Crisp, high-resolution poster print suited for bedroom and study walls.',
    price: 70,
    inStock: true,
    isCustomizable: true,
    badge: 'Standard'
  },
  {
    productId: 'poster-a5',
    category: 'posters',
    name: 'A5 Poster',
    size: 'A5',
    dimensions: '6.5 × 9.5 inches',
    description: 'Compact art print, ideal for desk frames, mini walls, and collection boards.',
    price: 50,
    inStock: true,
    isCustomizable: true,
    badge: 'Desk Friendly'
  },
  {
    productId: 'poster-a6',
    category: 'posters',
    name: 'A6 Poster',
    size: 'A6',
    dimensions: 'Quarter size',
    description: 'Pocket-sized art card with rich color reproduction.',
    price: 30,
    inStock: true,
    isCustomizable: true,
    badge: 'Pocket Mini'
  },
  {
    productId: 'poster-5x9',
    category: 'posters',
    name: '5 × 9 Poster',
    size: '5 × 9 inches',
    dimensions: '5 × 9 inches',
    description: 'Slim vertical landscape/portrait format print on quality matte cardstock.',
    price: 15,
    inStock: true,
    isCustomizable: true,
    badge: 'Value'
  },
  {
    productId: 'poster-5x7',
    category: 'posters',
    name: '5 × 7 Poster',
    size: '5 × 7 inches',
    dimensions: '5 × 7 inches',
    description: 'Handy mini poster print for bedside tables, lockers, and photo collages.',
    price: 10,
    inStock: true,
    isCustomizable: true,
    badge: 'Mini'
  },

  // --- STICKERS ---
  {
    productId: 'sticker-small',
    category: 'stickers',
    name: 'Sticker (Small size)',
    size: 'Small size only',
    dimensions: 'Standard die-cut mini',
    description: 'Durable, waterproof matte/gloss finish adhesive sticker.',
    price: 10,
    inStock: true,
    isCustomizable: true,
    badge: 'Die-cut'
  },

  // --- PHOTO FRAMES ---
  {
    productId: 'frame-12x15',
    category: 'frames',
    name: 'Photo Frame (12 × 15 inches)',
    size: '12 × 15 inches',
    dimensions: '12 × 15 inches',
    description: 'Sturdy modern gallery-grade frame with protective crystal sheet and wall mount hanging hooks.',
    price: 550,
    inStock: true,
    isCustomizable: true,
    badge: 'Gallery Frame'
  },
  {
    productId: 'frame-12x18',
    category: 'frames',
    name: 'Photo Frame (12 × 18 inches)',
    size: '12 × 18 inches',
    dimensions: '12 × 18 inches',
    description: 'Premium wooden-texture frame border designed for A3-adjacent posters and portraits.',
    price: 700,
    inStock: true,
    isCustomizable: true,
    badge: 'Most Popular Frame'
  },
  {
    productId: 'frame-16x24',
    category: 'frames',
    name: 'Photo Frame (16 × 24 inches)',
    size: '16 × 24 inches',
    dimensions: '16 × 24 inches',
    description: 'Large statement wall frame, engineered with reinforced corners and premium finish.',
    price: 1100,
    inStock: true,
    isCustomizable: true,
    badge: 'Feature Wall'
  },
  {
    productId: 'frame-20x30',
    category: 'frames',
    name: 'Photo Frame (20 × 30 inches)',
    size: '20 × 30 inches',
    dimensions: '20 × 30 inches',
    description: 'Grand centerpiece photo frame with robust back support and high-durability acrylic glaze.',
    price: 1800,
    inStock: true,
    isCustomizable: true,
    badge: 'Masterpiece'
  },

  // --- POSTER COMBO OFFERS ---
  {
    productId: 'combo-1',
    category: 'combos',
    name: 'Poster Combo 1',
    size: '1 A3 + 1 A5',
    dimensions: '1 A3 (13×19 in) + 1 A5 (6.5×9.5 in)',
    description: 'Special value pack: 1 large A3 poster plus 1 matching A5 companion poster.',
    price: 160,
    inStock: true,
    isCustomizable: true,
    badge: 'Value Combo'
  },
  {
    productId: 'combo-2',
    category: 'combos',
    name: 'Poster Combo 2',
    size: '2 A4 posters',
    dimensions: '2 A4 posters (13 × 9.5 inches each)',
    description: 'Perfect twin wall set: 2 full A4 high-definition poster prints.',
    price: 120,
    inStock: true,
    isCustomizable: true,
    badge: 'Duo Pack'
  },
  {
    productId: 'combo-3',
    category: 'combos',
    name: 'Poster Combo 3',
    size: '1 A3 + 1 A5 + 1 (5 × 7 inches)',
    dimensions: '1 A3 + 1 A5 + 1 poster of 5 × 7 inches',
    description: 'Trio gallery combo: 1 A3 feature print, 1 A5 mid-size print, and 1 5×7 mini accent poster.',
    price: 170,
    inStock: true,
    isCustomizable: true,
    badge: 'Trio Special'
  }
];

module.exports = { INITIAL_PRODUCTS };
