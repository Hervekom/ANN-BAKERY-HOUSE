import { useEffect, useState } from 'react';
import { MenuItem } from '../data/menu';
import { SiteSettings, loadPublicContent, staticPublicContent } from '../lib/content';

/**
 * Loads the public website content (settings, products, categories).
 *
 * Starts with the bundled static content so the first render is instant and the
 * site never appears empty, then upgrades to Supabase content. The database is
 * re-read whenever the visitor returns to the page (focus / tab visibility /
 * back-forward cache restore), so changes saved in the admin dashboard appear
 * without requiring a manual reload or a cleared browser cache.
 */
export interface UsePublicContent {
  settings: SiteSettings;
  items: MenuItem[];
  categories: string[];
  source: 'supabase' | 'static';
  loading: boolean;
}

export function usePublicContent(): UsePublicContent {
  const [content, setContent] = useState<UsePublicContent>(() => ({
    ...staticPublicContent(),
    loading: true,
  }));

  useEffect(() => {
    let cancelled = false;
    // Once live Supabase content has been displayed, never regress to the
    // bundled fallback because of a transient failure — hardcoded copy must not
    // silently overwrite valid database content.
    let hasLiveData = false;

    const run = async () => {
      const result = await loadPublicContent();
      if (cancelled) return;
      if (result.source === 'supabase') {
        hasLiveData = true;
      } else if (hasLiveData) {
        return;
      }
      setContent({ ...result, loading: false });
    };

    void run();

    const revalidate = () => void run();
    const onVisibility = () => {
      if (!document.hidden) void run();
    };

    window.addEventListener('focus', revalidate);
    window.addEventListener('pageshow', revalidate); // restores from bfcache
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', revalidate);
      window.removeEventListener('pageshow', revalidate);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return content;
}
