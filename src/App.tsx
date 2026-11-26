/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { CheckCircle2, MessageCircle, Search, Share2, ShoppingBag, X } from 'lucide-react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import MenuCard from './components/MenuCard';
import DishModal from './components/DishModal';
import OrderDrawer, { BagEntry } from './components/OrderDrawer';
import PriceLabel from './components/PriceLabel';
import AboutSection from './components/AboutSection';
import ReviewsSection from './components/ReviewsSection';
import AuthModal, { AuthModalMode } from './components/AuthModal';
import CustomerProfileModal from './components/CustomerProfileModal';
import ContactSection from './components/ContactSection';
import ShareMenu from './components/ShareMenu';
import {
  MENU_ITEMS,
  MenuCategory,
  MenuItem,
  buildWhatsAppUrl,
  getCartKey,
  getUnitPrice,
} from './data/menu';
import { usePublicContent } from './hooks/usePublicContent';
import {
  PlaceOrderInput,
  PlacedOrder,
  SubmitOrderResult,
  placeOrder,
} from './lib/orders';
import {
  fetchApprovedReviews,
  fetchMyReviews,
  logoutCustomer,
} from './services/api';
import { supabase } from './lib/supabase';
import { isAdminUser } from './lib/auth';
import { CustomerReview, CustomerUser } from './types/account';
import {
  SavedWhatsAppOrder,
  clearLastWhatsAppOrder,
  loadLastWhatsAppOrder,
  saveLastWhatsAppOrder,
} from './utils/lastOrderStorage';
import { loadSavedCart, saveCart } from './utils/cartStorage';

type CategoryFilter = 'All' | MenuCategory;

