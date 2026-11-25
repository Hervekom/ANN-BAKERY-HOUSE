import { useCallback, useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Image as ImageIcon,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import type { AdminSessionInfo } from '../../lib/auth';
import {
  createProduct,
  deleteProduct,
  listCategories,
  listProducts,
  replaceProductOptions,
  reorderProducts,
  updateProduct,
  type OptionGroupInput,
  type ProductInput,
} from '../../lib/adminData';
import { CategoryRow, ProductWithRelations } from '../../lib/dbTypes';
import { resolveImagePath } from '../../lib/content';
import { formatPhp, slugify } from '../../lib/format';
import { ErrorNotice, MigrationNotice } from '../notices';
import {
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  SectionTitle,
  Spinner,
  TextArea,
  TextInput,
  Toggle,
} from '../ui';
import ImageField from '../ImageField';

interface VariantGroupForm {
  label: string;
  names: string;
}

interface ProductFormState {
  id: string | null;
  name: string;
  slug: string;
  category_id: string;
  short_description: string;
  full_description: string;
  image_path: string;
  price: string;
  is_available: boolean;
  slugTouched: boolean;
  groups: VariantGroupForm[];
}

function toFormState(product: ProductWithRelations): ProductFormState {
  const byGroup = new Map<string, string[]>();
  for (const option of [...product.product_options].sort((a, b) => a.display_order - b.display_order)) {
    const list = byGroup.get(option.group_label) ?? [];
    list.push(option.name);
    byGroup.set(option.group_label, list);
  }
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    category_id: product.category_id,
    short_description: product.short_description ?? '',
    full_description: product.full_description ?? '',
    image_path: product.image_path ?? '',
    price: product.price_php === null ? '' : String(product.price_php),
    is_available: product.is_available,
    slugTouched: true,
    groups: [...byGroup.entries()].map(([label, names]) => ({ label, names: names.join('\n') })),
  };
}

function emptyForm(categoryId: string): ProductFormState {
  return {
    id: null,
    name: '',
    slug: '',
    category_id: categoryId,
    short_description: '',
    full_description: '',
    image_path: '',
    price: '',
    is_available: true,
    slugTouched: false,
    groups: [],
  };
}

