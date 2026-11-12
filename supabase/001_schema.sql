-- Pitchfork database: tables, security rules and order functions.
-- Paste the whole file into Supabase > SQL Editor > New query, then Run.
-- Safe to run once on a new project.

-- ============================================================
-- 1. People
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  email       text not null default '',
  phone       text not null default '',
  address     text not null default '',
  town        text not null default '',
  postcode    text not null default '',
  role        text not null default 'buyer' check (role in ('buyer','seller','admin')),
  created_at  timestamptz not null default now()
);

-- Every new sign-up gets a profile. A sign-up that asks to be a seller
-- (signUp options.data.wants_to_sell = true) starts as 'seller'.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case when coalesce((new.raw_user_meta_data->>'wants_to_sell')::boolean, false) then 'seller' else 'buyer' end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Only an admin may change anyone's role (people cannot promote themselves).
create or replace function public.guard_profile_role() returns trigger
language plpgsql set search_path = public as $$
begin
  -- auth.uid() is null when you run SQL yourself in the Supabase SQL editor
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only an admin can change roles';
  end if;
  return new;
end $$;
create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ============================================================
-- 2. Sellers and what they sell
-- ============================================================
create table public.sellers (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users(id) on delete cascade,
  status           text not null default 'pending' check (status in ('pending','approved','suspended')),
  live             boolean not null default false,
  name             text not null default '',
  person           text not null default '',
  place            text not null default '',
  lat              double precision,
  lng              double precision,
  cats             text[] not null default '{}',
  about            text not null default '',
  cover_path       text,
  collect          boolean not null default true,
  collect_times    text not null default '',
  deliver          boolean not null default false,
  delivery_text    text not null default '',
  delivery_fee     numeric(6,2) not null default 0 check (delivery_fee >= 0),
  food_reg_confirmed boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index sellers_owner_idx on public.sellers(owner_id);

-- Contact and bank details: never public. Seen by the seller, admins,
-- and (bank only) by a buyer through their own order.
create table public.seller_private (
  seller_id   uuid primary key references public.sellers(id) on delete cascade,
  phone       text not null default '',
  email       text not null default '',
  address     text not null default '',
  postcode    text not null default '',
  bank_name   text not null default '',
  sort_code   text not null default '',
  account_no  text not null default ''
);

create table public.items (
  id          uuid primary key default gen_random_uuid(),
  seller_id   uuid not null references public.sellers(id) on delete cascade,
  name        text not null default '',
  pack        text not null default '',
  price       numeric(8,2) check (price >= 0),
  stock       integer not null default 0 check (stock >= 0),
  visible     boolean not null default true,
  photo_path  text,
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
);
create index items_seller_idx on public.items(seller_id);

create table public.coming_soon (
  id          uuid primary key default gen_random_uuid(),
  seller_id   uuid not null references public.sellers(id) on delete cascade,
  name        text not null default '',
  when_text   text not null default '',
  sort        integer not null default 0
);
create index coming_soon_seller_idx on public.coming_soon(seller_id);

create table public.notify_requests (
  user_id        uuid not null references auth.users(id) on delete cascade,
  coming_soon_id uuid not null references public.coming_soon(id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (user_id, coming_soon_id)
);

create or replace function public.owns_seller(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.sellers where id = sid and owner_id = auth.uid());
$$;

create or replace function public.seller_is_public(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.sellers where id = sid and status = 'approved' and live);
$$;

-- Sellers cannot approve themselves; only admins change status.
create or replace function public.guard_seller() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is null then
    null;  -- run from the SQL editor: allowed
  elsif tg_op = 'INSERT' then
    if not public.is_admin() then new.status := 'pending'; end if;
  elsif new.status is distinct from old.status and not public.is_admin() then
    raise exception 'Only an admin can approve or suspend sellers';
  end if;
  if tg_op = 'UPDATE' and new.owner_id is distinct from old.owner_id and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only an admin can change who owns a seller page';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger sellers_guard before insert or update on public.sellers
  for each row execute function public.guard_seller();

-- A new seller page gets its private row automatically.
create or replace function public.create_seller_private() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.seller_private (seller_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger sellers_private_row after insert on public.sellers
  for each row execute function public.create_seller_private();

-- ============================================================
-- 3. Orders (reservations)
-- ============================================================
create sequence public.order_ref_seq start 1001;

create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  ref           text not null unique default ('PF-' || nextval('public.order_ref_seq')),
  seller_id     uuid not null references public.sellers(id) on delete cascade,
  buyer_id      uuid not null references auth.users(id) on delete cascade,
  status        text not null default 'new' check (status in ('new','collected','cancelled')),
  fulfilment    text not null check (fulfilment in ('collect','deliver')),
  slot          text not null default '',
  delivery_fee  numeric(6,2) not null default 0,
  subtotal      numeric(10,2) not null,
  total         numeric(10,2) not null,
  buyer_name    text not null,
  buyer_phone   text not null default '',
  buyer_email   text not null default '',
  buyer_address text not null default '',
  note          text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index orders_seller_idx on public.orders(seller_id, created_at desc);
create index orders_buyer_idx on public.orders(buyer_id, created_at desc);

create table public.order_lines (
  order_id  uuid not null references public.orders(id) on delete cascade,
  item_id   uuid references public.items(id) on delete set null,
  name      text not null,
  price     numeric(8,2) not null,
  qty       integer not null check (qty > 0),
  primary key (order_id, name, price)
);

-- Place a reservation. Prices and stock are checked here, on the server,
-- so nobody can change a price or over-order from their browser.
-- lines: [{"item_id": "...", "qty": 2}, ...]
create or replace function public.place_order(
  p_seller_id uuid, p_lines jsonb, p_fulfilment text, p_slot text default '',
  p_name text default '', p_phone text default '', p_email text default '', p_address text default '', p_note text default ''
) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  s public.sellers;
  o public.orders;
  line jsonb;
  it public.items;
  q integer;
  sub numeric(10,2) := 0;
  fee numeric(6,2) := 0;
begin
  if auth.uid() is null then raise exception 'Please sign in to reserve'; end if;
  if coalesce(trim(p_name), '') = '' or (coalesce(trim(p_phone), '') = '' and coalesce(trim(p_email), '') = '') then
    raise exception 'Add your name and a phone number or email';
  end if;
  select * into s from public.sellers where id = p_seller_id and status = 'approved' and live;
  if not found then raise exception 'This seller is not taking orders'; end if;
  if p_fulfilment = 'collect' and not s.collect then raise exception 'This seller does not offer collection'; end if;
  if p_fulfilment = 'deliver' and not s.deliver then raise exception 'This seller does not deliver'; end if;
  if p_fulfilment not in ('collect','deliver') then raise exception 'Choose collection or delivery'; end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then raise exception 'Your basket is empty'; end if;
  if p_fulfilment = 'deliver' then fee := s.delivery_fee; end if;

  insert into public.orders (seller_id, buyer_id, fulfilment, slot, delivery_fee, subtotal, total,
                             buyer_name, buyer_phone, buyer_email, buyer_address, note)
  values (s.id, auth.uid(), p_fulfilment, coalesce(p_slot, ''), fee, 0, 0,
          trim(p_name), coalesce(p_phone, ''), coalesce(p_email, ''), coalesce(p_address, ''), coalesce(p_note, ''))
  returning * into o;

  for line in select * from jsonb_array_elements(p_lines) loop
    q := (line->>'qty')::integer;
    if q is null or q < 1 then raise exception 'Each item needs a quantity'; end if;
    select * into it from public.items
      where id = (line->>'item_id')::uuid and seller_id = s.id and visible and price is not null
      for update;
    if not found then raise exception 'An item in your basket is no longer for sale'; end if;
    if it.stock < q then raise exception 'Only % left of %', it.stock, it.name; end if;
    update public.items set stock = stock - q where id = it.id;
    insert into public.order_lines (order_id, item_id, name, price, qty) values (o.id, it.id, it.name, it.price, q)
      on conflict (order_id, name, price) do update set qty = public.order_lines.qty + excluded.qty;
    sub := sub + it.price * q;
  end loop;

  update public.orders set subtotal = sub, total = sub + fee where id = o.id returning * into o;
  return o;
end $$;

-- Seller (or admin) marks an order collected or cancels it. Cancelling puts the stock back.
create or replace function public.set_order_status(p_order_id uuid, p_status text) returns public.orders
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if not (public.owns_seller(o.seller_id) or public.is_admin()) then raise exception 'Not your order'; end if;
  if p_status not in ('collected','cancelled') then raise exception 'Unknown status'; end if;
  if o.status <> 'new' then raise exception 'This order is already %', o.status; end if;
  if p_status = 'cancelled' then
    update public.items i set stock = i.stock + l.qty
      from public.order_lines l where l.order_id = o.id and l.item_id = i.id;
  end if;
  update public.orders set status = p_status, updated_at = now() where id = o.id returning * into o;
  return o;
end $$;

-- A buyer's own order: the seller's bank details for paying by transfer, if the seller added them.
create or replace function public.payment_details(p_order_id uuid)
returns table (bank_name text, sort_code text, account_no text, ref text, total numeric)
language sql stable security definer set search_path = public as $$
  select p.bank_name, p.sort_code, p.account_no, o.ref, o.total
  from public.orders o join public.seller_private p on p.seller_id = o.seller_id
  where o.id = p_order_id and (o.buyer_id = auth.uid() or public.owns_seller(o.seller_id) or public.is_admin())
    and p.account_no <> '';
$$;

-- ============================================================
-- 4. Security rules (row level security)
-- ============================================================
alter table public.profiles        enable row level security;
alter table public.sellers         enable row level security;
alter table public.seller_private  enable row level security;
alter table public.items           enable row level security;
alter table public.coming_soon     enable row level security;
alter table public.notify_requests enable row level security;
alter table public.orders          enable row level security;
alter table public.order_lines     enable row level security;

-- profiles: you see and edit your own; admins see and edit everyone's
create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update using (id = auth.uid() or public.is_admin());

-- sellers: everyone sees approved, live pages; owners and admins see their own / all
create policy sellers_select on public.sellers for select
  using ((status = 'approved' and live) or owner_id = auth.uid() or public.is_admin());
create policy sellers_insert on public.sellers for insert to authenticated
  with check (owner_id = auth.uid() or public.is_admin());
create policy sellers_update on public.sellers for update
  using (owner_id = auth.uid() or public.is_admin());
create policy sellers_delete on public.sellers for delete
  using (owner_id = auth.uid() or public.is_admin());

create policy seller_private_all on public.seller_private for all
  using (public.owns_seller(seller_id) or public.is_admin())
  with check (public.owns_seller(seller_id) or public.is_admin());

create policy items_select on public.items for select
  using (public.seller_is_public(seller_id) or public.owns_seller(seller_id) or public.is_admin());
create policy items_write on public.items for all
  using (public.owns_seller(seller_id) or public.is_admin())
  with check (public.owns_seller(seller_id) or public.is_admin());

create policy coming_soon_select on public.coming_soon for select
  using (public.seller_is_public(seller_id) or public.owns_seller(seller_id) or public.is_admin());
create policy coming_soon_write on public.coming_soon for all
  using (public.owns_seller(seller_id) or public.is_admin())
  with check (public.owns_seller(seller_id) or public.is_admin());

create policy notify_own on public.notify_requests for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notify_seller_reads on public.notify_requests for select
  using (exists (select 1 from public.coming_soon c where c.id = coming_soon_id
                 and (public.owns_seller(c.seller_id) or public.is_admin())));

-- orders: buyer, the seller, and admins can read. Writes only through the functions above.
create policy orders_select on public.orders for select
  using (buyer_id = auth.uid() or public.owns_seller(seller_id) or public.is_admin());
create policy order_lines_select on public.order_lines for select
  using (exists (select 1 from public.orders o where o.id = order_id
                 and (o.buyer_id = auth.uid() or public.owns_seller(o.seller_id) or public.is_admin())));

revoke all on function public.place_order(uuid, jsonb, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.place_order(uuid, jsonb, text, text, text, text, text, text, text) to authenticated;
revoke all on function public.set_order_status(uuid, text) from public, anon;
grant execute on function public.set_order_status(uuid, text) to authenticated;
revoke all on function public.payment_details(uuid) from public, anon;
grant execute on function public.payment_details(uuid) to authenticated;

-- ============================================================
-- 5. Photo storage
-- Files live at photos/<seller id>/<file>. Anyone can view them;
-- only that seller's owner (or an admin) can upload or delete.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy photos_read on storage.objects for select using (bucket_id = 'photos');
create policy photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (public.owns_seller(((storage.foldername(name))[1])::uuid) or public.is_admin()));
create policy photos_update on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (public.owns_seller(((storage.foldername(name))[1])::uuid) or public.is_admin()));
create policy photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (public.owns_seller(((storage.foldername(name))[1])::uuid) or public.is_admin()));
