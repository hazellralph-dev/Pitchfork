# Pitchfork

Neighbours' surplus, straight from the farm gate. A local marketplace where smallholders within 3 miles of Sheepscombe sell surplus meat, veg and fruit to neighbours. Buyers reserve online and pay the seller directly; Pitchfork takes no payments.

- **Website:** plain HTML, CSS and JavaScript (no build step), hosted on Netlify.
- **Back end:** Supabase (database, logins, photo storage).
- **Map:** OpenStreetMap via Leaflet.

## What's in it

| Area | Who | What they can do |
|---|---|---|
| Explore (`#/`) | Everyone | Map and list of approved, live sellers; filter by produce |
| Seller page (`#/seller/…`) | Everyone | Story, photos, what's in the freezer, coming soon, collection and delivery |
| Basket (`#/basket`) | Signed-in buyers | Choose quantities, collection time or delivery, reserve |
| Account (`#/account`) | Signed-in users | Their reservations and saved details |
| Sell (`#/sell`) | Signed-in sellers | Create and edit their page, items, photos, map pin, bank details; manage orders |
| Admin (`#/admin`) | Admins | Approve or suspend sellers, edit any page, hand pages to sellers, all orders with CSV export, change roles |

Security is enforced in the database (row-level security in `supabase/001_schema.sql`): sellers can only change their own pages, buyers only see their own orders, contact and bank details are private, new sellers need admin approval, and reservations are priced and stock-checked on the server.

## Setting it up

### 1. Database
1. In Supabase, open **SQL Editor → New query**.
2. Paste in all of `supabase/001_schema.sql` and click **Run**.

### 2. Supabase login settings
In **Authentication → URL Configuration**:
- **Site URL:** your Netlify address, e.g. `https://pitchfork-sheepscombe.netlify.app`
- **Redirect URLs:** add the same address followed by `/**`

Email: Supabase's built-in email sender is only for testing (it's heavily rate-limited and only sends to your Supabase team's addresses).
- **While testing:** in **Authentication → Sign In / Providers → Email**, you can turn off **Confirm email** so new accounts work straight away.
- **Before launch:** set up your own email sender under **Authentication → Emails → SMTP Settings** (for example a free Resend or Brevo account), then turn **Confirm email** back on.

### 3. Hosting on Netlify
1. Netlify → **Add new site → Import an existing project → GitHub** → choose this repo.
2. Leave **Build command** empty and set **Publish directory** to `.`
3. Deploy. Every push to `main` redeploys automatically.

### 4. Make yourself admin
1. Sign up on the live site with your own email.
2. In Supabase **SQL Editor**, run `supabase/002_make_me_admin.sql` with your email filled in.
3. Refresh the site: an **Admin** tab appears.

## Before launch
- Switch Supabase to the **Pro** plan (free projects pause after a week without activity).
- Set up the email sender (above).
- Write the terms of use and privacy notice in the `aboutView` section of `js/app.js` (placeholders are marked in square brackets).
- Optional: a custom domain in Netlify.

## Next steps
- Email (and optionally text) sellers when a reservation comes in.
- Email buyers who tapped "Notify me" when an item becomes available.

## Settings
`js/config.js` holds the Supabase project address, its publishable key (safe to be public), and the map centre and radius. Never put the secret / service_role key in this repo.
