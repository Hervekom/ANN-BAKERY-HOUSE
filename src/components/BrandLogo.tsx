import { useState } from 'react';

interface BrandLogoProps {
  size?: 'compact' | 'default';
}

const OFFICIAL_LOGO_SRC =
  '/assets/aistudio/Logo_de_boulangerie_ANN_Bakery_House_764aa509.png';

export default function BrandLogo({ size = 'compact' }: BrandLogoProps) {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <span className="inline-flex flex-col items-start whitespace-nowrap shrink-0 select-none">
        <span
          className={`font-display font-bold tracking-[0.14em] leading-none text-[#FDD364] ${
            size === 'compact' ? 'text-[1.35rem] sm:text-2xl' : 'text-3xl sm:text-4xl'
          }`}
        >
          ANN
        </span>
        <span className="mt-1 flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={`h-[2px] bg-[#FD8F00] ${size === 'compact' ? 'w-3' : 'w-4'}`}
          />
          <span
            className={`font-sans font-semibold uppercase tracking-[0.22em] leading-none text-[#FFFDF9] ${
              size === 'compact' ? 'text-[9px] sm:text-[10px]' : 'text-[11px]'
            }`}
          >
            BAKERY HOUSE
          </span>
        </span>
      </span>
    );
  }

  return (
    <img
      src={OFFICIAL_LOGO_SRC}
      alt="ANN BAKERY HOUSE"
      referrerPolicy="no-referrer"
      onError={() => setImgError(true)}
      className={`w-auto object-contain shrink-0 select-none ${
        size === 'compact' ? 'h-11 sm:h-12' : 'h-20 sm:h-24'
      }`}
    />
  );
}
