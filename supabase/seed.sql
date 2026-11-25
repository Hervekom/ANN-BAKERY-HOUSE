-- =============================================================================
-- ANN BAKERY HOUSE — Supabase Seed Data
-- -----------------------------------------------------------------------------
-- STATUS: PROPOSAL — NOT APPLIED. Review only.
--
-- Seeds the ACTUAL current project data:
--   * 5 categories  (src/data/menu.ts -> MENU_CATEGORIES)
--   * 19 products   (src/data/menu.ts -> MENU_ITEMS)
--   * 8 variant options (product.optionLabel / product.options)
--   * site_settings  (src/data/menu.ts -> BUSINESS_INFO + existing section copy)
--
-- Guarantees:
--   * All prices are NULL ("price to be confirmed"). No price is invented.
--   * Existing names, categories, variants, image references and order preserved.
--   * IDEMPOTENT: `on conflict ... do nothing` everywhere, so re-running never
--     overwrites later administrator edits.
--   * No business information is invented (opening hours / social links omitted
--     because the project does not currently contain them).
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Categories (display order = position in MENU_CATEGORIES)
-- -----------------------------------------------------------------------------
insert into public.categories (name, slug, display_order, is_active)
values
  ('Soups & Traditional Meals', 'soups-traditional-meals', 1, true),
  ('Grilled & Roasted',         'grilled-roasted',         2, true),
  ('Rice & Main Dishes',        'rice-main-dishes',        3, true),
  ('Bakery & Snacks',           'bakery-snacks',           4, true),
  ('Cakes & Desserts',          'cakes-desserts',          5, true)
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- Products (slug = existing MENU_ITEMS id; display_order is per-category)
-- -----------------------------------------------------------------------------
insert into public.products
  (category_id, name, slug, short_description, full_description, image_path, price_php, is_available, display_order)
select
  c.id, v.name, v.slug, v.short_description, v.full_description, v.image_path, null, true, v.display_order
