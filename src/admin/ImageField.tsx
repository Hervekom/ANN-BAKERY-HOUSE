import { useRef, useState } from 'react';
import { Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { listMedia, uploadMedia, type MediaObject } from '../lib/adminData';
import { slugify } from '../lib/format';
import { ErrorNotice } from './notices';
import { Button, Modal } from './ui';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Reusable image control for the admin dashboard.
 *
 * Supports uploading from a phone or computer, previewing before saving,
 * replacing, removing and picking an existing file from the media library.
 * Files go to the `ann-bakery-assets` bucket under the provided folder.
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [media, setMedia] = useState<MediaObject[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    if (!ACCEPTED.includes(file.type)) {
      setError('Use a JPG, PNG, WebP or AVIF image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Images must be 5 MB or smaller.');
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
      setError(result.error ?? 'Upload failed.');
      return;
    }
    onChange(result.data.publicUrl);
  };

  const openPicker = async () => {
    setPickerOpen(true);
    setLoadingMedia(true);
    setError(null);
    const result = await listMedia(folder);
    setLoadingMedia(false);
    if (result.error) setError(result.error);
    setMedia(result.data ?? []);
  };

  return (
    <div className="space-y-2">
      <span className="block text-xs font-semibold text-[#111111]">{label}</span>
      {hint && <span className="block text-[11px] text-[#5C5952]">{hint}</span>}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          className="min-h-[38px] px-3 text-xs"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
          {busy ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="min-h-[38px] px-3 text-xs"
          disabled={busy}
          onClick={() => void openPicker()}
        >
          <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Choose from library
        </Button>
        {value && (
          <Button
            type="button"
            variant="danger"
            className="min-h-[38px] px-3 text-xs"
            onClick={() => onChange('')}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Remove
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
        />
      </div>

      {value ? (
        <div className="h-36 w-full overflow-hidden rounded-lg border border-[#E8DFC8] bg-[#FAF6EE]">
          <img
            src={value}
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
      {error && <ErrorNotice message={error} />}

      {pickerOpen && (
        <Modal title="Choose an image" onClose={() => setPickerOpen(false)} wide>
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
                  onClick={() => {
                    onChange(item.publicUrl);
                    setPickerOpen(false);
                  }}
                  className="overflow-hidden rounded-lg border border-[#E8DFC8] bg-[#FAF6EE] text-left hover:border-[#FD8F00]"
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
