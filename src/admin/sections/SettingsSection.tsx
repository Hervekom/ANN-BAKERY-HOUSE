import { useCallback, useEffect, useState } from 'react';
import type { AdminSessionInfo } from '../../lib/auth';
import { listSiteSettings, upsertSiteSetting } from '../../lib/adminData';
import { DEFAULT_SITE_SETTINGS } from '../../lib/content';
import { ErrorNotice, MigrationNotice } from '../notices';
import { Button, Card, Field, SectionTitle, Spinner, TextInput } from '../ui';

interface SettingsForm {
  business_name: string;
  tagline: string;
  business_type: string;
  address: string;
  short_address: string;
  whatsapp_display: string;
  whatsapp_digits: string;
  currency: string;
  currency_code: string;
  price_pending_text: string;
}

const FIELDS: Array<{ key: keyof SettingsForm; label: string; hint?: string }> = [
  { key: 'business_name', label: 'Business name' },
  { key: 'tagline', label: 'Tagline' },
  { key: 'business_type', label: 'Business type' },
  { key: 'address', label: 'Business address' },
  { key: 'short_address', label: 'Short address', hint: 'Used in compact headers.' },
  { key: 'whatsapp_display', label: 'WhatsApp number (display)', hint: 'Shown to customers, e.g. +63 954 143 8031.' },
  { key: 'whatsapp_digits', label: 'WhatsApp number (digits)', hint: 'Digits only, used for wa.me links.' },
  { key: 'currency', label: 'Currency symbol' },
  { key: 'currency_code', label: 'Currency code' },
  { key: 'price_pending_text', label: 'Pending price label' },
];

function defaults(): SettingsForm {
  return {
    business_name: DEFAULT_SITE_SETTINGS.business_name,
    tagline: DEFAULT_SITE_SETTINGS.tagline,
    business_type: DEFAULT_SITE_SETTINGS.business_type,
    address: DEFAULT_SITE_SETTINGS.address,
    short_address: DEFAULT_SITE_SETTINGS.short_address,
    whatsapp_display: DEFAULT_SITE_SETTINGS.whatsapp_display,
    whatsapp_digits: DEFAULT_SITE_SETTINGS.whatsapp_digits,
    currency: DEFAULT_SITE_SETTINGS.currency,
    currency_code: DEFAULT_SITE_SETTINGS.currency_code,
    price_pending_text: DEFAULT_SITE_SETTINGS.price_pending_text,
  };
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function UnsavedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FD8F00]/40 bg-[#FDD364]/25 px-2.5 py-1 text-[11px] font-semibold text-[#7A4A00]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#FD8F00]" aria-hidden="true" />
      Unsaved changes
    </span>
  );
}

/** Business settings: contact details, WhatsApp and currency. */
export default function SettingsSection({ session }: { session: AdminSessionInfo }) {
  const [form, setForm] = useState<SettingsForm>(defaults);
  const [savedForm, setSavedForm] = useState<SettingsForm>(defaults);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listSiteSettings();
    setMissing(result.missingRelation);
    setError(result.error);
    if (result.data) {
      const map = new Map(result.data.map((row) => [row.key, row.value]));
      const base = defaults();
      const next = { ...base };
      for (const field of FIELDS) {
        const value = map.get(field.key);
        if (typeof value === 'string' && value.trim()) next[field.key] = value;
      }
      setForm(next);
      setSavedForm(next);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = !same(form, savedForm);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    for (const field of FIELDS) {
      const result = await upsertSiteSetting(field.key, form[field.key], session.userId);
      if (result.error) {
        setSaving(false);
        setError(result.error);
        setMissing(result.missingRelation);
        return;
      }
    }
    setSaving(false);
    setSavedForm(form);
    setNotice('Business settings saved.');
  };

  const handleCancel = () => {
    if (dirty && !window.confirm('Discard unsaved changes?')) return;
    setForm(savedForm);
  };

  if (loading) return <Spinner label="Loading settings…" />;

  return (
    <div>
      <SectionTitle
        title="Business Settings"
        description="Contact details and storefront preferences used across the website."
        actions={dirty ? <UnsavedBadge /> : undefined}
      />

      {missing && <div className="mt-5"><MigrationNotice /></div>}
      {notice && (
        <p className="mt-5 rounded-xl border border-[#3C5826]/30 bg-[#3C5826]/10 px-3.5 py-2.5 text-xs font-medium text-[#2F461D]">
          {notice}
        </p>
      )}
      {error && <div className="mt-5"><ErrorNotice message={error} /></div>}

      <Card className="mt-5 p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <Field key={field.key} label={field.label} htmlFor={`setting-${field.key}`} hint={field.hint}>
              <TextInput
                id={`setting-${field.key}`}
                value={form[field.key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
              />
            </Field>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <Button variant="secondary" onClick={handleCancel} disabled={saving || !dirty}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