from (values
  -- 1. Soups & Traditional Meals
  ('beef-leg-pepper-soup', 'Beef Leg Pepper Soup', 'soups-traditional-meals',
   'Homemade slow-simmered beef leg pepper soup served hot in traditional style.',
   'Traditional homemade beef leg pepper soup prepared fresh by ANN BAKERY HOUSE. Contact us via WhatsApp to confirm serving size and current price in PHP (₱).',
   '/src/assets/images/beef-leg-pepper-soup.jpg', 1),
  ('bitter-leaf-soup', 'Bitter Leaf Soup with Rice or Fried Plantain', 'soups-traditional-meals',
   'Traditional homemade bitter leaf soup paired with your choice of rice or fried plantain.',
   'Authentic homemade bitter leaf soup prepared fresh and served with your choice of rice or fried plantain. Confirm your preferred side and pricing via WhatsApp.',
   '/src/assets/images/dish_ndole_plantain_1795577910602.jpg', 2),
  ('pepper-soup-catfish', 'Pepper Soup Catfish', 'soups-traditional-meals',
   'Homemade catfish pepper soup prepared fresh in warm, comforting traditional broth.',
   'Freshly cooked homemade pepper soup with catfish, prepared to order in our kitchen. Message us on WhatsApp to confirm availability and pricing in PHP (₱).',
   '/src/assets/images/food_catfish_pepper_soup_1795578363047.jpg', 3),

  -- 2. Grilled & Roasted
  ('roasted-fish', 'Roasted Fish', 'grilled-roasted',
   'Freshly seasoned and roasted fish prepared homemade to order.',
   'Whole roasted fish prepared fresh in our kitchen. Confirm portion size, preparation time, and pricing in PHP (₱) directly via WhatsApp.',
   '/src/assets/images/food_roasted_fish_1795578364366.jpg', 1),
  ('roasted-chicken', 'Roasted Chicken', 'grilled-roasted',
   'Tender homemade roasted chicken cooked fresh until golden and savory.',
   'Freshly roasted chicken prepared with care for family meals or individual orders. Reach out via WhatsApp to confirm portions and PHP (₱) pricing.',
   '/src/assets/images/food_roasted_chicken_1795578364862.jpg', 2),
  ('roasted-bars', 'Roasted Bars', 'grilled-roasted',
   'Freshly roasted bar fish prepared homemade and served warm.',
   'Whole roasted bar fish prepared fresh to order. Contact ANN BAKERY HOUSE on WhatsApp for fresh quote confirmation in PHP (₱).',
   '/src/assets/images/food_roasted_bars_1795578365351.jpg', 3),
  ('brocette-soya', 'Brocette Soya', 'grilled-roasted',
   'Grilled skewered beef soya prepared fresh in traditional style.',
   'Homemade grilled beef skewers (Brocette Soya) cooked fresh to order. Message us via WhatsApp to confirm order quantities and PHP (₱) pricing.',
   '/src/assets/images/food_brochette_soya_1795578365416.jpg', 4),

  -- 3. Rice & Main Dishes
  ('fried-rice-chicken-or-fish', 'Fried Rice with Chicken or Fish', 'rice-main-dishes',
   'Homemade fried rice served with your choice of chicken or fish.',
   'Freshly prepared homemade fried rice paired with your selection of chicken or fish. Confirm your choice and PHP (₱) quote directly on WhatsApp.',
   '/src/assets/images/food_fried_rice_chicken_fish_1795578366156.jpg', 1),
  ('vegetable-plantain-or-rice', 'Vegetable with Fried Plantain or Rice', 'rice-main-dishes',
   'Homemade vegetable dish served with fried plantain or steamed rice.',
   'Hearty homemade vegetable main dish paired with your preference of fried plantain or rice. Confirm your choice and current pricing via WhatsApp.',
   '/src/assets/images/food_vegetable_plantain_rice_1795578366072.jpg', 2),

  -- 4. Bakery & Snacks
  ('donut-sugar-option', 'Donut with Sugar / Without Sugar', 'bakery-snacks',
   'Freshly fried homemade donuts, available with sugar or without sugar.',
   'Soft, golden homemade donuts fried fresh in small batches. Select either With Sugar or Without Sugar and confirm batch quantity via WhatsApp.',
   '/src/assets/images/donut-with-sugar-without-sugar.jpg', 1),
  ('pain-soya', 'Pain Soya', 'bakery-snacks',
   'Freshly baked bread filled with savory grilled beef soya.',
   'Homemade bakery bread filled generously with freshly grilled beef soya. Confirm availability and pricing in PHP (₱) on WhatsApp.',
   '/src/assets/images/bakery_pain_soya_1795578366997.jpg', 2),
  ('french-baguettes', 'French Baguettes', 'bakery-snacks',
   'Freshly baked golden French baguettes with a crisp crust and soft interior.',
   'Hand-shaped French baguettes baked fresh at ANN BAKERY HOUSE. Message us via WhatsApp to reserve loaves or confirm pricing in PHP (₱).',
   '/src/assets/images/bakery_french_baguettes_1795578367695.jpg', 3),
  ('empanada', 'Empanada', 'bakery-snacks',
   'Golden baked homemade savory pastry pockets prepared fresh.',
   'Handcrafted homemade empanadas baked until golden brown. Contact us via WhatsApp to confirm batch quantities and PHP (₱) pricing.',
   '/src/assets/images/bakery_meat_pies_1795577911737.jpg', 4),
  ('neems-beef', 'Neems Beef', 'bakery-snacks',
   'Crispy golden homemade beef rolls fried fresh to order.',
   'Crunchy handmade Neems Beef fried until golden and crisp. Confirm pack size and current PHP (₱) price via WhatsApp.',
   '/src/assets/images/bakery_neems_beef_1795578427671.jpg', 5),
  ('beef-rolls', 'Beef Rolls', 'bakery-snacks',
   'Baked golden homemade pastry rolls filled with savory beef.',
   'Flaky homemade bakery rolls wrapped around savory beef and baked fresh. Confirm piece count and PHP (₱) pricing on WhatsApp.',
   '/src/assets/images/bakery_beef_rolls_1795578427177.jpg', 6),

  -- 5. Cakes & Desserts
  ('lemon-cake', 'Lemon Cake', 'cakes-desserts',
   'Freshly baked homemade lemon cake with bright citrus flavor.',
   'Moist homemade lemon cake baked fresh in our bakery. Message us on WhatsApp to confirm cake sizes and PHP (₱) pricing.',
   '/src/assets/images/cake_lemon_cake_1795578427248.jpg', 1),
  ('mabre-cake', 'Mabre Cake', 'cakes-desserts',
   'Classic homemade swirled marble cake baked fresh.',
   'Traditional homemade mabre (marble) cake with tender crumb and rich cocoa swirl. Confirm availability and PHP (₱) quote via WhatsApp.',
   '/src/assets/images/cake_mabre_cake_1795578368945.jpg', 2),
  ('yaourt-cake', 'Yaourt Cake', 'cakes-desserts',
   'Soft, tender homemade yogurt cake baked fresh.',
   'Light and moist homemade yaourt (yogurt) cake prepared fresh for family or events. Confirm sizing and PHP (₱) pricing via WhatsApp.',
   '/src/assets/images/cake_yaourt_cake_1795578428128.jpg', 3),
  ('coconut-cake', 'Coconut Cake', 'cakes-desserts',
   'Freshly baked homemade coconut cake with rich tropical aroma.',
   'Moist homemade coconut cake prepared fresh to order. Contact ANN BAKERY HOUSE via WhatsApp to confirm sizing and PHP (₱) pricing.',
   '/src/assets/images/cake_coconut_cake_1795578427535.jpg', 4)
) as v (slug, name, category_slug, short_description, full_description, image_path, display_order)
join public.categories c on c.slug = v.category_slug
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- Product options / variants (only the 4 products that define options)
-- -----------------------------------------------------------------------------
insert into public.product_options (product_id, group_label, name, display_order)
select p.id, v.group_label, v.name, v.display_order
from (values
  ('bitter-leaf-soup',            'Choose Side',    'Rice',           1),
  ('bitter-leaf-soup',            'Choose Side',    'Fried Plantain', 2),
  ('fried-rice-chicken-or-fish',  'Choose Protein', 'Chicken',        1),
  ('fried-rice-chicken-or-fish',  'Choose Protein', 'Fish',           2),
  ('vegetable-plantain-or-rice',  'Choose Side',    'Fried Plantain', 1),
  ('vegetable-plantain-or-rice',  'Choose Side',    'Rice',           2),
  ('donut-sugar-option',          'Sugar Option',   'With Sugar',     1),
  ('donut-sugar-option',          'Sugar Option',   'Without Sugar',  2)
) as v (product_slug, group_label, name, display_order)
join public.products p on p.slug = v.product_slug
on conflict (product_id, group_label, name) do nothing;

