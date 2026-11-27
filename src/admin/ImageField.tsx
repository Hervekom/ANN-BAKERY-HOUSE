import { useId, useState } from 'react';
import { Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { listMedia, uploadMedia, type MediaObject } from '../lib/adminData';
import { resolveImagePath } from '../lib/content';
import { slugify } from '../lib/format';
import { ErrorNotice } from './notices';
import { Banner, Button, Modal } from './ui';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Reusable image control for the admin dashboard.
 *
 * Two clearly separated actions:
 *  - "Choose from Gallery"  → upload a new file from a phone gallery or computer.
 *  - "Choose existing image" → pick a file already stored in the media library.
 *
 * Both update `value` (a Supabase Storage public URL) only after success, so a
 * failed upload never destroys the currently saved image. Saving the surrounding
 * form is what persists the new URL to the database.
 */
export default function ImageField({
  label = 'Image',
  value,
  onChange,
  folder = 'products',
  hint,
}: {
  label?: string;
  value: string;
  onChange: (next: string) => void;
  folder?: string;
  hint?: string;
}) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [media, setMedia] = useState<MediaObject[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    setSuccess(null);
    if (!ACCEPTED.includes(file.type)) {
      setError('Unsupported format. Please choose a JPG, PNG, WebP or AVIF image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('That image is too large. The maximum size is 5 MB.');
      return;
    }
    setBusy(true);
    const dot = file.name.lastIndexOf('.');
    const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
    const base = slugify(dot >= 0 ? file.name.slice(0, dot) : file.name) || 'image';
    const path = `${folder ? `${folder}/` : ''}${base}-${Date.now()}${ext}`;
    const result = await uploadMedia(path, file);
    setBusy(false);
    if (result.error || !result.data) {
      // Upload failed → `value` is untouched, so the previous image is kept.
      setError(result.error ?? 'Upload failed. Your previous image was kept.');
      return;
    }
    onChange(result.data.publicUrl);
    setSuccess('Image uploaded. Save your changes to apply it.');
    setPickerOpen(false);
  };

  const openPicker = async () => {
    setPickerOpen(true);
    setLoadingMedia(true);
    setError(null);
    setSuccess(null);
    const result = await listMedia(folder);
    setLoadingMedia(false);
    if (result.error) setError(result.error);
    setMedia(result.data ?? []);
  };

  const chooseExisting = (item: MediaObject) => {
    onChange(item.publicUrl);
    setSuccess('Existing image selected. Save your changes to apply it.');
    setPickerOpen(false);
  };

  return (
    <div className="space-y-2">
      <span className="block text-xs font-semibold text-[#111111]">{label}</span>
      {hint && <span className="block text-[11px] text-[#5C5952]">{hint}</span>}

      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={inputId}
          className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#DDD4BE] bg-[#FFFDF9] px-3 py-2 text-xs font-semibold text-[#111111] transition-colors hover:border-[#FD8F00] ${
            busy ? 'pointer-events-none cursor-not-allowed opacity-50' : 'cursor-pointer'
          }`}
        >
          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
          {busy ? 'Uploading…' : 'Choose from Gallery'}
        </label>
        <Button
          type="button"
          variant="secondary"
          className="min-h-[40px] px-3 text-xs"
          disabled={busy}
          onClick={() => void openPicker()}
        >
          <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Choose existing image
        </Button>
        {value && (
          <Button
            type="button"
            variant="danger"
            className="min-h-[40px] px-3 text-xs"
            disabled={busy}
            onClick={() => {
              onChange('');
              setError(null);
              setSuccess(null);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Remove
          </Button>
        )}
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
        />
      </div>

      {busy && (
        <div role="status" aria-live="polite" className="space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E8DFC8]">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[#AF140B]" />
          </div>
          <span className="block text-[11px] text-[#5C5952]">Uploading image…</span>
        </div>
      )}

      {value ? (
        <div className="h-36 w-full overflow-hidden rounded-lg border border-[#E8DFC8] bg-[#FAF6EE]">
          <img
            src={resolveImagePath(value)}
            alt="Image preview"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-24 w-full items-center justify-center rounded-lg border border-dashed border-[#DDD4BE] bg-[#FAF6EE] text-xs text-[#5C5952]">
          No image selected
        </div>
      )}

      {value && <p className="break-all text-[11px] text-[#5C5952]">{value}</p>}
      {success && <Banner kind="success">{success}</Banner>}
      {error && <ErrorNotice message={error} />}

      {pickerOpen && (
        <Modal title="Choose existing image" onClose={() => setPickerOpen(false)} wide>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[#5C5952]">
              Files already in the media library ({folder || 'root'}).
            </p>
            <label
              htmlFor={inputId}
              className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#DDD4BE] bg-[#FFFDF9] px-3 py-2 text-xs font-semibold text-[#111111] transition-colors hover:border-[#FD8F00] ${
                busy ? 'pointer-events-none cursor-not-allowed opacity-50' : 'cursor-pointer'
              }`}
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              Upload new image
            </label>
          </div>

          {loadingMedia ? (
            <p className="py-6 text-center text-sm text-[#5C5952]">Loading…</p>
          ) : media.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#5C5952]">
              No files in “{folder || 'root'}”. Upload one first.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {media.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => chooseExisting(item)}
                  className={`overflow-hidden rounded-lg border bg-[#FAF6EE] text-left hover:border-[#FD8F00] ${
                    value === item.publicUrl ? 'border-[#AF140B] ring-2 ring-[#AF140B]/30' : 'border-[#E8DFC8]'
                  }`}
                >
                  <img
                    src={item.publicUrl}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="h-24 w-full object-cover"
                  />
                  <span className="block truncate px-2 py-1.5 text-[11px] text-[#5C5952]">
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
