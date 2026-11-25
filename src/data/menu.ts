// Categories are dynamic once managed from the admin dashboard, so this is a
// plain string. The static list below mirrors the current menu exactly and is
// used as the offline fallback when Supabase is unavailable.
export type MenuCategory = string;

export const MENU_CATEGORIES: MenuCategory[] = [
  'Soups & Traditional Meals',
  'Grilled & Roasted',
  'Rice & Main Dishes',
  'Bakery & Snacks',
  'Cakes & Desserts',
];

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  pricePhp: number | null;
  options?: string[];
  optionLabel?: string;
  shortDescription: string;
  fullDescription: string;
  image: string;
}

export const BUSINESS_INFO = {
  name: 'ANN BAKERY HOUSE',
  tagline: 'Authentic Flavors. Homemade with Love.',
  type: 'African Homemade Food & Bakery',
  address: '1203 St Peter Street, Holy Family Village, Taguig City, Philippines',
  shortAddress: 'Holy Family Village, Taguig City',
  whatsappDisplay: '+63 954 143 8031',
  whatsappDigits: '639541438031',
  currency: '₱',
  pricePendingText: 'Price to be confirmed',
} as const;

export function buildWhatsAppUrl(message: string, digits: string = BUSINESS_INFO.whatsappDigits): string {
  const baseUrl = `https://wa.me/${digits}`;
  const trimmed = message.trim();
  if (!trimmed) {
    return baseUrl;
  }

  let encoded: string;
  try {
    encoded = encodeURIComponent(trimmed);
  } catch {
    // Strip unpaired UTF-16 surrogates if pasted from malformed text so encodeURIComponent never throws.
    const sanitized = trimmed.replace(
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
      '',
    );
    encoded = encodeURIComponent(sanitized);
  }

  return `${baseUrl}?text=${encoded}`;
}

export function formatPhp(amount: number | null): string {
  if (amount === null) {
    return BUSINESS_INFO.pricePendingText;
  }
  return `₱${amount.toLocaleString('en-PH')}`;
}

export function getCartKey(itemId: string, selectedOption?: string): string {
  return selectedOption ? `${itemId}::${selectedOption}` : itemId;
}

