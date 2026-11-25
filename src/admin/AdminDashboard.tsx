import { useState } from 'react';
import {
  ExternalLink,
  FileText,
  FolderTree,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  MessageSquare,
  Package,
  Settings as SettingsIcon,
  X,
} from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { signOutAdmin, type AdminSessionInfo } from '../lib/auth';
import CategoriesSection from './sections/CategoriesSection';
import ContentSection from './sections/ContentSection';
import MediaSection from './sections/MediaSection';
import OverviewSection from './sections/OverviewSection';
import ProductsSection from './sections/ProductsSection';
import ReviewsSection from './sections/ReviewsSection';
import SettingsSection from './sections/SettingsSection';
import { Button } from './ui';

type SectionId =
  | 'overview'
  | 'products'
  | 'categories'
  | 'reviews'
  | 'content'
  | 'settings'
  | 'media';

interface NavItem {
  id: SectionId;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'categories', label: 'Categories', icon: FolderTree },
  { id: 'reviews', label: 'Reviews', icon: MessageSquare },
  { id: 'content', label: 'Website Content', icon: FileText },
  { id: 'settings', label: 'Business Settings', icon: SettingsIcon },
  { id: 'media', label: 'Media Library', icon: ImageIcon },
];

/**
 * Protected dashboard shell: brand-styled header, section navigation and the
 * active section.
 *
 * Desktop keeps the persistent sidebar. Mobile uses a compact top bar (showing
 * the active section) plus a slide-out drawer, so the seven sections remain
 * reachable without an oversized dropdown or horizontal overflow.
 */
export default function AdminDashboard({ session }: { session: AdminSessionInfo }) {
  const [active, setActive] = useState<SectionId>('overview');
  const [menuOpen, setMenuOpen] = useState(false);

  const current = NAV.find((item) => item.id === active);

  const select = (id: SectionId) => {
    setActive(id);
    setMenuOpen(false);
  };

  const handleSignOut = () => {
    void signOutAdmin();
  };

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#111111]">
      <header className="sticky top-0 z-30 border-b border-[#E8DFC8] bg-[#FFFDF9]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open dashboard navigation"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#DDD4BE] bg-[#FFFDF9] text-[#111111] hover:border-[#FD8F00] lg:hidden"
            >
              <MenuIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            <BrandLogo size="compact" />
            <div className="hidden min-w-0 sm:block">
              <p className="font-display text-lg font-bold leading-none text-[#111111]">
                Owner Dashboard
              </p>
              <p className="mt-1 truncate text-[11px] text-[#5C5952]">{session.email}</p>
            </div>
            <p className="truncate font-semibold text-[#111111] sm:hidden">{current?.label}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <a
              href="/"
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#DDD4BE] bg-[#FFFDF9] px-3 text-xs font-semibold text-[#5C5952] hover:border-[#FD8F00] hover:text-[#111111]"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">View site</span>
            </a>
            <Button variant="secondary" onClick={handleSignOut} className="min-h-[38px] px-3 text-xs">
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile: slide-out navigation drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Dashboard navigation">
          <div
            className="absolute inset-0 bg-[#111111]/60 backdrop-blur-xs"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="absolute inset-y-0 left-0 flex w-72 max-w-[82vw] flex-col bg-[#FAF6EE] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E8DFC8] px-4 py-3">
              <BrandLogo size="compact" />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close dashboard navigation"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#DDD4BE] bg-[#FFFDF9] text-[#111111] hover:border-[#AF140B] hover:text-[#AF140B]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {NAV.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => select(item.id)}
                    className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-[#AF140B] text-[#FFFDF9]'
                        : 'text-[#5C5952] hover:bg-[#FFFDF9] hover:text-[#111111]'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-[#E8DFC8] p-3">
              <p className="truncate px-1 text-[11px] text-[#5C5952]">{session.email}</p>
            </div>
          </nav>
        </div>
      )}

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-6 sm:px-6 sm:py-8">
        {/* Desktop: sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="sticky top-24 space-y-1" aria-label="Dashboard sections">
            {NAV.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => select(item.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-[#AF140B] text-[#FFFDF9]'
                      : 'text-[#5C5952] hover:bg-[#FFFDF9] hover:text-[#111111]'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          {active === 'overview' && <OverviewSection session={session} onNavigate={setActive} />}
          {active === 'products' && <ProductsSection session={session} />}
          {active === 'categories' && <CategoriesSection session={session} />}
          {active === 'reviews' && <ReviewsSection session={session} />}
          {active === 'content' && <ContentSection session={session} />}
          {active === 'settings' && <SettingsSection session={session} />}
          {active === 'media' && <MediaSection session={session} />}
        </main>
      </div>
    </div>
  );
}
