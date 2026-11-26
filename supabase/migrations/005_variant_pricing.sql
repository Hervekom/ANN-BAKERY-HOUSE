-- =============================================================================
-- ANN BAKERY HOUSE — Supabase Migration 005: Variant Pricing
-- -----------------------------------------------------------------------------
-- STATUS: PROPOSAL — NOT APPLIED. Prepared for owner review only.
-- Do NOT execute against the live Supabase project without explicit approval.
--
-- This migration adds variant-specific pricing to the product_options table.
-- When an option has a price_php, it overrides the base product price.
-- NULL means the option uses the base product price (or is also to be confirmed).
-- =============================================================================

begin;

-- 1. Add price_php to product_options
alter table public.product_options
  add column if not exists price_php numeric(10,2) check (price_php is null or price_php >= 0);

comment on column public.product_options.price_php is
  'Optional price override for this variant in PHP. NULL means it uses the base product price or is to be confirmed.';

-- 2. Update place_order() RPC to support variant pricing
-- We need to check if the selected option has a price override.
create or replace function public.place_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_items         jsonb;
  v_item          jsonb;
  v_name          text;
  v_phone         text;
  v_notes         text;
  v_channel       text;
  v_fulfillment   text;
  v_idem          text;
  v_customer_id   uuid;
  v_existing      public.orders%rowtype;
  v_order         public.orders%rowtype;
  v_product       public.products%rowtype;
  v_option_row    public.product_options%rowtype;
  v_category_name text;
  v_slug          text;
  v_qty           integer;
  v_option        text;
  v_unit          numeric(12,2);
  v_line          numeric(12,2);
  v_subtotal      numeric(12,2) := 0;
  v_all_priced    boolean := true;
  v_count         integer := 0;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'Invalid order payload.' using errcode = '22023';
  end if;

  v_items := payload -> 'items';
  if v_items is null or jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    raise exception 'Your cart is empty. Add at least one item before ordering.' using errcode = '22023';
  end if;
  if jsonb_array_length(v_items) > 50 then
    raise exception 'Too many different items in a single order. Please contact the bakery.' using errcode = '22023';
  end if;

  v_name    := nullif(btrim(coalesce(payload ->> 'customer_name', '')), '');
  v_phone   := nullif(btrim(coalesce(payload ->> 'customer_phone', '')), '');
  v_notes   := nullif(btrim(coalesce(payload ->> 'notes', '')), '');
  v_channel := coalesce(nullif(btrim(payload ->> 'channel'), ''), 'whatsapp');
  if v_channel not in ('whatsapp','in_person','phone','other') then
    v_channel := 'whatsapp';
  end if;

  v_fulfillment := lower(coalesce(nullif(btrim(payload ->> 'fulfillment_method'), ''), 'pickup'));
  if v_fulfillment not in ('pickup','delivery') then
    v_fulfillment := 'pickup';
  end if;

  v_idem := nullif(btrim(coalesce(payload ->> 'idempotency_key', '')), '');
  if v_idem is not null then
    v_idem := left(v_idem, 100);
    -- Duplicate protection (fast path): the same checkout attempt already
    -- produced an order — return it instead of recording a second one.
    select * into v_existing from public.orders where idempotency_key = v_idem;
    if found then
      return jsonb_build_object(
        'id', v_existing.id,
        'order_number', v_existing.order_number,
        'status', v_existing.status,
        'total_php', v_existing.total_php,
        'placed_at', v_existing.placed_at,
        'duplicate', true
      );
    end if;
  end if;

  -- Link the order to a registered profile when the caller is signed in.
  -- Guests (anonymous checkout) keep only the name + phone snapshot.
  if auth.uid() is not null then
    select p.id into v_customer_id from public.profiles p where p.id = auth.uid();
  end if;

  -- Insert the header first so the line items can reference it. Totals are
  -- written after the lines are validated (all inside this transaction).
  insert into public.orders
    (idempotency_key, customer_id, customer_name, customer_phone, channel, fulfillment_method, notes)
  values
    (v_idem, v_customer_id, v_name, v_phone, v_channel, v_fulfillment, v_notes)
  on conflict (idempotency_key) where idempotency_key is not null do nothing
  returning * into v_order;

  if v_order.id is null then
    -- Race: a concurrent identical request won. Return the winning order.
    select * into v_order from public.orders where idempotency_key = v_idem;
    if not found then
      raise exception 'Unable to record the order. Please try again.' using errcode = 'P0001';
    end if;
    return jsonb_build_object(
      'id', v_order.id,
      'order_number', v_order.order_number,
      'status', v_order.status,
      'total_php', v_order.total_php,
      'placed_at', v_order.placed_at,
      'duplicate', true
    );
  end if;

  for v_item in select * from jsonb_array_elements(v_items) loop
    v_slug   := nullif(btrim(coalesce(v_item ->> 'product_slug', '')), '');
    v_qty    := coalesce((v_item ->> 'quantity')::integer, 0);
    v_option := nullif(btrim(coalesce(v_item ->> 'selected_option', '')), '');

    if v_slug is null then
      raise exception 'An order item is missing its product reference.' using errcode = '22023';
    end if;
    if v_qty < 1 or v_qty > 999 then
      raise exception 'Invalid quantity for "%".', v_slug using errcode = '22023';
    end if;

    select * into v_product from public.products where slug = v_slug;
    if not found then
      raise exception 'The product "%" is no longer on the menu. Please remove it and try again.', v_slug
        using errcode = 'P0002';
    end if;
    if v_product.is_available is not true then
      raise exception 'The product "%" is currently unavailable. Please remove it or contact the bakery.', v_product.name
        using errcode = 'P0002';
    end if;

    select c.name into v_category_name from public.categories c where c.id = v_product.category_id;

    -- Authoritative price logic:
    -- 1. Reject a variant that does not belong to this product.
    -- 2. Use the variant price override when present.
    -- 3. Fallback to the base product price.
    v_unit := null;
    if v_option is not null then
      select * into v_option_row from public.product_options
      where product_id = v_product.id and name = v_option;

      if not found then
        raise exception 'The option "%" is not available for "%". Please choose a valid option.', v_option, v_product.name
          using errcode = '22023';
      end if;

      if v_option_row.price_php is not null then
        v_unit := v_option_row.price_php;
      end if;
    end if;

    if v_unit is null then
      v_unit := v_product.price_php;
    end if;

    if v_unit is null then
      v_line := null;
      v_all_priced := false;
    else
      v_line := round(v_unit * v_qty, 2);
      v_subtotal := v_subtotal + v_line;
    end if;

    insert into public.order_items
      (order_id, product_id, product_name, product_slug, category_id, category_name,
       unit_price_php, quantity, line_total_php, selected_option)
    values
      (v_order.id, v_product.id, v_product.name, v_product.slug, v_product.category_id, v_category_name,
       v_unit, v_qty, v_line, v_option);

    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'Your cart is empty. Add at least one item before ordering.' using errcode = '22023';
  end if;

  -- Honest totals: when ANY line price is unknown the whole total stays NULL
  -- rather than reporting a partial figure that could mislead the customer.
  update public.orders
    set subtotal_php = case when v_all_priced then v_subtotal else null end,
        total_php    = case when v_all_priced then v_subtotal else null end
    where id = v_order.id
    returning * into v_order;

  return jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'status', v_order.status,
    'total_php', v_order.total_php,
    'placed_at', v_order.placed_at,
    'duplicate', false
  );
end;
$$;

commit;
