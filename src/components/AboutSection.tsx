import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, MapPin, UtensilsCrossed } from 'lucide-react';
import { BUSINESS_INFO } from '../data/menu';
import type { SiteSettings } from '../lib/content';

const OFFERINGS = [
  {
    number: '01',
    title: 'Freshly Baked Delights',
    description:
      'Discover our selection of breads, cakes and delicious bakery treats.',
  },
  {
    number: '02',
    title: 'Flavorful Meals',
    description:
      'Enjoy satisfying meals and traditional food prepared with care.',
  },
  {
    number: '03',
    title: 'Made with Love',
    description:
      'Every offering reflects our passion for good food and warm hospitality.',
  },
] as const;

const ABOUT_PHOTOS = {
  main: {
    src: '/src/assets/images/hero_ann_bakery_spread_1795577909113.jpg',
    alt: 'Warm homemade spread of freshly baked breads, pastries, and traditional dishes at ANN BAKERY HOUSE',
  },
  bakery: {
    src: '/src/assets/images/bakery_french_baguettes_1795578367695.jpg',
    alt: 'Freshly baked golden French baguettes straight from the bakery oven',
  },
  meal: {
    src: '/src/assets/images/dish_jollof_chicken_1795577910617.jpg',
    alt: 'Satisfying homemade prepared meal with savory roasted chicken and rice',
  },
} as const;

export default function AboutSection({ settings }: { settings?: SiteSettings }) {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const businessName = settings?.business_name || BUSINESS_INFO.name;
  const address = settings?.address || BUSINESS_INFO.address;
  const heading = settings?.about.heading || 'More Than a Bakery, A Taste of Home';
  const body =
    settings?.about.body ||
    'At ANN BAKERY HOUSE, we bring together the warmth of homemade baking and the pleasure of delicious meals. From freshly baked delights to flavorful traditional dishes, every offering is made to bring people together.';
  const mainImage = settings?.about.main_image || ABOUT_PHOTOS.main.src;
  const bakeryImage = settings?.about.bakery_image || ABOUT_PHOTOS.bakery.src;
  const mealImage = settings?.about.meal_image || ABOUT_PHOTOS.meal.src;

  const markFailed = (key: string) => {
    setFailedImages((prev) => ({ ...prev, [key]: true }));
  };

  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="border-t border-[#E8DFC8] bg-[#FFFDF9] py-12 sm:py-16 md:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Editorial Story & Business Location */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6"
          >
            <div className="flex items-center gap-2.5">
              <span aria-hidden="true" className="h-[2px] w-6 bg-[#FD8F00]" />
              <p className="text-xs font-semibold tracking-[0.16em] text-[#AF140B] uppercase">
                About Us
              </p>
            </div>

            <h2
              id="about-heading"
              className="font-display text-balance mt-2.5 text-3xl font-bold leading-[1.12] text-[#111111] sm:text-4xl md:text-5xl"
            >
              {heading}
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#5C5952] sm:text-base">
              {body}
            </p>

            {/* Official Address & Menu Navigation */}
            <div className="mt-6 border-t border-[#E8DFC8] pt-5 sm:mt-7 sm:pt-6">
              <div className="flex items-start gap-2.5 text-sm text-[#5C5952]">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#AF140B]"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold text-[#111111]">
                    {businessName}
                  </p>
                  <p className="mt-0.5 leading-relaxed">
                    {address}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <a
                  href="#menu"
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#AF140B] px-6 py-3 text-sm font-semibold text-[#FFFDF9] shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#8E1009] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD8F00] sm:w-auto"
                >
                  <span>Explore Our Menu</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#FDD364]" aria-hidden="true" />
                </a>
              </div>
            </div>
          </motion.div>

          {/* Photography Composition */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3 sm:space-y-4 lg:col-span-6"
          >
            <div className="aspect-[16/10] w-full overflow-hidden rounded-xl border border-[#E8DFC8] bg-[#FAF6EE]">
              {!failedImages.main ? (
                <img
                  src={mainImage}
                  alt={ABOUT_PHOTOS.main.alt}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                  onError={() => markFailed('main')}
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#FAF6EE] to-[#FDD364]/30 text-[#5C5952]">
                  <UtensilsCrossed className="h-10 w-10 text-[#111111]/60" aria-hidden="true" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="aspect-[4/3] w-full overflow-hidden rounded-xl border border-[#E8DFC8] bg-[#FAF6EE]">
                {!failedImages.bakery ? (
                  <img
                    src={bakeryImage}
                    alt={ABOUT_PHOTOS.bakery.alt}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                    onError={() => markFailed('bakery')}
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#FAF6EE] to-[#FDD364]/30 text-[#5C5952]">
                    <UtensilsCrossed className="h-7 w-7 text-[#111111]/60" aria-hidden="true" />
                  </div>
                )}
              </div>

              <div className="aspect-[4/3] w-full overflow-hidden rounded-xl border border-[#E8DFC8] bg-[#FAF6EE]">
                {!failedImages.meal ? (
                  <img
                    src={mealImage}
                    alt={ABOUT_PHOTOS.meal.alt}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                    onError={() => markFailed('meal')}
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#FAF6EE] to-[#FDD364]/30 text-[#5C5952]">
                    <UtensilsCrossed className="h-7 w-7 text-[#111111]/60" aria-hidden="true" />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Our Offerings - Three Highlights */}
        <div className="mt-10 border-t border-[#E8DFC8] pt-8 sm:mt-14 sm:pt-10">
          <div className="mb-6">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#AF140B] uppercase">
              Our Offerings
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
            {OFFERINGS.map((offering, index) => (
              <motion.div
                key={offering.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: 0.45,
                  delay: index * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="rounded-xl border border-[#E8DFC8] bg-[#FAF6EE] p-5 sm:p-6"
              >
                <p className="tabular-nums text-xs font-bold tracking-wider text-[#FD8F00]">
                  {offering.number}
                </p>
                <h3 className="font-display mt-1.5 text-2xl font-bold text-[#111111]">
                  {offering.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5C5952]">
                  {offering.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
