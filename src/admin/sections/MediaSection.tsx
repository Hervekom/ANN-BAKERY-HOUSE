import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Image as ImageIcon, RefreshCw, Trash2, Upload } from 'lucide-react';
import type { AdminSessionInfo } from '../../lib/auth';
import {
  deleteMedia,
  listMedia,
  listProducts,
  listSiteSettings,
  publicAssetUrl,
  storagePathFromUrl,
  uploadMedia,
  type MediaObject,
} from '../../lib/adminData';
import { ProductWithRelations, SiteSettingRow } from '../../lib/dbTypes';
import { slugify } from '../../lib/format';
import { ErrorNotice } from '../notices';
import { Button, Card, EmptyState, SectionTitle, Spinner, TextInput } from '../ui';

const FOLDERS = [
  { value: 'products', label: 'Products' },
  { value: 'site', label: 'Website' },
  { value: 'branding', label: 'Branding' },
  { value: '', label: 'Root' },
];

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_BYTES = 5 * 1024 * 1024;

/** Recursively collects every string inside an arbitrary JSON-like value. */
function collectStrings(value: unknown, out: string[]) {
  if (typeof value === 'string') {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const entry of value) collectStrings(entry, out);
  } else if (value && typeof value === 'object') {
    for (const entry of Object.values(value)) collectStrings(entry, out);
  }
}

