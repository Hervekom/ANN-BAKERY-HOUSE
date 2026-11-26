import { useState, useEffect } from 'react';
import {
  Share2,
  Copy,
  MessageCircle,
  Facebook,
  Check,
  X,
  MessageSquare,
  Utensils,
} from 'lucide-react';
import { BUSINESS_INFO, MenuItem, formatPhp } from '../data/menu';

interface ShareMenuProps {
  open: boolean;
  onClose: () => void;
  item?: MenuItem | null;
}

export default function ShareMenu({ open, onClose, item }: ShareMenuProps) {
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://annbakeryhouse.vercel.app';
  const shareUrl = item
    ? `${baseUrl}?product=${encodeURIComponent(item.id)}#menu`
    : `${baseUrl}#menu`;

  const shareTitle = item ? item.name : BUSINESS_INFO.name;

  const shareText = item
    ? `Check out this delicious ${item.name}${
        item.pricePhp ? ` (${formatPhp(item.pricePhp)})` : ''
      } from ${BUSINESS_INFO.name}!`
    : `Discover ${BUSINESS_INFO.name} — Authentic Flavors. Homemade with Love.`;

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        onClose();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: <MessageCircle className="h-5 w-5" />,
      color: 'bg-[#25D366]',
      onClick: () => {
        const url = `https://wa.me/?text=${encodeURIComponent(
          shareText + ' ' + shareUrl
        )}`;
        window.open(url, '_blank');
      },
    },
    {
      name: 'Facebook',
      icon: <Facebook className="h-5 w-5" />,
      color: 'bg-[#1877F2]',
      onClick: () => {
        const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          shareUrl
        )}`;
        window.open(url, '_blank');
      },
    },
    {
      name: 'Messenger',
      icon: <MessageSquare className="h-5 w-5" />,
      color: 'bg-[#00B2FF]',
      onClick: () => {
        // Messenger has no reliable web share endpoint without a registered
        // app_id. Try the native app scheme without unloading this page; if the
        // app is not installed the browser ignores the custom scheme, so the
        // link is copied as a dependable cross-platform fallback.
        const messengerUrl = `fb-messenger://share/?link=${encodeURIComponent(shareUrl)}`;

        window.open(messengerUrl, '_blank');

        window.setTimeout(() => {
          void handleCopyLink();
        }, 1000);
      },
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-menu-title"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[#111111]/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-t-2xl border border-[#E8DFC8] bg-[#FFFDF9] p-6 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close share window"
          className="absolute right-3.5 top-3.5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E8DFC8] bg-[#FAF6EE] text-[#111111] transition-colors hover:bg-[#FDD364]/40"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#3C5826]/10 text-[#3C5826]">
            {item ? <Utensils className="h-6 w-6" /> : <Share2 className="h-6 w-6" />}
          </div>
          <h2
            id="share-menu-title"
            className="font-display mt-3 text-xl font-bold text-[#111111]"
          >
            {item ? `Share ${item.name}` : 'Share Our Menu'}
          </h2>
          <p className="mt-1 text-sm text-[#5C5952]">
            {item
              ? `Let others know about this delicious ${item.category.toLowerCase()}.`
              : 'Help others discover authentic homemade flavors.'}
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {typeof navigator.share === 'function' && (
            <button
              onClick={handleNativeShare}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3C5826] py-3 text-sm font-semibold text-[#FFFDF9] transition-colors hover:bg-[#2F461D]"
            >
              <Share2 className="h-4 w-4" />
              <span>Share via...</span>
            </button>
          )}

          <div className="grid grid-cols-3 gap-3">
            {shareOptions.map((option) => (
              <button
                key={option.name}
                onClick={option.onClick}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-sm transition-transform hover:scale-105 ${option.color}`}
                >
                  {option.icon}
                </div>
                <span className="text-[11px] font-medium text-[#5C5952]">
                  {option.name}
                </span>
              </button>
            ))}
          </div>

          <div className="relative mt-4">
            <div className="flex items-center gap-2 rounded-xl border border-[#DDD4BE] bg-[#FAF6EE] p-1.5">
              <span className="flex-1 truncate px-2 text-xs text-[#5C5952]">
                {shareUrl}
              </span>
              <button
                onClick={handleCopyLink}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#3C5826] px-4 text-xs font-semibold text-[#FFFDF9] transition-colors hover:bg-[#2F461D]"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
