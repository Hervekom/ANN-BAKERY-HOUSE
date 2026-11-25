import { useEffect, useState } from 'react';
import { LogIn, LogOut, Menu, ShoppingBag, User, UserPlus, X } from 'lucide-react';
import BrandLogo from './BrandLogo';
import { CustomerUser } from '../types/account';

interface NavbarProps {
  totalItems: number;
  onOpenBag: () => void;
  user: CustomerUser | null;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenProfile: () => void;
  onSignOut: () => void;
}

const NAV_LINKS = [
  { label: 'Menu', href: '#menu' },
  { label: 'About', href: '#about' },
  { label: 'Reviews', href: '#reviews' },
  { label: 'Pre-Order', href: '#order' },
  { label: 'Contact', href: '#contact' },
];

export default function Navbar({
  totalItems,
  onOpenBag,
  user,
  onOpenAuth,
  onOpenProfile,
  onSignOut,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#FDD364]/25 bg-[#000000]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-6">
        {/* Zone 1: Official Brand Logo */}
        <a
          href="#top"
          aria-label="ANN BAKERY HOUSE home"
          className="shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD8F00]"
        >
          <BrandLogo size="compact" />
        </a>

        {/* Zone 2: Concise Desktop Navigation Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#FFFDF9]"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="whitespace-nowrap shrink-0 py-1 transition-colors duration-150 hover:text-[#FDD364] hover:underline hover:decoration-[#FD8F00] hover:underline-offset-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD8F00]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Desktop Account Links + Bag Action + Mobile Hamburger */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <div className="hidden lg:flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenProfile}
                aria-label="Open customer profile"
                className="inline-flex min-h-[40px] max-w-[160px] items-center gap-1.5 rounded-lg border border-[#FDD364]/35 bg-[#111111] px-3 py-1.5 text-xs font-semibold text-[#FFFDF9] transition-colors hover:border-[#FDD364] hover:text-[#FDD364]"
              >
                <User className="h-3.5 w-3.5 shrink-0 text-[#FDD364]" aria-hidden="true" />
                <span className="truncate">{user.name}</span>
              </button>
              <button
                type="button"
                onClick={onSignOut}
                aria-label="Sign out"
                title="Sign out"
                className="inline-flex min-h-[40px] items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#FAF6EE]/80 transition-colors hover:bg-[#1A1A1A] hover:text-[#FDD364]"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-[#FFFDF9] transition-colors hover:text-[#FDD364]"
              >
                <LogIn className="h-3.5 w-3.5 text-[#FDD364]" aria-hidden="true" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#FDD364]/45 bg-[#111111] px-3 py-1.5 text-xs font-semibold text-[#FDD364] transition-colors hover:bg-[#3C5826] hover:border-[#3C5826] hover:text-[#FFFDF9]"
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Create Account</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenBag}
            aria-label={`Open order bag (${totalItems} items)`}
            className="inline-flex min-h-[42px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-[#AF140B] px-3 py-2 text-xs font-semibold text-[#FFFDF9] shadow-xs transition-colors duration-150 hover:bg-[#8E1009] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD8F00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#000000] sm:gap-2 sm:px-4 sm:text-sm"
          >
            <ShoppingBag className="h-4 w-4 shrink-0 text-[#FDD364]" aria-hidden="true" />
            <span className="hidden sm:inline">Order Bag</span>
            <span className="sm:hidden">Bag</span>
            <span className="tabular-nums text-[#FDD364]">({totalItems})</span>
          </button>

          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex min-h-[42px] min-w-[42px] items-center justify-center rounded-lg border border-[#FDD364]/35 bg-[#111111] text-[#FFFDF9] transition-colors hover:border-[#FD8F00] lg:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation */}
      {mobileMenuOpen && (
        <nav
          id="mobile-nav-drawer"
          aria-label="Mobile navigation"
          className="border-t border-[#FDD364]/20 bg-[#0A0A0A] px-3 py-3 lg:hidden"
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-[46px] items-center justify-between rounded-lg px-3.5 text-base font-medium text-[#FFFDF9] transition-colors hover:bg-[#1A1A1A] hover:text-[#FDD364]"
              >
                <span>{link.label}</span>
                <span aria-hidden="true" className="text-xs font-bold text-[#FD8F00]">
                  →
                </span>
              </a>
            ))}
          </div>

          <div className="mt-3 border-t border-[#FDD364]/15 pt-3">
            {user ? (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenProfile();
                  }}
                  className="flex min-h-[46px] w-full items-center justify-between rounded-lg border border-[#FDD364]/30 bg-[#141414] px-3.5 text-sm font-semibold text-[#FFFDF9]"
                >
                  <span className="flex items-center gap-2 truncate">
                    <User className="h-4 w-4 shrink-0 text-[#FDD364]" aria-hidden="true" />
                    <span className="truncate">Profile ({user.name})</span>
                  </span>
                  <span className="text-xs text-[#FDD364]">Manage</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onSignOut();
                  }}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-[#AF140B]/40 bg-[#1A0D0C] px-3.5 text-sm font-semibold text-[#FFFDF9]"
                >
                  <LogOut className="h-4 w-4 text-[#FD8F00]" aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('login');
                  }}
                  className="inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-lg border border-[#FDD364]/35 bg-[#141414] px-3 text-sm font-semibold text-[#FFFDF9]"
                >
                  <LogIn className="h-4 w-4 text-[#FDD364]" aria-hidden="true" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('register');
                  }}
                  className="inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-lg bg-[#3C5826] px-3 text-sm font-semibold text-[#FFFDF9]"
                >
                  <UserPlus className="h-4 w-4 text-[#FDD364]" aria-hidden="true" />
                  <span>Create Account</span>
                </button>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