-- -----------------------------------------------------------------------------
-- site_settings — existing business information and section copy, verbatim.
-- (No opening hours / social links: the project does not currently store them.)
-- -----------------------------------------------------------------------------
insert into public.site_settings (key, value, description)
values
  ('business_name',     '"ANN BAKERY HOUSE"'::jsonb,                          'Public business name'),
  ('tagline',           '"Authentic Flavors. Homemade with Love."'::jsonb,    'Short brand tagline'),
  ('business_type',     '"African Homemade Food & Bakery"'::jsonb,            'Business category description'),
  ('address',           '"1203 St Peter Street, Holy Family Village, Taguig City, Philippines"'::jsonb, 'Full street address'),
  ('short_address',     '"Holy Family Village, Taguig City"'::jsonb,          'Short location label'),
  ('whatsapp_display',  '"+63 954 143 8031"'::jsonb,                          'WhatsApp number as displayed'),
  ('whatsapp_digits',   '"639541438031"'::jsonb,                              'WhatsApp number, digits only (wa.me)'),
  ('currency',          '"₱"'::jsonb,                                         'Currency symbol'),
  ('currency_code',     '"PHP"'::jsonb,                                       'ISO currency code'),
  ('price_pending_text','"Price to be confirmed"'::jsonb,                     'Shown when price is not set'),
  ('hero',
   '{"image":"/src/assets/images/hero_bakery_grill_feast_1795580217636.jpg","title":"Authentic Flavors. Homemade with Love.","subtitle":"Discover freshly baked delights and delicious homemade meals, prepared with care and served with love."}'::jsonb,
   'Homepage hero content'),
  ('about',
   '{"heading":"More Than a Bakery, A Taste of Home","body":"At ANN BAKERY HOUSE, we bring together the warmth of homemade baking and the pleasure of delicious meals. From freshly baked delights to flavorful traditional dishes, every offering is made to bring people together.","main_image":"/src/assets/images/hero_ann_bakery_spread_1795577909113.jpg","bakery_image":"/src/assets/images/bakery_french_baguettes_1795578367695.jpg","meal_image":"/src/assets/images/dish_jollof_chicken_1795577910617.jpg"}'::jsonb,
   'About section content'),
  ('contact',
   '{"heading":"Visit Us or Get in Touch","intro":"We would love to hear from you! Contact ANN BAKERY HOUSE for enquiries and orders, or visit us at our location in Taguig City.","map_embed_url":"https://www.openstreetmap.org/export/embed.html?bbox=121.0565%2C14.4785%2C121.0630%2C14.4830&layer=mapnik&marker=14.4806477%2C121.0597503"}'::jsonb,
   'Contact section content')
on conflict (key) do nothing;

commit;
