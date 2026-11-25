import { useState } from 'react';
import { ArrowRight, UtensilsCrossed } from 'lucide-react';
import { MENU_ITEMS, MenuCategory } from '../data/menu';

interface CategoryShowcaseProps {
  onSelectCategory: (category: MenuCategory) => void;
}

interface CategoryPreviewConfig {
  displayTitle: string;
  category: MenuCategory;
  subtitle: string;
  image: string;
}

const CATEGORY_PREVIEWS: CategoryPreviewConfig[] = [
  {
    displayTitle: 'Traditional Meals',
    category: 'Soups & Traditional Meals',
    subtitle: 'Slow-simmered pepper soups and traditional bitter leaf soup.',
    image: '/src/assets/images/food_beef_leg_pepper_soup_1795578362702.jpg',
  },
  {
    displayTitle: 'Grilled & Roasted',
    category: 'Grilled & Roasted',
    subtitle: 'Roasted fish, roasted chicken, roasted bars, and brochette soya.',
    image: '/src/assets/images/food_roasted_fish_1795578364366.jpg',
  },
  {
    displayTitle: 'Rice & Main Dishes',
    category: 'Rice & Main Dishes',
    subtitle: 'Savory fried rice and homestyle vegetables with plantain or rice.',
    image: '/src/assets/images/food_fried_rice_chicken_fish_1795578366156.jpg',
  },
  {
    displayTitle: 'Bakery & Snacks',
    category: 'Bakery & Snacks',
    subtitle: 'French baguettes, pain soya, donuts, empanada, beef rolls, and nems.',
    image: '/src/assets/images/bakery_french_baguettes_1795578367695.jpg',
  },
  {
    displayTitle: 'Cakes & Desserts',
    category: 'Cakes & Desserts',
    subtitle: 'Homemade lemon, mabre, yaourt, and coconut cakes baked fresh.',
    image: '/src/assets/images/cake_lemon_cake_1795578427248.jpg',
  },
];

export default function CategoryShowcase({ onSelectCategory }: CategoryShowcaseProps) {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const handleChoose = (category: MenuCategory) => {
    onSelectCategory(category);
    const menuEl = document.getElementById('menu');
    if (menuEl) {
      menuEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      aria-labelledby="freshly-made-heading"
      className="border-b border-[#E8DFC8] bg-[#FFFDF9] py-12 sm:py-16 md:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#AF140B] uppercase">
              Kitchen & Bakery Highlights
            </p>
            <h2
              id="freshly-made-heading"
              className="font-display text-balance mt-1 text-3xl font-bold text-[#111111] sm:text-4xl md:text-5xl"
            >
              Freshly Made, Just for You
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5C5952] sm:text-base">
              Swipe or tap any category below to jump straight to our homemade dishes and fresh bakes.
            </p>
          </div>

          <a
            href="#menu"
            className="inline-flex min-h-[42px] w-fit items-center gap-2 whitespace-nowrap text-sm font-semibold text-[#AF140B] underline-offset-4 transition-colors hover:text-[#111111] hover:underline"
          >
            <span>View Full 19-Item Menu</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        {/* Mobile: horizontal snap-scroll carousel; Tablet/Desktop: balanced 2-col / 6-col grid */}
        <div className="no-scrollbar mt-7 -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:mt-10 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6">
          {CATEGORY_PREVIEWS.map((preview, idx) => {
            const count = MENU_ITEMS.filter(
              (item) => item.category === preview.category,
            ).length;
            const colSpanClass = idx < 3 ? 'lg:col-span-2' : 'lg:col-span-3';
            const isFailed = failedImages[preview.category];

            return (
              <button
                key={preview.category}
                type="button"
                onClick={() => handleChoose(preview.category)}
                className={`group flex w-[76vw] max-w-[280px] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-[#E8DFC8] bg-[#FAF6EE] text-left shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-[#FD8F00] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD8F00] sm:w-auto sm:max-w-none sm:shrink ${colSpanClass}`}
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#EFE7D4]">
                  {!isFailed ? (
                    <img
                      src={preview.image}
                      alt={preview.displayTitle}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                      onError={() =>
                        setFailedImages((prev) => ({
                          ...prev,
                          [preview.category]: true,
                        }))
                      }
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#F2EBDC] text-[#5C5952]">
                      <UtensilsCrossed className="h-8 w-8" aria-hidden="true" />
                    </div>
                  )}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/60 via-transparent to-transparent"
                  />
                  <span className="tabular-nums absolute bottom-2.5 left-3.5 text-xs font-semibold tracking-wider text-[#FDD364] uppercase">
                    {count} {count === 1 ? 'Item' : 'Items'}
                  </span>
                </div>

                <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
                  <div>
                    <h3 className="font-display text-2xl font-bold text-[#111111] transition-colors group-hover:text-[#AF140B]">
                      {preview.displayTitle}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[#5C5952]">
                      {preview.subtitle}
                    </p>
                  </div>

                  <div className="mt-3.5 flex items-center gap-1.5 text-xs font-bold tracking-wide text-[#AF140B] uppercase">
                    <span>Explore {preview.displayTitle}</span>
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
