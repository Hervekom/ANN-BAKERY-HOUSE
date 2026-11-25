import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, MapPin, MessageCircle, UtensilsCrossed } from 'lucide-react';
import { BUSINESS_INFO } from '../data/menu';
import type { SiteSettings } from '../lib/content';

const FALLBACK_HERO_IMAGE = '/src/assets/images/hero_bakery_grill_feast_1795580217636.jpg';

/**
 * Hero section. Content is supplied by the public content loader when Supabase
 * is available, otherwise it falls back to the bundled defaults — identical to
 * the original design.
 */
export default function HeroSection({ settings }: { settings?: SiteSettings }) {
  const [heroImgError, setHeroImgError] = useState(false);

  const heroImage = settings?.hero.image || FALLBACK_HERO_IMAGE;
  const title = settings?.hero.title || BUSINESS_INFO.tagline;
  const subtitle =
    settings?.hero.subtitle ||
    'Discover freshly baked delights and delicious homemade meals, prepared with care and served with love.';
  const businessName = settings?.business_name || BUSINESS_INFO.name;
  const shortAddress = settings?.short_address || BUSINESS_INFO.shortAddress;
  const address = settings?.address || BUSINESS_INFO.address;
  const businessType = settings?.business_type || BUSINESS_INFO.type;
  const currency = settings?.currency || BUSINESS_INFO.currency;
  const whatsappDisplay = settings?.whatsapp_display || BUSINESS_INFO.whatsappDisplay;
  const whatsappDigits = settings?.whatsapp_digits || BUSINESS_INFO.whatsappDigits;
  const whatsappUrl = `https://wa.me/${whatsappDigits}`;

  return (
    <section className="relative flex flex-col justify-between overflow-hidden bg-[#0B0B0B] text-[#FFFDF9] md:min-h-[78vh] lg:min-h-[84vh]">
      {/* Full-bleed Culinary & Bakery Photography */}
      <div className="absolute inset-0">
        {!heroImgError ? (
          <motion.img
            initial={{ scale: 1.03, opacity: 0.9 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            src={heroImage}
            alt={`${businessName} — freshly baked goods and homemade dishes`}
            referrerPolicy="no-referrer"
            fetchPriority="high"
            decoding="async"
            onError={() => setHeroImgError(true)}
            className="h-full w-full object-cover object-center"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[#111111] via-[#1C1A15] to-[#AF140B]" />
        )}

        {/* Measured Contrast Scrim for crisp mobile & desktop legibility */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/92 via-[#111111]/80 to-[#111111]/40 md:to-[#111111]/25"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/85 via-[#0A0A0A]/25 to-[#0A0A0A]/35"
        />
      </div>

      {/* Main Hero Content - sized so headline + CTAs fit immediately on smartphones */}
      <div className="relative mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-10 sm:px-6 sm:py-16 md:py-24 lg:py-28">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mb-3 flex items-center gap-2.5 sm:mb-4 sm:gap-3"
          >
            <span aria-hidden="true" className="h-[2px] w-6 bg-[#FD8F00] sm:w-8" />
            <p className="text-[11px] font-semibold tracking-[0.15em] text-[#FDD364] uppercase sm:text-xs sm:tracking-[0.18em]">
              {businessName} · {shortAddress}
            </p>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-balance text-[2.1rem] font-bold leading-[1.08] tracking-tight text-[#FFFDF9] sm:text-5xl md:text-6xl lg:text-[4.5rem]"
          >
            {title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="mt-3.5 max-w-xl text-sm leading-relaxed text-[#F5EFE0] sm:mt-5 sm:text-lg"
          >
            {subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center sm:gap-3.5"
          >
            <a
              href="#menu"
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-lg bg-[#FD8F00] px-6 py-3 text-sm font-bold text-[#111111] shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#FDD364] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFFDF9] sm:w-auto sm:px-7"
            >
              <span>Explore Menu</span>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-lg border border-[#FDD364]/75 bg-[#AF140B] px-6 py-3 text-sm font-semibold text-[#FFFDF9] shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#8E1009] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDD364] sm:w-auto sm:px-7"
            >
              <MessageCircle className="h-4 w-4 shrink-0 text-[#FDD364]" aria-hidden="true" />
              <span>Order on WhatsApp</span>
            </a>
          </motion.div>
        </div>
      </div>

      {/* Bottom Essential Business Strip */}
      <div className="relative border-t border-[#FDD364]/25 bg-[#0A0A0A]/90 backdrop-blur-xs">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-2.5 px-4 py-3 text-xs text-[#FAF6EE] sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-4 sm:text-sm">
          <div className="flex items-start gap-2 sm:items-center">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#FDD364] sm:mt-0" aria-hidden="true" />
            <span>{address}</span>
          </div>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 transition-colors hover:text-[#FDD364]"
          >
            <MessageCircle className="h-4 w-4 shrink-0 text-[#FDD364]" aria-hidden="true" />
            <span className="tabular-nums">WhatsApp: {whatsappDisplay}</span>
          </a>
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 shrink-0 text-[#FDD364]" aria-hidden="true" />
            <span>
              {businessType} · PHP ({currency})
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
