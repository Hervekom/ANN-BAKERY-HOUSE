import { useCallback, useEffect, useState } from 'react';
import type { AdminSessionInfo } from '../../lib/auth';
import { listSiteSettings, upsertSiteSetting } from '../../lib/adminData';
import { DEFAULT_SITE_SETTINGS } from '../../lib/content';
import ImageField from '../ImageField';
import { ErrorNotice, MigrationNotice } from '../notices';
import { Button, Card, Field, SectionTitle, Spinner, TextArea, TextInput } from '../ui';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pick(record: Record<string, unknown>, key: string, fallback: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : fallback;
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

/**
 * Website content editing: homepage hero, about section and contact block.
 * Values default to the current shipped content — nothing is invented.
 */
export default function ContentSection({ session }: { session: AdminSessionInfo }) {
  const [hero, setHero] = useState(DEFAULT_SITE_SETTINGS.hero);
  const [about, setAbout] = useState(DEFAULT_SITE_SETTINGS.about);
  const [contact, setContact] = useState(DEFAULT_SITE_SETTINGS.contact);
  const [savedHero, setSavedHero] = useState(DEFAULT_SITE_SETTINGS.hero);
  const [savedAbout, setSavedAbout] = useState(DEFAULT_SITE_SETTINGS.about);
  const [savedContact, setSavedContact] = useState(DEFAULT_SITE_SETTINGS.contact);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listSiteSettings();
    setMissing(result.missingRelation);
    setError(result.error);
    if (result.data) {
      const map = new Map(result.data.map((row) => [row.key, row.value]));
      const heroObj = isRecord(map.get('hero')) ? (map.get('hero') as Record<string, unknown>) : {};
      const aboutObj = isRecord(map.get('about')) ? (map.get('about') as Record<string, unknown>) : {};
      const contactObj = isRecord(map.get('contact')) ? (map.get('contact') as Record<string, unknown>) : {};
      const heroValue = {
        image: pick(heroObj, 'image', DEFAULT_SITE_SETTINGS.hero.image),
        title: pick(heroObj, 'title', DEFAULT_SITE_SETTINGS.hero.title),
        subtitle: pick(heroObj, 'subtitle', DEFAULT_SITE_SETTINGS.hero.subtitle),
      };
      const aboutValue = {
        heading: pick(aboutObj, 'heading', DEFAULT_SITE_SETTINGS.about.heading),
        body: pick(aboutObj, 'body', DEFAULT_SITE_SETTINGS.about.body),
        main_image: pick(aboutObj, 'main_image', DEFAULT_SITE_SETTINGS.about.main_image),
        bakery_image: pick(aboutObj, 'bakery_image', DEFAULT_SITE_SETTINGS.about.bakery_image),
        meal_image: pick(aboutObj, 'meal_image', DEFAULT_SITE_SETTINGS.about.meal_image),
      };
      const contactValue = {
        heading: pick(contactObj, 'heading', DEFAULT_SITE_SETTINGS.contact.heading),
        intro: pick(contactObj, 'intro', DEFAULT_SITE_SETTINGS.contact.intro),
        map_embed_url: pick(contactObj, 'map_embed_url', DEFAULT_SITE_SETTINGS.contact.map_embed_url),
      };
      setHero(heroValue);
      setAbout(aboutValue);
      setContact(contactValue);
      setSavedHero(heroValue);
      setSavedAbout(aboutValue);
      setSavedContact(contactValue);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const heroDirty = !same(hero, savedHero);
  const aboutDirty = !same(about, savedAbout);
  const contactDirty = !same(contact, savedContact);
  const dirty = heroDirty || aboutDirty || contactDirty;

  const save = async (key: string, value: unknown, label: string) => {
    setSavingKey(key);
    setError(null);
    setNotice(null);
    const result = await upsertSiteSetting(key, value, session.userId);
    setSavingKey(null);
    if (result.error) {
      setError(result.error);
      setMissing(result.missingRelation);
      return;
    }
    if (key === 'hero') setSavedHero(hero);
    else if (key === 'about') setSavedAbout(about);
    else if (key === 'contact') setSavedContact(contact);
    setNotice(`${label} saved.`);
  };

  const reset = (key: string, isDirty: boolean, label: string) => {
    if (isDirty && !window.confirm(`Discard unsaved ${label} changes?`)) return;
    if (key === 'hero') setHero(savedHero);
    else if (key === 'about') setAbout(savedAbout);
    else if (key === 'contact') setContact(savedContact);
  };

  if (loading) return <Spinner label="Loading website content…" />;

  return (
    <div>
      <SectionTitle
        title="Website Content"
        description="Edit the text and images shown on the public website. Only existing content is editable."
        actions={dirty ? <UnsavedBadge /> : undefined}
      />

      {missing && <div className="mt-5"><MigrationNotice /></div>}
      {notice && (
        <p className="mt-5 rounded-xl border border-[#3C5826]/30 bg-[#3C5826]/10 px-3.5 py-2.5 text-xs font-medium text-[#2F461D]">
          {notice}
        </p>
      )}
      {error && <div className="mt-5"><ErrorNotice message={error} /></div>}

      <div className="mt-5 space-y-6">
        <Card className="p-5 sm:p-6">
          <h3 className="font-display text-xl font-bold text-[#111111]">Homepage hero</h3>
          <p className="mt-1 text-xs text-[#5C5952]">The headline and image at the top of the page.</p>
          <div className="mt-4 space-y-4">
            <Field label="Headline" htmlFor="hero-title">
              <TextInput id="hero-title" value={hero.title} onChange={(e) => setHero((p) => ({ ...p, title: e.target.value }))} />
            </Field>
            <Field label="Sub-headline" htmlFor="hero-subtitle">
              <TextArea id="hero-subtitle" rows={2} value={hero.subtitle} onChange={(e) => setHero((p) => ({ ...p, subtitle: e.target.value }))} />
            </Field>
            <ImageField
              label="Hero background image"
              value={hero.image}
              onChange={(next) => setHero((p) => ({ ...p, image: next }))}
              folder="site"
              hint="Shown behind the homepage headline. Max 5 MB — JPG, PNG, WebP or AVIF."
            />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="secondary" disabled={!heroDirty} onClick={() => reset('hero', heroDirty, 'hero')}>
                Cancel
              </Button>
              <Button disabled={savingKey === 'hero'} onClick={() => void save('hero', hero, 'Hero content')}>
                {savingKey === 'hero' ? 'Saving…' : 'Save hero'}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h3 className="font-display text-xl font-bold text-[#111111]">About section</h3>
          <p className="mt-1 text-xs text-[#5C5952]">The story block and accompanying photos.</p>
          <div className="mt-4 space-y-4">
            <Field label="Heading" htmlFor="about-heading">
              <TextInput id="about-heading" value={about.heading} onChange={(e) => setAbout((p) => ({ ...p, heading: e.target.value }))} />
            </Field>
            <Field label="Body text" htmlFor="about-body">
              <TextArea id="about-body" rows={4} value={about.body} onChange={(e) => setAbout((p) => ({ ...p, body: e.target.value }))} />
            </Field>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <ImageField
                label="Main image"
                value={about.main_image}
                onChange={(next) => setAbout((p) => ({ ...p, main_image: next }))}
                folder="site"
              />
              <ImageField
                label="Bakery image"
                value={about.bakery_image}
                onChange={(next) => setAbout((p) => ({ ...p, bakery_image: next }))}
                folder="site"
              />
              <ImageField
                label="Meal image"
                value={about.meal_image}
                onChange={(next) => setAbout((p) => ({ ...p, meal_image: next }))}
                folder="site"
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="secondary" disabled={!aboutDirty} onClick={() => reset('about', aboutDirty, 'about')}>
                Cancel
              </Button>
              <Button disabled={savingKey === 'about'} onClick={() => void save('about', about, 'About section')}>
                {savingKey === 'about' ? 'Saving…' : 'Save about'}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h3 className="font-display text-xl font-bold text-[#111111]">Contact section</h3>
          <p className="mt-1 text-xs text-[#5C5952]">The contact heading, intro text and map.</p>
          <div className="mt-4 space-y-4">
            <Field label="Heading" htmlFor="contact-heading">
              <TextInput id="contact-heading" value={contact.heading} onChange={(e) => setContact((p) => ({ ...p, heading: e.target.value }))} />
            </Field>
            <Field label="Intro text" htmlFor="contact-intro">
              <TextArea id="contact-intro" rows={3} value={contact.intro} onChange={(e) => setContact((p) => ({ ...p, intro: e.target.value }))} />
            </Field>
            <Field label="Map embed URL" htmlFor="contact-map">
              <TextInput id="contact-map" value={contact.map_embed_url} onChange={(e) => setContact((p) => ({ ...p, map_embed_url: e.target.value }))} />
            </Field>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="secondary" disabled={!contactDirty} onClick={() => reset('contact', contactDirty, 'contact')}>
                Cancel
              </Button>
              <Button disabled={savingKey === 'contact'} onClick={() => void save('contact', contact, 'Contact section')}>
                {savingKey === 'contact' ? 'Saving…' : 'Save contact'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