export default function ProductsSection({ session }: { session: AdminSessionInfo }) {
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [productRes, categoryRes] = await Promise.all([listProducts(), listCategories()]);
    setMissing(productRes.missingRelation || categoryRes.missingRelation);
    setError(productRes.error ?? categoryRes.error);
    if (productRes.data) setProducts(productRes.data);
    if (categoryRes.data) setCategories(categoryRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    if (categories.length === 0) {
      setError('Create at least one category before adding products.');
      return;
    }
    setError(null);
    setForm(emptyForm(categories[0].id));
  };

  const openEdit = (product: ProductWithRelations) => {
    setError(null);
    setForm(toFormState(product));
  };

  const handleSave = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      setError('The product name is required.');
      return;
    }
    if (!form.category_id) {
      setError('Please choose a category.');
      return;
    }
    const priceTrim = form.price.trim();
    const price = priceTrim === '' ? null : Number(priceTrim);
    if (price !== null && Number.isNaN(price)) {
      setError('The price must be a number, or left empty for "Price to be confirmed".');
      return;
    }

    const input: ProductInput = {
      category_id: form.category_id,
      name: form.name.trim(),
      slug: (form.slug || slugify(form.name)).trim(),
      short_description: form.short_description.trim() || null,
      full_description: form.full_description.trim() || null,
      image_path: form.image_path.trim() || null,
      price_php: price,
      is_available: form.is_available,
      display_order: form.id
        ? products.find((p) => p.id === form.id)?.display_order ?? products.length + 1
        : products.length + 1,
    };

    const groups: OptionGroupInput[] = form.groups
      .map((group) => ({
        group_label: group.label.trim(),
        names: group.names
          .split(/[\n,]/)
          .map((name) => name.trim())
          .filter(Boolean),
      }))
      .filter((group) => group.group_label && group.names.length > 0);

    setSaving(true);
    setError(null);

    const saved = form.id ? await updateProduct(form.id, input) : await createProduct(input);
    if (saved.error || !saved.data) {
      setSaving(false);
      setError(saved.error ?? 'Unable to save the product.');
      setMissing(saved.missingRelation);
      return;
    }

    const optionsResult = await replaceProductOptions(saved.data.id, groups);
    setSaving(false);
    if (optionsResult.error) {
      setError(optionsResult.error);
      setMissing(optionsResult.missingRelation);
      return;
    }

    setNotice(form.id ? 'Product updated.' : 'Product created.');
    setForm(null);
    await load();
  };

  const handleDelete = async (product: ProductWithRelations) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setError(null);
    const result = await deleteProduct(product.id);
    if (result.error) {
      setError(result.error);
      setMissing(result.missingRelation);
      return;
    }
    setNotice('Product deleted.');
    await load();
  };

  const handleToggleAvailability = async (product: ProductWithRelations) => {
    const next = !product.is_available;
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_available: next } : p)),
    );
    const result = await updateProduct(product.id, { is_available: next });
    if (result.error) {
      setError(result.error);
      await load();
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= products.length) return;
    const next = [...products];
    [next[index], next[target]] = [next[target], next[index]];
    setProducts(next);
    const result = await reorderProducts(next.map((p) => p.id));
    if (result.error) {
      setError(result.error);
      await load();
    }
  };

  return (
    <div>
      <SectionTitle
        title="Products"
        description="Create, edit and order menu items. Prices are set in PHP (₱). Leave a price empty to show “Price to be confirmed”."
        actions={
          <Button onClick={openCreate} disabled={missing}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New product
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
          <Spinner label="Loading products…" />
        ) : products.length === 0 ? (
          <EmptyState
            title="No products yet"
            description={
              categories.length === 0
                ? 'Create a category first, then add products.'
                : 'Add your first product to build the menu.'
            }
            action={
              <Button onClick={openCreate} disabled={missing || categories.length === 0}>
                New product
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {products.map((product, index) => (
              <Card key={product.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#E8DFC8] bg-[#FAF6EE]">
                    {product.image_path ? (
                      <img
                        src={resolveImagePath(product.image_path)}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#5C5952]">
                        <ImageIcon className="h-5 w-5" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-[#111111]">{product.name}</p>
                      {!product.is_available && (
                        <span className="rounded-md border border-[#DDD4BE] bg-[#FAF6EE] px-1.5 py-0.5 text-[10px] font-semibold text-[#5C5952]">
                          Unavailable
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[#5C5952]">
                      {product.categories?.name ?? 'Uncategorised'} ·{' '}
                      <span className="tabular-nums font-semibold text-[#111111]">
                        {formatPhp(product.price_php)}
                      </span>
                      {product.product_options.length > 0 &&
                        ` · ${product.product_options.length} variant${
                          product.product_options.length === 1 ? '' : 's'
                        }`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap shrink-0 items-center gap-1.5">
                  <Toggle
                    checked={product.is_available}
                    onChange={() => void handleToggleAvailability(product)}
                    label={`Availability of ${product.name}`}
                  />
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
                      disabled={index === products.length - 1}
                      onClick={() => void handleMove(index, 1)}
                      className="rounded-md p-1 text-[#5C5952] hover:text-[#111111] disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <Button variant="secondary" className="min-h-[38px] px-3 text-xs" onClick={() => openEdit(product)}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Edit
                  </Button>
                  <Button variant="danger" className="min-h-[38px] px-3 text-xs" onClick={() => void handleDelete(product)}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {form && (
        <Modal title={form.id ? 'Edit product' : 'New product'} onClose={() => setForm(null)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="prod-name">
                <TextInput
                  id="prod-name"
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
                  placeholder="e.g. French Baguettes"
                />
              </Field>
              <Field label="Category" htmlFor="prod-category">
                <select
                  id="prod-category"
                  value={form.category_id}
                  onChange={(e) =>
                    setForm((prev) => (prev ? { ...prev, category_id: e.target.value } : prev))
                  }
                  className="min-h-[42px] w-full rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3 py-2 text-sm text-[#111111] focus:border-[#AF140B] focus:outline-none"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Slug" htmlFor="prod-slug" hint="Used in the URL. Must be unique.">
              <TextInput
                id="prod-slug"
                value={form.slug}
                onChange={(e) =>
                  setForm((prev) => (prev ? { ...prev, slug: e.target.value, slugTouched: true } : prev))
                }
              />
            </Field>

            <Field label="Short description" htmlFor="prod-short" hint="One line shown on the menu card.">
              <TextArea
                id="prod-short"
                rows={2}
                value={form.short_description}
                onChange={(e) =>
                  setForm((prev) => (prev ? { ...prev, short_description: e.target.value } : prev))
                }
              />
            </Field>

            <Field label="Full description" htmlFor="prod-full" hint="Shown when a customer opens the dish.">
              <TextArea
                id="prod-full"
                rows={3}
                value={form.full_description}
                onChange={(e) =>
                  setForm((prev) => (prev ? { ...prev, full_description: e.target.value } : prev))
                }
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Price in PHP (₱)"
                htmlFor="prod-price"
                hint="Leave empty to display “Price to be confirmed”."
              >
                <TextInput
                  id="prod-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((prev) => (prev ? { ...prev, price: e.target.value } : prev))}
                  placeholder="Price to be confirmed"
                />
              </Field>

              <ImageField
                label="Product image"
                value={form.image_path}
                onChange={(next) =>
                  setForm((prev) => (prev ? { ...prev, image_path: next } : prev))
                }
                folder="products"
                hint="Choose from Gallery to upload from your phone or computer, or pick an existing image. Max 5 MB — JPG, PNG, WebP or AVIF."
              />
            </div>

            {/* Variant groups */}
            <div className="rounded-xl border border-[#E8DFC8] bg-[#FAF6EE] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#111111]">Variants (optional)</p>
                  <p className="text-xs text-[#5C5952]">
                    Group choices such as “Choose Side”. Put one option per line.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="min-h-[34px] px-2.5 text-xs"
                  onClick={() =>
                    setForm((prev) =>
                      prev ? { ...prev, groups: [...prev.groups, { label: '', names: '' }] } : prev,
                    )
                  }
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add group
                </Button>
              </div>

              {form.groups.length > 0 && (
                <div className="mt-3 space-y-3">
                  {form.groups.map((group, index) => (
                    <div key={index} className="rounded-lg border border-[#E8DFC8] bg-[#FFFDF9] p-3">
                      <div className="flex items-center gap-2">
                        <TextInput
                          value={group.label}
                          placeholder="Group label (e.g. Choose Side)"
                          aria-label={`Variant group ${index + 1} label`}
                          onChange={(e) =>
                            setForm((prev) => {
                              if (!prev) return prev;
                              const groups = [...prev.groups];
                              groups[index] = { ...groups[index], label: e.target.value };
                              return { ...prev, groups };
                            })
                          }
                        />
                        <button
                          type="button"
                          aria-label="Remove group"
                          onClick={() =>
                            setForm((prev) =>
                              prev
                                ? { ...prev, groups: prev.groups.filter((_, i) => i !== index) }
                                : prev,
                            )
                          }
                          className="rounded-lg border border-[#AF140B]/30 px-2.5 py-2 text-[#AF140B] hover:bg-[#AF140B] hover:text-[#FFFDF9]"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                      <TextArea
                        rows={2}
                        className="mt-2"
                        value={group.names}
                        placeholder={'Rice\nFried Plantain'}
                        aria-label={`Variant group ${index + 1} options`}
                        onChange={(e) =>
                          setForm((prev) => {
                            if (!prev) return prev;
                            const groups = [...prev.groups];
                            groups[index] = { ...groups[index], names: e.target.value };
                            return { ...prev, groups };
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[#E8DFC8] bg-[#FAF6EE] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#111111]">Available for ordering</p>
                <p className="text-xs text-[#5C5952]">Unavailable products stay hidden from the menu.</p>
              </div>
              <Toggle
                checked={form.is_available}
                onChange={(next) => setForm((prev) => (prev ? { ...prev, is_available: next } : prev))}
                label="Product availability"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setForm(null)}>
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving…' : form.id ? 'Save changes' : 'Create product'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
