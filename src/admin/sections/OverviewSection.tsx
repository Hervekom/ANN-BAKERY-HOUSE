import { useEffect, useState } from 'react';
import {
  Clock,
  FileText,
  FolderTree,
  Image as ImageIcon,
  MessageSquare,
  Package,
  Star,
} from 'lucide-react';
import type { AdminSessionInfo } from '../../lib/auth';
import {
  countReviewsByStatus,
  listCategories,
  listMedia,
  listProducts,
  listSiteSettings,
  type AdminReviewSummary,
} from '../../lib/adminData';
import { MigrationNotice } from '../notices';
import { Card, SectionTitle, Spinner } from '../ui';

type QuickSection = 'products' | 'categories' | 'reviews' | 'content' | 'settings' | 'media';

interface OverviewState {
  loading: boolean;
  missing: boolean;
  error: string | null;
  products: number;
  categories: number;
  media: number;
  settings: number;
  reviews: AdminReviewSummary | null;
}

const INITIAL: OverviewState = {
  loading: true,
  missing: false,
  error: null,
  products: 0,
  categories: 0,
  media: 0,
  settings: 0,
  reviews: null,
};

export default function OverviewSection({
  session,
  onNavigate,
}: {
  session: AdminSessionInfo;
  onNavigate: (id: QuickSection) => void;
}) {
  const [state, setState] = useState<OverviewState>(INITIAL);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [products, categories, reviews, settings, media] = await Promise.all([
        listProducts(),
        listCategories(),
        countReviewsByStatus(),
        listSiteSettings(),
        listMedia(),
      ]);
      if (!active) return;
      const results = [products, categories, reviews, settings, media];
      const missing = results.some((r) => r.missingRelation);
      setState({
        loading: false,
        missing,
        error: missing ? null : results.map((r) => r.error).find(Boolean) ?? null,
        products: products.data?.length ?? 0,
        categories: categories.data?.length ?? 0,
        media: media.data?.length ?? 0,
        settings: settings.data?.length ?? 0,
        reviews: reviews.data,
      });
    })();
    return () => {
      active = false;
    };
  }, []);

  if (state.loading) return <Spinner label="Loading dashboard…" />;

  return (
    <div>
      <SectionTitle
        title="Overview"
        description={`Signed in as ${session.email}. A summary of the storefront content managed from this dashboard.`}
      />

      {state.missing && <MigrationNotice />}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon={Package}
          label="Products"
          value={state.products}
          hint="Items shown on the menu"
          onClick={() => onNavigate('products')}
        />
        <StatCard
          icon={FolderTree}
          label="Categories"
          value={state.categories}
          hint="Menu categories"
          onClick={() => onNavigate('categories')}
        />
        <StatCard
          icon={Clock}
          label="Pending reviews"
          value={state.reviews?.pending ?? 0}
          hint="Awaiting moderation"
          highlight={(state.reviews?.pending ?? 0) > 0}
          onClick={() => onNavigate('reviews')}
        />
        <StatCard
          icon={Star}
          label="Published reviews"
          value={state.reviews?.approved ?? 0}
          hint="Visible on the website"
          onClick={() => onNavigate('reviews')}
        />
        <StatCard
          icon={FileText}
          label="Content entries"
          value={state.settings}
          hint="Editable website settings"
          onClick={() => onNavigate('content')}
        />
        <StatCard
          icon={ImageIcon}
          label="Media files"
          value={state.media}
          hint="Assets in storage"
          onClick={() => onNavigate('media')}
        />
      </div>

      <Card className="mt-6 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-[#3C5826]" aria-hidden="true" />
          <div>
            <h3 className="font-display text-xl font-bold text-[#111111]">Review moderation</h3>
            <p className="mt-1 text-sm leading-relaxed text-[#5C5952]">
              {state.reviews && state.reviews.total > 0
                ? `${state.reviews.total} review${state.reviews.total === 1 ? '' : 's'} in total — ${state.reviews.pending} pending, ${state.reviews.approved} approved, ${state.reviews.rejected} rejected.`
                : 'No customer reviews are stored yet.'}
            </p>
            <button
              type="button"
              onClick={() => onNavigate('reviews')}
              className="mt-3 inline-flex min-h-[40px] items-center rounded-lg bg-[#AF140B] px-4 py-2 text-sm font-semibold text-[#FFFDF9] hover:bg-[#8E1009]"
            >
              Open reviews
            </button>
          </div>
        </div>
      </Card>

      {state.error && (
        <p className="mt-4 text-xs text-[#AF140B]" role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  highlight = false,
  onClick,
}: {
  icon: typeof Package;
  label: string;
  value: number;
  hint: string;
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border bg-[#FFFDF9] p-5 text-left shadow-xs transition-colors hover:border-[#FD8F00] ${
        highlight ? 'border-[#FD8F00]' : 'border-[#E8DFC8]'
      }`}
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#AF140B]/10 text-[#AF140B]">
        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
      </span>
      <p className="tabular-nums font-display mt-3 text-3xl font-bold text-[#111111]">{value}</p>
      <p className="mt-0.5 text-sm font-semibold text-[#111111]">{label}</p>
      <p className="mt-0.5 text-xs text-[#5C5952]">{hint}</p>
    </button>
  );
}
