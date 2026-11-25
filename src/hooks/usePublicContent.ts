import { useEffect, useState } from 'react';
import { MENU_CATEGORIES, MENU_ITEMS, MenuItem } from '../data/menu';
import {
  DEFAULT_SITE_SETTINGS,
  SiteSettings,
  loadPublicContent,
} from '../lib/content';

/**
 * Loads the public website content (settings, products, categories).
 *
 * Starts with the bundled static content so the first render is instant and the
 * site never appears empty, then upgrades to Supabase content if it is
 * available. On any failure it simply keeps the static content.
 */
export interface UsePublicContent {
  settings: SiteSettings;
  items: MenuItem[];
  categories: string[];
  source: 'supabase' | 'static';
  loading: boolean;
}

export function usePublicContent(): UsePublicContent {
  const [content, setContent] = useState<UsePublicContent>({
    settings: DEFAULT_SITE_SETTINGS,
    items: MENU_ITEMS,
    categories: MENU_CATEGORIES,
    source: 'static',
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await loadPublicContent();
      if (!cancelled) setContent({ ...result, loading: false });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return content;
}
