# First Faith — E-Commerce Platform

"Perfect Blend of Nature & Science"

A two-app monorepo: a Next.js storefront/admin frontend and a NestJS API backend, sharing a Supabase PostgreSQL database via Prisma.

## Structure

```
first-faith/
├── frontend/   Next.js 14 (App Router), TypeScript, Tailwind
└── backend/    NestJS, TypeScript, Prisma
```

## Prerequisites

- Node.js 18+
- A Supabase project (PostgreSQL + Auth + Storage)
- A Razorpay account (test mode is fine to start)

## Backend setup

```bash
cd backend
npm install
cp .env.example .env      # fill in DATABASE_URL, Supabase and Razorpay values
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev         # http://localhost:4000/api/v1
```

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env.local  # fill in NEXT_PUBLIC_* values
npm run dev                 # http://localhost:3000
```

## What's implemented so far (Phase 1–2 slice)

**Backend:** Auth sync, Products (public + admin CRUD), Categories, Ingredients,
Cart (guest + logged-in), Orders (created from cart, server-priced), Payments
(Razorpay order creation + signature-verified webhook), Reviews (moderated),
Coupons (server-validated), Settings (admin-editable key/value store). All
mutating/admin routes are protected by `SupabaseAuthGuard` + `RolesGuard` —
role is always read from the database, never trusted from the client.

**Frontend:** Design tokens matching the First Faith packaging (cream/blush/
burgundy/charcoal), Header/Footer, Home, Shop, Product detail (with dynamic
SEO metadata and structured data), About, Ingredients, Contact, Cart (backed
by a real cart API + guest session), Login/Register (Supabase Auth), a
sitemap/robots setup, and one reference admin screen (`/admin/products`).

## What's still open

- Checkout page (order + Razorpay checkout.js integration on the client)
- Account pages (`/account`, order history/detail)
- Remaining admin screens (orders, customers, reviews, coupons, settings —
  same pattern as `/admin/products`, calling the already-built backend routes)
- Product image upload flow into Supabase Storage
- Seed script to load the 5 real First Faith products into the database
- Server-side admin route protection (currently a client-side nav pattern
  only; backend enforcement is already in place)

## Client-supplied information still required

See the "Missing Information" section of the architecture document for the
full list (pricing, SKUs, stock, shipping/return policy, contact details,
social links, GST/legal details, Razorpay live keys, domain name). Until
these are supplied, the relevant fields render as empty/configurable rather
than guessed values.