export default function App() {
  const { settings, items, categories } = usePublicContent();

  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    for (const item of MENU_ITEMS) {
      if (item.options && item.options.length > 0) {
        defaults[item.id] = item.options[0].name;
      }
    }
    return defaults;
  });
  const [bag, setBag] = useState<Record<string, BagEntry>>(() => {
    // Restore the visitor's cart from this browser (works without an account).
    // A later effect re-resolves these lines against the live menu.
    const restored: Record<string, BagEntry> = {};
    for (const saved of loadSavedCart()) {
      const key = getCartKey(saved.item.id, saved.selectedOption);
      restored[key] = {
        key,
        item: saved.item,
        selectedOption: saved.selectedOption,
        quantity: saved.quantity,
      };
    }
    return restored;
  });
  const [bagOpen, setBagOpen] = useState(false);
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [lastSavedOrder, setLastSavedOrder] = useState<SavedWhatsAppOrder | null>(
    () => loadLastWhatsAppOrder(),
  );

  // Pre-order / Custom Request state
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquiryDate, setInquiryDate] = useState('');
  const [inquiryType, setInquiryType] = useState<'Pickup' | 'Delivery'>('Pickup');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquiryPrepared, setInquiryPrepared] = useState(false);

  // Customer Accounts & Reviews state
  const [currentUser, setCurrentUser] = useState<CustomerUser | null>(null);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode | null>(null);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [sharingItem, setSharingItem] = useState<MenuItem | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [approvedReviews, setApprovedReviews] = useState<CustomerReview[]>([]);
  const [approvedCount, setApprovedCount] = useState(0);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [myReviews, setMyReviews] = useState<CustomerReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  const refreshReviews = useCallback(async (activeUser: CustomerUser | null) => {
    setLoadingReviews(true);
    try {
      const publicData = await fetchApprovedReviews();
      setApprovedReviews(publicData.reviews);
      setApprovedCount(publicData.stats.approvedCount);
      setAverageRating(publicData.stats.averageRating);

      if (activeUser) {
        const own = await fetchMyReviews();
        setMyReviews(own);
      } else {
        setMyReviews([]);
      }
    } catch {
      // Keep UI interactive if background refresh fails momentarily.
    } finally {
      setLoadingReviews(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;

    // Restore existing Supabase session on mount.
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !isAdminUser(session.user)) {
        const customer = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Customer',
          email: session.user.email || '',
          role: 'customer' as const,
          createdAt: session.user.created_at,
        };
        setCurrentUser(customer);
        void refreshReviews(customer);
      }
    });

    // Listen for auth changes (login, logout, token refresh).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user && !isAdminUser(session.user)) {
        const customer = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Customer',
          email: session.user.email || '',
          role: 'customer' as const,
          createdAt: session.user.created_at,
        };
        setCurrentUser(customer);
        void refreshReviews(customer);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setMyReviews([]);
      } else if (event === 'USER_UPDATED' && session?.user && !isAdminUser(session.user)) {
        const customer = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Customer',
          email: session.user.email || '',
          role: 'customer' as const,
          createdAt: session.user.created_at,
        };
        setCurrentUser(customer);
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshReviews]);

  useEffect(() => {
    void refreshReviews(null);
  }, [refreshReviews]);

  // Handle product-specific sharing URLs. Guarded so a background content
  // revalidation (focus / visibility / bfcache) does not re-open a product the
  // visitor already closed.
  const sharedProductHandled = useRef(false);

  useEffect(() => {
    if (sharedProductHandled.current || items.length === 0) return;

    const productId = new URLSearchParams(window.location.search).get('product');
    if (!productId) return;
    if (!items.some((i) => i.id === productId)) return;

    sharedProductHandled.current = true;
    setInspectedId(productId);
    // Scroll to menu section to ensure visibility
    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
  }, [items]);

  // Resolve the inspected item against the *live* content so a shared link
  // always shows the current image and price (not a stale snapshot).
  const inspectedItem = useMemo(
    () => (inspectedId ? items.find((i) => i.id === inspectedId) ?? null : null),
    [items, inspectedId],
  );

  const handleAuthenticated = async (user: CustomerUser) => {
    setCurrentUser(user);
    await refreshReviews(user);
  };

  const handleUserUpdated = async (user: CustomerUser) => {
    setCurrentUser(user);
    await refreshReviews(user);
  };

  const handleSignOut = async () => {
    await logoutCustomer();
    setCurrentUser(null);
    setMyReviews([]);
  };

  const handleShareMenu = () => {
    setSharingItem(null);
    setShareMenuOpen(true);
  };

  const handleShareItem = (item: MenuItem) => {
    setSharingItem(item);
    setShareMenuOpen(true);
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: items.length };
    for (const cat of categories) {
      counts[cat] = items.filter((item) => item.category === cat).length;
    }
    return counts;
  }, [items, categories]);

  const visibleCategories = useMemo(() => {
    const base =
      activeCategory === 'All'
        ? categories
        : categories.filter((cat) => cat === activeCategory);
    if (!normalizedQuery) return base;
    return base.filter((cat) =>
      items.some(
        (item) =>
          item.category === cat &&
          (item.name.toLowerCase().includes(normalizedQuery) ||
            item.shortDescription.toLowerCase().includes(normalizedQuery) ||
            item.category.toLowerCase().includes(normalizedQuery)),
      ),
    );
  }, [activeCategory, normalizedQuery, items, categories]);

  // Persist the cart in this browser so a page refresh (or a returning visitor)
  // never loses the selected dishes, with or without a customer account.
  useEffect(() => {
    saveCart(
      Object.values(bag).map((entry) => ({
        item: entry.item,
        selectedOption: entry.selectedOption,
        quantity: entry.quantity,
      })),
    );
  }, [bag]);

  // Re-resolve every cart line against the live menu so a restored (or kept-open)
  // cart always shows the current name, image and price rather than a stale
  // snapshot. Returns the previous state when nothing changed to avoid loops.
  useEffect(() => {
    setBag((prev) => {
      let changed = false;
      const next: Record<string, BagEntry> = {};
      for (const [key, entry] of Object.entries(prev)) {
        const live = items.find((candidate) => candidate.id === entry.item.id);
        if (live && live !== entry.item) {
          next[key] = { ...entry, item: live };
          changed = true;
        } else {
          next[key] = entry;
        }
      }
      return changed ? next : prev;
    });
  }, [items]);

  const bagEntries: BagEntry[] = useMemo(() => Object.values(bag), [bag]);

  const totalItems = useMemo(
    () => bagEntries.reduce((sum, entry) => sum + entry.quantity, 0),
    [bagEntries],
  );

  const hasPendingPricing = useMemo(
    () =>
      bagEntries.some(
        (entry) => getUnitPrice(entry.item, entry.selectedOption) === null,
      ),
    [bagEntries],
  );

  const bagSubtotal = useMemo(
    () =>
      bagEntries.reduce(
        (sum, entry) =>
          sum + (getUnitPrice(entry.item, entry.selectedOption) ?? 0) * entry.quantity,
        0,
      ),
    [bagEntries],
  );

  const handleSelectOption = (itemId: string, option: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [itemId]: option,
    }));
  };

  const handleAddItem = (item: MenuItem, chosenOption?: string, count = 1) => {
    const effectiveOption =
      chosenOption ??
      (item.options && item.options.length > 0
        ? selectedOptions[item.id] ?? item.options[0].name
        : undefined);
    const key = getCartKey(item.id, effectiveOption);

    setBag((prev) => {
      const existing = prev[key];
      return {
        ...prev,
        [key]: {
          key,
          item,
          selectedOption: effectiveOption,
          quantity: (existing?.quantity ?? 0) + count,
        },
      };
    });
  };

  const handleDecrementItem = (itemId: string, chosenOption?: string) => {
    const key = getCartKey(itemId, chosenOption);
    setBag((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return {
        ...prev,
        [key]: { ...existing, quantity: existing.quantity - 1 },
      };
    });
  };

  const handleRemoveItem = (itemId: string, chosenOption?: string) => {
    const key = getCartKey(itemId, chosenOption);
    setBag((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleClearBag = () => {
    setBag({});
  };

  const handleRecordOrder = (
    message: string,
    url: string,
    itemCount: number,
    order?: PlacedOrder,
  ) => {
    const saved = saveLastWhatsAppOrder({
      message,
      url,
      itemCount,
      orderNumber: order?.orderNumber,
      orderId: order?.id,
      totalPhp: order?.totalPhp,
    });
    setLastSavedOrder(saved);
  };

  const handleClearSavedOrder = () => {
    clearLastWhatsAppOrder();
    setLastSavedOrder(null);
  };

  /**
   * Records the checkout in Supabase through the trusted `place_order` function,
   * then reports the outcome. The WhatsApp message is only sent by the drawer
   * AFTER this resolves successfully — a failed record is never shown as a
   * placed order.
   */
  const handleSubmitOrder = async (input: PlaceOrderInput): Promise<SubmitOrderResult> => {
    const result = await placeOrder(input);
    if (result.data) {
      return { ok: true, order: result.data };
    }
    return {
      ok: false,
      error: result.error ?? 'We could not record your order.',
      notEnabled: result.missingRelation,
    };
  };

  const quickWhatsAppUrl = `https://wa.me/${settings.whatsapp_digits}`;

  const customInquiryMessage = useMemo(() => {
    const lines = [
      `Hello ${settings.business_name}!`,
      '',
      'I would like to place an order or request information.',
    ];
    if (inquiryName.trim()) lines.push('', `Customer name: ${inquiryName.trim()}`);
    if (inquiryPhone.trim()) lines.push(`Phone number: ${inquiryPhone.trim()}`);
    if (inquiryDate) lines.push(`Preferred date: ${inquiryDate}`);
    lines.push(
      `Preferred arrangement: ${inquiryType} (subject to confirmation by ${settings.business_name})`,
    );

    if (bagEntries.length > 0) {
      lines.push('', 'Order details:');
      bagEntries.forEach((e) => {
        const variantPart = e.selectedOption ? ` (${e.selectedOption})` : '';
        lines.push(`- ${e.quantity} x ${e.item.name}${variantPart}`);
      });
    }
    if (inquiryMessage.trim()) {
      lines.push('', `Special instructions: ${inquiryMessage.trim()}`);
    }
    lines.push('', 'Please confirm the prices and availability. Thank you!');
    return lines.join('\n');
  }, [
    bagEntries,
    inquiryDate,
    inquiryMessage,
    inquiryName,
    inquiryPhone,
    inquiryType,
    settings.business_name,
  ]);

  const customInquiryUrl = useMemo(
    () => buildWhatsAppUrl(customInquiryMessage, settings.whatsapp_digits),
    [customInquiryMessage, settings.whatsapp_digits],
  );

  const handlePreOrderSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setInquiryPrepared(true);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div id="top" className="min-h-screen bg-[#FAF6EE] text-[#111111]">
        <Navbar
          totalItems={totalItems}
          onOpenBag={() => setBagOpen(true)}
          user={currentUser}
          onOpenAuth={(mode) => setAuthModalMode(mode)}
          onOpenProfile={() => setProfileOpen(true)}
          onSignOut={() => void handleSignOut()}
        />

        <main>
          {/* 1. Immersive Hero Section */}
          <HeroSection settings={settings} />

          {/* 2. Official Menu Showcase Section */}
          <section id="menu" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 md:py-24">
            <div className="border-b border-[#E8DFC8] pb-6 sm:pb-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-xs font-semibold tracking-[0.16em] text-[#AF140B] uppercase">
                      Official Menu
                    </p>
                    <button
                      onClick={handleShareMenu}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#E8DFC8] bg-[#FFFDF9] px-2.5 py-1 text-[10px] font-bold text-[#3C5826] uppercase transition-colors hover:border-[#FD8F00] hover:bg-[#FAF6EE]"
                    >
                      <Share2 className="h-3 w-3" />
                      <span>Share Menu</span>
                    </button>
                  </div>
                  <h2 className="font-display text-balance mt-1.5 text-3xl font-bold text-[#111111] sm:text-4xl md:text-5xl">
                    Homemade Dishes, Grilled Specialties & Fresh Bakery
                  </h2>
                  <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-[#5C5952] sm:mt-3 sm:text-base">
                    Browse all five categories, tap any dish to inspect details or choose options, and order directly via WhatsApp. Prices are confirmed upon request in Philippine Pesos (₱).
                  </p>
                </div>

                {/* Quick Search Filter */}
                <div className="relative w-full md:w-72 shrink-0">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#5C5952]"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    aria-label="Search menu items"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search dishes or bakery..."
                    className="min-h-[44px] w-full rounded-lg border border-[#DDD4BE] bg-[#FFFDF9] pr-9 pl-10 text-sm text-[#111111] placeholder:text-[#5C5952]/75 focus:border-[#FD8F00] focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear menu search"
                      className="absolute top-1/2 right-1.5 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#5C5952] hover:text-[#AF140B]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Horizontally Scrollable Category Bar on Mobile / Wrapping Row on Desktop */}
              <div
                role="tablist"
                aria-label="Filter menu by category"
                className="no-scrollbar mt-5 -mx-4 flex snap-x items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:mt-6 sm:flex-wrap sm:overflow-visible sm:rounded-xl sm:border sm:border-[#E8DFC8] sm:bg-[#FFFDF9] sm:p-1.5 sm:shadow-xs"
              >
                {(['All', ...categories] as CategoryFilter[]).map((category) => {
                  const isActive = activeCategory === category;
                  const count = categoryCounts[category] ?? 0;
                  return (
                    <button
                      key={category}
                      role="tab"
                      type="button"
                      aria-selected={isActive}
                      onClick={() => setActiveCategory(category)}
                      className={`inline-flex min-h-[42px] items-center gap-1.5 whitespace-nowrap shrink-0 snap-start rounded-lg border px-4 py-2 text-xs font-semibold transition-colors duration-150 sm:min-h-[38px] sm:border-0 sm:px-3.5 sm:py-1.5 ${
                        isActive
                          ? 'border-[#7E22CE] bg-[#7E22CE] text-[#FFFDF9]'
                          : 'border-[#E8DFC8] bg-[#FFFDF9] text-[#5C5952] hover:bg-[#FDD364]/30 hover:text-[#111111] sm:bg-transparent'
                      }`}
                    >
                      <span>{category}</span>
                      <span
                        className={`tabular-nums text-[11px] ${
                          isActive ? 'text-[#FDD364]' : 'text-[#5C5952]/75'
                        }`}
                      >
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Categorized Menu Sections */}
            {visibleCategories.length === 0 ? (
              <div className="mt-10 rounded-xl border border-[#E8DFC8] bg-[#FFFDF9] p-8 text-center">
                <p className="font-display text-2xl font-bold text-[#111111]">
                  No dishes matched &ldquo;{searchQuery}&rdquo;
                </p>
                <p className="mt-1.5 text-sm text-[#5C5952]">
                  Try another keyword or show all categories from our official menu.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('All');
                  }}
                  className="mt-4 min-h-[44px] rounded-lg bg-[#7E22CE] px-5 py-2.5 text-sm font-semibold text-[#FFFDF9] transition-colors hover:bg-[#6B21A8]"
                >
                  Show Full Menu
                </button>
              </div>
            ) : (
              <div className="mt-8 space-y-12 sm:mt-12 sm:space-y-16">
                {visibleCategories.map((category) => {
                  const itemsInCategory = items.filter(
                    (item) =>
                      item.category === category &&
                      (!normalizedQuery ||
                        item.name.toLowerCase().includes(normalizedQuery) ||
                        item.shortDescription.toLowerCase().includes(normalizedQuery) ||
                        item.category.toLowerCase().includes(normalizedQuery)),
                  );
                  return (
                    <div key={category} className="space-y-5 sm:space-y-6">
                      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-[#FDD364]/70 pb-3">
                        <h3 className="font-display text-2xl font-bold text-[#111111] sm:text-3xl">
                          {category}
                        </h3>
                        <span className="tabular-nums shrink-0 text-xs font-semibold tracking-wider text-[#AF140B] uppercase">
                          {itemsInCategory.length}{' '}
                          {itemsInCategory.length === 1 ? 'Item' : 'Items'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                        {itemsInCategory.map((item) => {
                          const activeOpt =
                            item.options && item.options.length > 0
                              ? selectedOptions[item.id] ?? item.options[0].name
                              : undefined;
                          const key = getCartKey(item.id, activeOpt);
                          const quantity = bag[key]?.quantity ?? 0;

                          return (
                            <MenuCard
                              key={item.id}
                              item={item}
                              selectedOption={activeOpt}
                              onSelectOption={(opt) => handleSelectOption(item.id, opt)}
                              quantity={quantity}
                              onAdd={handleAddItem}
                              onDecrement={handleDecrementItem}
                              onInspect={(item) => setInspectedId(item.id)}
                              onShare={handleShareItem}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Menu Bottom WhatsApp & Bag Summary Bar */}
            <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-xl border border-[#FD8F00] bg-[#FFFDF9] p-5 shadow-xs sm:mt-12 sm:flex-row sm:items-center">
              {totalItems > 0 ? (
                <>
                  <div>
                    <p className="text-sm font-semibold text-[#111111]">
                      <span className="tabular-nums text-[#AF140B]">{totalItems}</span>{' '}
                      {totalItems === 1 ? 'item' : 'items'} in your order bag
                    </p>
                    <p className="text-sm text-[#5C5952]">
                      Pricing:{' '}
                      <strong className="text-[#111111]">
                        <PriceLabel
                          pricePhp={hasPendingPricing ? null : bagSubtotal}
                          pendingLabel="Price to be confirmed by ANN BAKERY HOUSE"
                        />
                      </strong>
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setBagOpen(true)}
                      className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#7E22CE] px-5 py-2.5 text-sm font-semibold text-[#FFFDF9] transition-colors hover:bg-[#6B21A8] sm:w-auto"
                    >
                      <ShoppingBag className="h-4 w-4 text-[#FDD364]" aria-hidden="true" />
                      <span>Review & Send Order</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="font-display text-2xl font-bold text-[#111111]">
                      Ready to Order or Ask for Today&rsquo;s Prices?
                    </p>
                    <p className="mt-0.5 text-sm text-[#5C5952]">
                      Add dishes to your Order Bag or message us directly on WhatsApp for fresh PHP (₱) quotes.
                    </p>
                  </div>
                  <a
                    href={quickWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#111111] px-6 py-2.5 text-sm font-semibold text-[#FFFDF9] transition-colors hover:bg-[#2A2A2A] sm:w-auto"
                  >
                    <MessageCircle className="h-4 w-4 shrink-0 text-[#FDD364]" aria-hidden="true" />
                    <span>Order on WhatsApp</span>
                  </a>
                </>
              )}
            </div>
          </section>

          {/* 3. About Us Section */}
          <AboutSection settings={settings} />

          {/* 4. Customer Reviews & Moderation Section */}
          <ReviewsSection
            user={currentUser}
            approvedReviews={approvedReviews}
            averageRating={averageRating}
            approvedCount={approvedCount}
            myReviews={myReviews}
            loadingReviews={loadingReviews}
            onOpenAuth={(mode) => setAuthModalMode(mode)}
            onRefreshReviews={() => refreshReviews(currentUser)}
          />

          {/* 5. Pre-Order & Custom Inquiry Section */}
          <section id="order" className="border-t border-[#E8DFC8]">
            <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 md:py-24">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-5">
                <p className="text-xs font-semibold tracking-[0.16em] text-[#AF140B] uppercase">
                  Pre-Orders & Inquiries
                </p>
                <h2 className="font-display text-balance mt-2 text-3xl font-bold text-[#111111] sm:text-4xl md:text-5xl">
                  Place a Pre-Order or Custom Request
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[#5C5952]">
                  Ready to order soups, grilled items, bakery snacks, or whole cakes? Fill in your preferences to prepare a clean WhatsApp message directly to our kitchen.
                </p>

                <div className="mt-6 space-y-3 border-t border-[#E8DFC8] pt-6 text-sm text-[#5C5952]">
                  <p>
                    <strong className="font-semibold text-[#111111]">Pickup Point:</strong>{' '}
                    {settings.address}
                  </p>
                  <p>
                    <strong className="font-semibold text-[#111111]">WhatsApp Line:</strong>{' '}
                    <span className="tabular-nums font-semibold text-[#AF140B]">
                      {settings.whatsapp_display}
                    </span>
                  </p>
                  <p>
                    <strong className="font-semibold text-[#111111]">Currency:</strong>{' '}
                    Philippine Peso (PHP / ₱)
                  </p>
                </div>
              </div>

              <div className="lg:col-span-7">
                <form
                  onSubmit={handlePreOrderSubmit}
                  className="rounded-2xl border border-[#E8DFC8] bg-[#FFFDF9] p-6 shadow-xs sm:p-8"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="inquiry-name"
                        className="mb-1.5 block text-xs font-semibold text-[#111111]"
                      >
                        Full Name
                      </label>
                      <input
                        id="inquiry-name"
                        type="text"
                        required
                        value={inquiryName}
                        onChange={(e) => {
                          setInquiryName(e.target.value);
                          setInquiryPrepared(false);
                        }}
                        placeholder="Your name"
                        className="w-full rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3.5 py-2.5 text-sm text-[#111111] placeholder:text-[#5C5952]/70 focus:border-[#111111] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="inquiry-phone"
                        className="mb-1.5 block text-xs font-semibold text-[#111111]"
                      >
                        Mobile / WhatsApp Number
                      </label>
                      <input
                        id="inquiry-phone"
                        type="tel"
                        required
                        value={inquiryPhone}
                        onChange={(e) => {
                          setInquiryPhone(e.target.value);
                          setInquiryPrepared(false);
                        }}
                        placeholder="+63 9XX XXX XXXX"
                        className="w-full rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3.5 py-2.5 text-sm text-[#111111] placeholder:text-[#5C5952]/70 focus:border-[#111111] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="inquiry-date"
                        className="mb-1.5 block text-xs font-semibold text-[#111111]"
                      >
                        Preferred Date
                      </label>
                      <input
                        id="inquiry-date"
                        type="date"
                        value={inquiryDate}
                        onChange={(e) => {
                          setInquiryDate(e.target.value);
                          setInquiryPrepared(false);
                        }}
                        className="w-full rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3.5 py-2.5 text-sm text-[#111111] focus:border-[#111111] focus:outline-none"
                      />
                    </div>

                    <div>
                      <span className="mb-1.5 block text-xs font-semibold text-[#111111]">
                        Fulfillment Method
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {(['Pickup', 'Delivery'] as const).map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              setInquiryType(option);
                              setInquiryPrepared(false);
                            }}
                            className={`min-h-[42px] rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                              inquiryType === option
                                ? 'border-[#111111] bg-[#111111] text-[#FFFDF9]'
                                : 'border-[#DDD4BE] bg-[#FAF6EE] text-[#111111] hover:border-[#FD8F00]'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label
                      htmlFor="inquiry-message"
                      className="mb-1.5 block text-xs font-semibold text-[#111111]"
                    >
                      Dishes, Baked Goods, or Custom Quantities
                    </label>
                    <textarea
                      id="inquiry-message"
                      rows={3}
                      value={inquiryMessage}
                      onChange={(e) => {
                        setInquiryMessage(e.target.value);
                        setInquiryPrepared(false);
                      }}
                      placeholder="Tell us what you would like to order, selected options, or delivery barangay..."
                      className="w-full rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3.5 py-2.5 text-sm text-[#111111] placeholder:text-[#5C5952]/70 focus:border-[#111111] focus:outline-none"
                    />
                  </div>

                  {bagEntries.length > 0 && (
                    <p className="mt-3 text-xs text-[#5C5952]">
                      Your current Order Cart (
                      <span className="tabular-nums font-semibold text-[#AF140B]">
                        {totalItems}
                      </span>{' '}
                      {totalItems === 1 ? 'item' : 'items'} ·{' '}
                      <span className="font-semibold text-[#111111]">
                        <PriceLabel
                          pricePhp={hasPendingPricing ? null : bagSubtotal}
                          pendingLabel="Price to be confirmed by ANN BAKERY HOUSE"
                        />
                      </span>
                      ) will also be included.
                    </p>
                  )}

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      type="submit"
                      className="inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-[#FDD364] px-6 py-3 text-sm font-bold text-[#111111] transition-colors hover:bg-[#FD8F00] sm:w-auto"
                    >
                      Prepare Order Message
                    </button>

                    <a
                      href={customInquiryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        handleRecordOrder(customInquiryMessage, customInquiryUrl, totalItems)
                      }
                      className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-[#111111] px-6 py-3 text-sm font-semibold text-[#FFFDF9] transition-colors hover:bg-[#2A2A2A] sm:w-auto"
                    >
                      <MessageCircle className="h-4 w-4 shrink-0 text-[#FDD364]" aria-hidden="true" />
                      <span>Send Directly on WhatsApp</span>
                    </a>
                  </div>

                  {inquiryPrepared && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-[#111111]/20 bg-[#FAF6EE] p-3.5 text-sm text-[#111111]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#AF140B]" aria-hidden="true" />
                      <div>
                        <p className="font-semibold">
                          Your pre-order details are ready.
                        </p>
                        <p className="mt-0.5 text-xs text-[#5C5952]">
                          Click &ldquo;Send Directly on WhatsApp&rdquo; above to open your pre-filled message to{' '}
                          <span className="tabular-nums font-semibold text-[#AF140B]">
                            {settings.whatsapp_display}
                          </span>
                          .
                        </p>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>
            </div>
          </section>

          {/* 5. Contact & Location Section */}
          <ContactSection settings={settings} />
        </main>

        <footer className="border-t border-[#FDD364]/25 bg-[#0A0A0A] py-5 text-center text-xs text-[#FAF6EE]/80">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6">
            <p>
              &copy; {new Date().getFullYear()} {settings.business_name}. All rights reserved.
            </p>
            <a
              href={quickWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="tabular-nums text-[#FDD364] hover:underline"
            >
              WhatsApp: {settings.whatsapp_display}
            </a>
          </div>
        </footer>

        <DishModal
          item={inspectedItem}
          initialOption={inspectedItem ? selectedOptions[inspectedItem.id] : undefined}
          onSelectOption={handleSelectOption}
          onClose={() => setInspectedId(null)}
          onAdd={handleAddItem}
          onRecordOrder={handleRecordOrder}
        />

        <OrderDrawer
          open={bagOpen}
          entries={bagEntries}
          lastSavedOrder={lastSavedOrder}
          defaultCustomerName={currentUser?.name}
          onClose={() => setBagOpen(false)}
          onIncrement={handleAddItem}
          onDecrement={handleDecrementItem}
          onRemove={handleRemoveItem}
          onClear={handleClearBag}
          onSubmitOrder={handleSubmitOrder}
          onRecordOrder={handleRecordOrder}
          onClearSavedOrder={handleClearSavedOrder}
          whatsappDigits={settings.whatsapp_digits}
        />

        <AuthModal
          open={authModalMode !== null}
          initialMode={authModalMode ?? 'login'}
          onClose={() => setAuthModalMode(null)}
          onAuthenticated={(user) => void handleAuthenticated(user)}
          whatsappDigits={settings.whatsapp_digits}
        />

        <ShareMenu
          open={shareMenuOpen}
          onClose={() => setShareMenuOpen(false)}
          item={sharingItem}
        />

        <CustomerProfileModal
          open={profileOpen}
          user={currentUser}
          myReviews={myReviews}
          onClose={() => setProfileOpen(false)}
          onUserUpdated={(user) => void handleUserUpdated(user)}
          onSignOut={() => void handleSignOut()}
          onJumpToReviews={() => {
            document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      </div>
    </MotionConfig>
  );
}
