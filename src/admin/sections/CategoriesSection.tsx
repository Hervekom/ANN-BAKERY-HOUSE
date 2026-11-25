import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import type { AdminSessionInfo } from '../../lib/auth';
import {
  createCategory,
  deleteCategory,
  listCategories,
  listProducts,
  reorderCategories,
  updateCategory,
  type CategoryInput,
} from '../../lib/adminData';
import { CategoryRow } from '../../lib/dbTypes';
import { slugify } from '../../lib/format';
import { ErrorNotice, MigrationNotice } from '../notices';
import {
  Button,
  Card,
  EmptyState,
  Field,
  SectionTitle,
  Spinner,
  TextArea,
  TextInput,
  Toggle,
  Modal,
} from '../ui';

interface CategoryFormState {
  id: string | null;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  slugTouched: boolean;
}

const EMPTY_FORM: CategoryFormState = {
  id: null,
  name: '',
  slug: '',
  description: '',
  is_active: true,
  slugTouched: false,
};

export default function CategoriesSection({ session }: { session: AdminSessionInfo }) {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryFormState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [cats, products] = await Promise.all([listCategories(), listProducts()]);
    setMissing(cats.missingRelation || products.missingRelation);
    setError(cats.error ?? products.error);
    if (cats.data) setCategories(cats.data);
    if (products.data) {
      const counts: Record<string, number> = {};
      for (const product of products.data) {
        counts[product.category_id] = (counts[product.category_id] ?? 0) + 1;
      }
      setProductCounts(counts);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => setForm({ ...EMPTY_FORM });

  const openEdit = (category: CategoryRow) =>
    setForm({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      is_active: category.is_active,
      slugTouched: true,
    });

  const handleSave = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      setError('The category name is required.');
      return;
    }
    const input: CategoryInput = {
      name: form.name.trim(),
      slug: (form.slug || slugify(form.name)).trim(),
      description: form.description.trim() || null,
      display_order: form.id ? categories.find((c) => c.id === form.id)?.display_order ?? 999 : categories.length + 1,
      is_active: form.is_active,
    };
    setSaving(true);
    setError(null);
    const result = form.id
      ? await updateCategory(form.id, input)
      : await createCategory(input);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      setMissing(result.missingRelation);
      return;
    }
    setNotice(form.id ? 'Category updated.' : 'Category created.');
    setForm(null);
    await load();
  };

  const handleDelete = async (category: CategoryRow) => {
    const usedBy = productCounts[category.id] ?? 0;
    if (usedBy > 0) {
      setNotice(null);
      setError(
        `"${category.name}" is used by ${usedBy} product${usedBy === 1 ? '' : 's'} and cannot be deleted. Move or delete those products first.`,
      );
      return;
    }
    if (!window.confirm(`Delete the category "${category.name}"? This cannot be undone.`)) return;
    setError(null);
    const result = await deleteCategory(category.id);
    if (result.error) {
      setError(result.error);
      setMissing(result.missingRelation);
      return;
    }
    setNotice('Category deleted.');
    await load();
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    [next[index], next[target]] = [next[target], next[index]];
    setCategories(next);
    const result = await reorderCategories(next.map((c) => c.id));
    if (result.error) {
      setError(result.error);
      await load();
    }
  };

  return (
    <div>
      <SectionTitle
        title="Categories"
        description="Organise the menu. Categories in use by products are protected from deletion."
        actions={
          <Button onClick={openCreate} disabled={missing}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New category
          </Button>
        }
      />

      {missing && <div className="mt-5"><MigrationNotice /></div>}
      {notice && (
        <p className="mt-5 rounded-xl border border-[#3C5826]/30 bg-[#3C5826]/10 px-3.5 py-2.5 text-xs font-medium text-[#2F461D]">
          {notice}
        </p>
      )}
      {error && <div className="mt-5"><ErrorNotice message={error} /></div>}

      <div className="mt-5">
        {loading ? (
          <Spinner label="Loading categories…" />
        ) : categories.length === 0 ? (
          <EmptyState
            title="No categories yet"
            description="Create your first category to start organising the menu."
            action={<Button onClick={openCreate} disabled={missing}>New category</Button>}
          />
        ) : (
          <Card className="divide-y divide-[#E8DFC8]">
            {categories.map((category, index) => {
              const usedBy = productCounts[category.id] ?? 0;
              return (
                <div
                  key={category.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-[#111111]">{category.name}</p>
                      {!category.is_active && (
                        <span className="rounded-md border border-[#DDD4BE] bg-[#FAF6EE] px-1.5 py-0.5 text-[10px] font-semibold text-[#5C5952]">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[#5C5952]">
                      /{category.slug} · {usedBy} product{usedBy === 1 ? '' : 's'}
                    </p>
                    {category.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-[#5C5952]">{category.description}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        aria-label="Move up"
                        disabled={index === 0}
                        onClick={() => void handleMove(index, -1)}
                        className="rounded-md p-1 text-[#5C5952] hover:text-[#111111] disabled:opacity-30"
                      >
                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label="Move down"
                        disabled={index === categories.length - 1}
                        onClick={() => void handleMove(index, 1)}
                        className="rounded-md p-1 text-[#5C5952] hover:text-[#111111] disabled:opacity-30"
                      >
                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    <Button variant="secondary" className="min-h-[38px] px-3 text-xs" onClick={() => openEdit(category)}>
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      className="min-h-[38px] px-3 text-xs"
                      onClick={() => void handleDelete(category)}
                      disabled={usedBy > 0}
                      title={usedBy > 0 ? 'This category is used by products.' : 'Delete category'}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </div>

      {form && (
        <Modal title={form.id ? 'Edit category' : 'New category'} onClose={() => setForm(null)}>
          <div className="space-y-4">
            <Field label="Name" htmlFor="cat-name">
              <TextInput
                id="cat-name"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) =>
                    prev
                      ? {
                          ...prev,
                          name: e.target.value,
                          slug: prev.slugTouched ? prev.slug : slugify(e.target.value),
                        }
                      : prev,
                  )
                }
                placeholder="e.g. Bakery & Snacks"
              />
            </Field>

            <Field label="Slug" htmlFor="cat-slug" hint="Used in the URL. Must be unique.">
              <TextInput
                id="cat-slug"
                value={form.slug}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, slug: e.target.value, slugTouched: true } : prev))}
                placeholder="bakery-snacks"
              />
            </Field>

            <Field label="Description" htmlFor="cat-description" hint="Optional. Shown as a short category note.">
              <TextArea
                id="cat-description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
              />
            </Field>

            <div className="flex items-center justify-between rounded-xl border border-[#E8DFC8] bg-[#FAF6EE] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#111111]">Visible on the website</p>
                <p className="text-xs text-[#5C5952]">Hidden categories are not listed publicly.</p>
              </div>
              <Toggle
                checked={form.is_active}
                onChange={(next) => setForm((prev) => (prev ? { ...prev, is_active: next } : prev))}
                label="Category visibility"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setForm(null)}>
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving…' : form.id ? 'Save changes' : 'Create category'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
