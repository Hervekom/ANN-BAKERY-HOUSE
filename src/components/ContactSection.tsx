import { useState } from 'react';
import {
  ExternalLink,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import { BUSINESS_INFO } from '../data/menu';

const OFFICIAL_WHATSAPP_URL = `https://wa.me/${BUSINESS_INFO.whatsappDigits}`;
const OFFICIAL_PHONE_HREF = `tel:+${BUSINESS_INFO.whatsappDigits}`;
const OFFICIAL_QUERY = encodeURIComponent(BUSINESS_INFO.address);
const GOOGLE_DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${OFFICIAL_QUERY}`;
const GOOGLE_MAPS_SEARCH_URL = `https://www.google.com/maps/search/?api=1&query=${OFFICIAL_QUERY}`;

// Verified Nominatim coordinates for Saint Peter Street, Holy Family Village, Taguig City, Philippines
const OSM_EMBED_URL =
  'https://www.openstreetmap.org/export/embed.html?bbox=121.0565%2C14.4785%2C121.0630%2C14.4830&layer=mapnik&marker=14.4806477%2C121.0597503';

export default function ContactSection() {
  const [mapLoadFailed, setMapLoadFailed] = useState(false);

  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="border-t border-[#FDD364]/20 bg-[#000000] py-12 text-[#FFFDF9] sm:py-16 md:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center lg:gap-12">
          {/* Left Column: Brand, Contact Info & Direct WhatsApp Action */}
          <div className="lg:col-span-6">
            <div className="mb-4">
              <BrandLogo size="default" />
            </div>

            <p className="text-xs font-semibold tracking-[0.16em] text-[#FDD364] uppercase">
              Contact &amp; Location
            </p>
            <h2
              id="contact-heading"
              className="font-display text-balance mt-2 text-3xl font-bold text-[#FFFDF9] sm:text-4xl md:text-5xl"
            >
              Visit Us or Get in Touch
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#FAF6EE]/85 sm:text-base">
              We would love to hear from you! Contact {BUSINESS_INFO.name} for enquiries and orders,
              or visit us at our location in Taguig City.
            </p>

            {/* Official Details Cards */}
            <div className="mt-6 space-y-4 rounded-2xl border border-[#FDD364]/20 bg-[#0D0D0D] p-5 sm:p-6">
              <div className="flex items-start gap-3.5">
                <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FDD364]/15 text-[#FDD364]">
                  <MapPin className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold tracking-[0.14em] text-[#FDD364] uppercase">
                    {BUSINESS_INFO.name}
                  </p>
                  <address className="mt-1 not-italic text-sm leading-relaxed text-[#FFFDF9] sm:text-base">
                    1203 St Peter Street,
                    <br />
                    Holy Family Village,
                    <br />
                    Taguig City, Philippines.
                  </address>
                </div>
              </div>

              <div className="border-t border-[#FDD364]/15 pt-4">
                <div className="flex items-start gap-3.5">
                  <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FD8F00]/20 text-[#FD8F00]">
                    <Phone className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold tracking-[0.14em] text-[#FDD364] uppercase">
                      WhatsApp &amp; Phone
                    </p>
                    <a
                      href={OFFICIAL_PHONE_HREF}
                      className="tabular-nums mt-1 inline-flex min-h-[36px] items-center text-base font-semibold text-[#FFFDF9] underline decoration-[#FDD364]/45 underline-offset-4 transition-colors hover:text-[#FDD364]"
                    >
                      +{BUSINESS_INFO.whatsappDigits}
                    </a>
                    <p className="text-xs text-[#FAF6EE]/65">
                      Tap the number to call on mobile or message us directly on WhatsApp.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Prominent WhatsApp CTA */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href={OFFICIAL_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#FD8F00] px-6 py-3 text-sm font-bold text-[#111111] shadow-sm transition-colors hover:bg-[#FDD364] sm:w-auto"
              >
                <MessageCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>Chat With Us on WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Right Column: Interactive Location Map & Directions */}
          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-2xl border border-[#FDD364]/25 bg-[#111111] p-3 shadow-lg sm:p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-[#FD8F00]" aria-hidden="true" />
                  <span className="text-xs font-semibold tracking-[0.12em] text-[#FDD364] uppercase">
                    {BUSINESS_INFO.name} &middot; Taguig City
                  </span>
                </div>
                <span className="text-[11px] text-[#FAF6EE]/70">
                  St Peter St, Holy Family Village
                </span>
              </div>

              {mapLoadFailed ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-[#FDD364]/15 bg-[#1A1814] p-6 text-center sm:h-72 lg:h-80">
                  <MapPin className="h-8 w-8 text-[#FDD364]" aria-hidden="true" />
                  <p className="mt-3 font-display text-xl font-bold text-[#FFFDF9]">
                    {BUSINESS_INFO.name}
                  </p>
                  <p className="mt-1 max-w-sm text-sm text-[#FAF6EE]/80">
                    1203 St Peter Street, Holy Family Village, Taguig City, Philippines.
                  </p>
                  <a
                    href={GOOGLE_MAPS_SEARCH_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#FDD364] px-4 py-2 text-xs font-bold text-[#111111] transition-colors hover:bg-[#FD8F00]"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Open Location in Google Maps</span>
                  </a>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-xl border border-[#FDD364]/20 bg-[#1B1915]">
                  <iframe
                    src={OSM_EMBED_URL}
                    title="Map showing Saint Peter Street, Holy Family Village, Taguig City, Philippines"
                    loading="lazy"
                    onError={() => setMapLoadFailed(true)}
                    className="h-64 w-full border-0 sm:h-72 lg:h-80"
                  />
                </div>
              )}

              <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <a
                  href={GOOGLE_DIRECTIONS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#FDD364] px-4 py-2.5 text-xs font-bold text-[#111111] transition-colors hover:bg-[#FD8F00]"
                >
                  <Navigation className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Get Directions</span>
                </a>

                <a
                  href={GOOGLE_MAPS_SEARCH_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-[#FDD364]/30 bg-[#1A1A1A] px-4 py-2.5 text-xs font-semibold text-[#FFFDF9] transition-colors hover:border-[#FDD364] hover:text-[#FDD364]"
                >
                  <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>View on Google Maps</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