/** Media library backed by the `ann-bakery-assets` Supabase Storage bucket. */
export default function MediaSection({ session }: { session: AdminSessionInfo }) {
  const [folder, setFolder] = useState('products');
  const [items, setItems] = useState<MediaObject[]>([]);
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [settings, setSettings] = useState<SiteSettingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [query, setQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<MediaObject | null>(null);

  const load = useCallback(async (activeFolder: string) => {
    setLoading(true);
    const [mediaResult, productResult, settingResult] = await Promise.all([
      listMedia(activeFolder),
      listProducts(),
      listSiteSettings(),
    ]);
    setError(mediaResult.error);
    setItems(mediaResult.data ?? []);
    if (productResult.data) setProducts(productResult.data);
    if (settingResult.data) setSettings(settingResult.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(folder);
  }, [folder, load]);

  /** Storage path -> human-readable references pointing at that file. */
  const usage = useMemo(() => {
    const map = new Map<string, string[]>();
    const add = (path: string | null, label: string) => {
      if (!path) return;
      const list = map.get(path) ?? [];
      list.push(label);
      map.set(path, list);
    };
    for (const product of products) {
      add(storagePathFromUrl(product.image_path ?? ''), `Product “${product.name}”`);
    }
    for (const setting of settings) {
      const strings: string[] = [];
      collectStrings(setting.value, strings);
      for (const value of strings) {
        add(storagePathFromUrl(value), `Setting “${setting.key}”`);
      }
    }
    return map;
  }, [products, settings]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => item.name.toLowerCase().includes(needle));
  }, [items, query]);

  const handleUpload = async (file: File) => {
    setError(null);
    setNotice(null);
    if (!ACCEPTED.includes(file.type)) {
      setError('Use a JPG, PNG, WebP or AVIF image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Images must be 5 MB or smaller.');
      return;
    }
    setUploading(true);
    const dot = file.name.lastIndexOf('.');
    const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
    const base = slugify(dot >= 0 ? file.name.slice(0, dot) : file.name) || 'asset';
    const path = `${folder ? `${folder}/` : ''}${base}${ext}`;
    const result = await uploadMedia(path, file);
    setUploading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setNotice('File uploaded.');
    await load(folder);
  };

  const handleDelete = async (item: MediaObject) => {
    const references = usage.get(item.path) ?? [];
    if (references.length > 0) {
      setNotice(null);
      setError(
        `“${item.name}” is used by ${references.length} item${references.length === 1 ? '' : 's'} and cannot be deleted. Replace or remove those references first.`,
      );
      return;
    }
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setError(null);
    const result = await deleteMedia(item.path);
    if (result.error) {
      setError(result.error);
      return;
    }
    setNotice('File deleted.');
    await load(folder);
  };

  const handleCopy = async (item: MediaObject) => {
    try {
      await navigator.clipboard.writeText(item.publicUrl);
      setNotice('URL copied to clipboard.');
    } catch {
      setNotice(item.publicUrl);
    }
  };

  const openReplace = (item: MediaObject) => {
    replaceTargetRef.current = item;
    replaceInputRef.current?.click();
  };

  /** Overwrites the existing object in place (same path) so references keep working. */
  const handleReplaceFile = async (file: File) => {
    const item = replaceTargetRef.current;
    replaceTargetRef.current = null;
    if (!item) return;
    setError(null);
    setNotice(null);
    if (!ACCEPTED.includes(file.type)) {
      setError('Use a JPG, PNG, WebP or AVIF image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Images must be 5 MB or smaller.');
      return;
    }
    setReplacing(true);
    try {
      const result = await uploadMedia(item.path, file, { upsert: true });
      if (result.error) {
        setError(result.error);
        return;
      }
      setNotice(`Replaced “${item.name}”.`);
      await load(folder);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to replace the image.');
    } finally {
      setReplacing(false);
    }
  };

  return (
    <div>
      <SectionTitle
        title="Media Library"
        description="Upload and manage product and website images (bucket: ann-bakery-assets)."
        actions={
          <>
            <select
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              aria-label="Storage folder"
              className="min-h-[42px] rounded-lg border border-[#DDD4BE] bg-[#FFFDF9] px-3 text-sm text-[#111111] focus:border-[#AF140B] focus:outline-none"
            >
              {FOLDERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              {uploading ? 'Uploading…' : 'Upload image'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
                e.target.value = '';
              }}
            />
            <input
              ref={replaceInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleReplaceFile(file);
                e.target.value = '';
              }}
            />
          </>
        }
      />

      {notice && (
        <p className="mt-5 break-all rounded-xl border border-[#3C5826]/30 bg-[#3C5826]/10 px-3.5 py-2.5 text-xs font-medium text-[#2F461D]">
          {notice}
        </p>
      )}
      {error && <div className="mt-5"><ErrorNotice message={error} /></div>}

      <div className="mt-5 w-full sm:max-w-xs">
        <TextInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by file name…"
          aria-label="Search media by file name"
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <Spinner label="Loading media…" />
        ) : items.length === 0 ? (
          <EmptyState
            title="No files in this folder"
            description="Upload a JPG, PNG, WebP or AVIF image (max 5 MB)."
            action={<Button onClick={() => fileInputRef.current?.click()}>Upload image</Button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No matching files"
            description={`No files match “${query}”.`}
            action={
              <Button variant="secondary" onClick={() => setQuery('')}>
                Clear search
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {filtered.map((item) => {
              const references = usage.get(item.path) ?? [];
              const isUsed = references.length > 0;
              return (
                <Card key={item.path} className="overflow-hidden">
                  <div className="h-32 w-full bg-[#FAF6EE]">
                    {item.mimeType?.startsWith('image/') ? (
                      <img
                        src={item.publicUrl || publicAssetUrl(item.path)}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#5C5952]">
                        <ImageIcon className="h-6 w-6" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-xs font-semibold text-[#111111]" title={item.name}>
                      {item.name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      {item.size !== null && (
                        <span className="text-[11px] text-[#5C5952]">
                          {(item.size / 1024).toFixed(0)} KB
                        </span>
                      )}
                      <span
                        className={
                          isUsed
                            ? 'rounded-md border border-[#FDD364]/70 bg-[#FDD364]/25 px-1.5 py-0.5 text-[10px] font-semibold text-[#7A4A00]'
                            : 'rounded-md border border-[#DDD4BE] bg-[#FAF6EE] px-1.5 py-0.5 text-[10px] font-semibold text-[#5C5952]'
                        }
                        title={
                          isUsed
                            ? references.join('\n')
                            : 'Not referenced by any product or site setting.'
                        }
                      >
                        {isUsed
                          ? `Used by ${references.length} item${references.length === 1 ? '' : 's'}`
                          : 'Unused'}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Button
                        variant="secondary"
                        className="min-h-[34px] px-2.5 text-xs"
                        onClick={() => void handleCopy(item)}
                      >
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        Copy URL
                      </Button>
                      <Button
                        variant="secondary"
                        className="min-h-[34px] px-2.5 text-xs"
                        disabled={replacing}
                        onClick={() => openReplace(item)}
                        title="Replace this image (keeps the same URL)"
                      >
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                        Replace
                      </Button>
                      <Button
                        variant="danger"
                        className="min-h-[34px] px-2.5 text-xs"
                        disabled={isUsed}
                        onClick={() => void handleDelete(item)}
                        title={
                          isUsed
                            ? `In use (${references.join(', ')}). Remove those references first.`
                            : 'Delete file'
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