export const MENU_ITEMS: MenuItem[] = [
  // 1. SOUPS & TRADITIONAL MEALS
  {
    id: 'beef-leg-pepper-soup',
    name: 'Beef Leg Pepper Soup',
    category: 'Soups & Traditional Meals',
    pricePhp: null,
    shortDescription:
      'Homemade slow-simmered beef leg pepper soup served hot in traditional style.',
    fullDescription:
      'Traditional homemade beef leg pepper soup prepared fresh by ANN BAKERY HOUSE. Contact us via WhatsApp to confirm serving size and current price in PHP (₱).',
    image: '/src/assets/images/beef-leg-pepper-soup.jpg',
  },
  {
    id: 'bitter-leaf-soup',
    name: 'Bitter Leaf Soup with Rice or Fried Plantain',
    category: 'Soups & Traditional Meals',
    pricePhp: null,
    optionLabel: 'Choose Side',
    options: ['Rice', 'Fried Plantain'],
    shortDescription:
      'Traditional homemade bitter leaf soup paired with your choice of rice or fried plantain.',
    fullDescription:
      'Authentic homemade bitter leaf soup prepared fresh and served with your choice of rice or fried plantain. Confirm your preferred side and pricing via WhatsApp.',
    image: '/src/assets/images/dish_ndole_plantain_1795577910602.jpg',
  },
  {
    id: 'pepper-soup-catfish',
    name: 'Pepper Soup Catfish',
    category: 'Soups & Traditional Meals',
    pricePhp: null,
    shortDescription:
      'Homemade catfish pepper soup prepared fresh in warm, comforting traditional broth.',
    fullDescription:
      'Freshly cooked homemade pepper soup with catfish, prepared to order in our kitchen. Message us on WhatsApp to confirm availability and pricing in PHP (₱).',
    image: '/src/assets/images/food_catfish_pepper_soup_1795578363047.jpg',
  },

  // 2. GRILLED & ROASTED
  {
    id: 'roasted-fish',
    name: 'Roasted Fish',
    category: 'Grilled & Roasted',
    pricePhp: null,
    shortDescription:
      'Freshly seasoned and roasted fish prepared homemade to order.',
    fullDescription:
      'Whole roasted fish prepared fresh in our kitchen. Confirm portion size, preparation time, and pricing in PHP (₱) directly via WhatsApp.',
    image: '/src/assets/images/food_roasted_fish_1795578364366.jpg',
  },
  {
    id: 'roasted-chicken',
    name: 'Roasted Chicken',
    category: 'Grilled & Roasted',
    pricePhp: null,
    shortDescription:
      'Tender homemade roasted chicken cooked fresh until golden and savory.',
    fullDescription:
      'Freshly roasted chicken prepared with care for family meals or individual orders. Reach out via WhatsApp to confirm portions and PHP (₱) pricing.',
    image: '/src/assets/images/food_roasted_chicken_1795578364862.jpg',
  },
  {
    id: 'roasted-bars',
    name: 'Roasted Bars',
    category: 'Grilled & Roasted',
    pricePhp: null,
    shortDescription:
      'Freshly roasted bar fish prepared homemade and served warm.',
    fullDescription:
      'Whole roasted bar fish prepared fresh to order. Contact ANN BAKERY HOUSE on WhatsApp for fresh quote confirmation in PHP (₱).',
    image: '/src/assets/images/food_roasted_bars_1795578365351.jpg',
  },
  {
    id: 'brocette-soya',
    name: 'Brocette Soya',
    category: 'Grilled & Roasted',
    pricePhp: null,
    shortDescription:
      'Grilled skewered beef soya prepared fresh in traditional style.',
    fullDescription:
      'Homemade grilled beef skewers (Brocette Soya) cooked fresh to order. Message us via WhatsApp to confirm order quantities and PHP (₱) pricing.',
    image: '/src/assets/images/food_brochette_soya_1795578365416.jpg',
  },

  // 3. RICE & MAIN DISHES
  {
    id: 'fried-rice-chicken-or-fish',
    name: 'Fried Rice with Chicken or Fish',
    category: 'Rice & Main Dishes',
    pricePhp: null,
    optionLabel: 'Choose Protein',
    options: ['Chicken', 'Fish'],
    shortDescription:
      'Homemade fried rice served with your choice of chicken or fish.',
    fullDescription:
      'Freshly prepared homemade fried rice paired with your selection of chicken or fish. Confirm your choice and PHP (₱) quote directly on WhatsApp.',
    image: '/src/assets/images/food_fried_rice_chicken_fish_1795578366156.jpg',
  },
  {
    id: 'vegetable-plantain-or-rice',
    name: 'Vegetable with Fried Plantain or Rice',
    category: 'Rice & Main Dishes',
    pricePhp: null,
    optionLabel: 'Choose Side',
    options: ['Fried Plantain', 'Rice'],
    shortDescription:
      'Homemade vegetable dish served with fried plantain or steamed rice.',
    fullDescription:
      'Hearty homemade vegetable main dish paired with your preference of fried plantain or rice. Confirm your choice and current pricing via WhatsApp.',
    image: '/src/assets/images/food_vegetable_plantain_rice_1795578366072.jpg',
  },

  // 4. BAKERY & SNACKS
  {
    id: 'donut-sugar-option',
    name: 'Donut with Sugar / Without Sugar',
    category: 'Bakery & Snacks',
    pricePhp: null,
    optionLabel: 'Sugar Option',
    options: ['With Sugar', 'Without Sugar'],
    shortDescription:
      'Freshly fried homemade donuts, available with sugar or without sugar.',
    fullDescription:
      'Soft, golden homemade donuts fried fresh in small batches. Select either With Sugar or Without Sugar and confirm batch quantity via WhatsApp.',
    image: '/src/assets/images/donut-with-sugar-without-sugar.jpg',
  },
  {
    id: 'pain-soya',
    name: 'Pain Soya',
    category: 'Bakery & Snacks',
    pricePhp: null,
    shortDescription:
      'Freshly baked bread filled with savory grilled beef soya.',
    fullDescription:
      'Homemade bakery bread filled generously with freshly grilled beef soya. Confirm availability and pricing in PHP (₱) on WhatsApp.',
    image: '/src/assets/images/bakery_pain_soya_1795578366997.jpg',
  },
  {
    id: 'french-baguettes',
    name: 'French Baguettes',
    category: 'Bakery & Snacks',
    pricePhp: null,
    shortDescription:
      'Freshly baked golden French baguettes with a crisp crust and soft interior.',
    fullDescription:
      'Hand-shaped French baguettes baked fresh at ANN BAKERY HOUSE. Message us via WhatsApp to reserve loaves or confirm pricing in PHP (₱).',
    image: '/src/assets/images/bakery_french_baguettes_1795578367695.jpg',
  },
  {
    id: 'empanada',
    name: 'Empanada',
    category: 'Bakery & Snacks',
    pricePhp: null,
    shortDescription:
      'Golden baked homemade savory pastry pockets prepared fresh.',
    fullDescription:
      'Handcrafted homemade empanadas baked until golden brown. Contact us via WhatsApp to confirm batch quantities and PHP (₱) pricing.',
    image: '/src/assets/images/bakery_meat_pies_1795577911737.jpg',
  },
  {
    id: 'neems-beef',
    name: 'Neems Beef',
    category: 'Bakery & Snacks',
    pricePhp: null,
    shortDescription:
      'Crispy golden homemade beef rolls fried fresh to order.',
    fullDescription:
      'Crunchy handmade Neems Beef fried until golden and crisp. Confirm pack size and current PHP (₱) price via WhatsApp.',
    image: '/src/assets/images/bakery_neems_beef_1795578427671.jpg',
  },
  {
    id: 'beef-rolls',
    name: 'Beef Rolls',
    category: 'Bakery & Snacks',
    pricePhp: null,
    shortDescription:
      'Baked golden homemade pastry rolls filled with savory beef.',
    fullDescription:
      'Flaky homemade bakery rolls wrapped around savory beef and baked fresh. Confirm piece count and PHP (₱) pricing on WhatsApp.',
    image: '/src/assets/images/bakery_beef_rolls_1795578427177.jpg',
  },

  // 5. CAKES & DESSERTS
  {
    id: 'lemon-cake',
    name: 'Lemon Cake',
    category: 'Cakes & Desserts',
    pricePhp: null,
    shortDescription:
      'Freshly baked homemade lemon cake with bright citrus flavor.',
    fullDescription:
      'Moist homemade lemon cake baked fresh in our bakery. Message us on WhatsApp to confirm cake sizes and PHP (₱) pricing.',
    image: '/src/assets/images/cake_lemon_cake_1795578427248.jpg',
  },
  {
    id: 'mabre-cake',
    name: 'Mabre Cake',
    category: 'Cakes & Desserts',
    pricePhp: null,
    shortDescription:
      'Classic homemade swirled marble cake baked fresh.',
    fullDescription:
      'Traditional homemade mabre (marble) cake with tender crumb and rich cocoa swirl. Confirm availability and PHP (₱) quote via WhatsApp.',
    image: '/src/assets/images/cake_mabre_cake_1795578368945.jpg',
  },
  {
    id: 'yaourt-cake',
    name: 'Yaourt Cake',
    category: 'Cakes & Desserts',
    pricePhp: null,
    shortDescription:
      'Soft, tender homemade yogurt cake baked fresh.',
    fullDescription:
      'Light and moist homemade yaourt (yogurt) cake prepared fresh for family or events. Confirm sizing and PHP (₱) pricing via WhatsApp.',
    image: '/src/assets/images/cake_yaourt_cake_1795578428128.jpg',
  },
  {
    id: 'coconut-cake',
    name: 'Coconut Cake',
    category: 'Cakes & Desserts',
    pricePhp: null,
    shortDescription:
      'Freshly baked homemade coconut cake with rich tropical aroma.',
    fullDescription:
      'Moist homemade coconut cake prepared fresh to order. Contact ANN BAKERY HOUSE via WhatsApp to confirm sizing and PHP (₱) pricing.',
    image: '/src/assets/images/cake_coconut_cake_1795578427535.jpg',
  },
];
