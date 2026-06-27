# KIZ FARM Frontend

This is a Next.js application for the KIZ FARM buyer, seller/farmer, admin, and learning portals.

## Tech Stack

- Next.js App Router
- React client components for interactive pages
- Tailwind CSS utility classes
- Local React state with `useState`, `useEffect`, and `useMemo`
- Shared API wrapper in `lib/kizfarm/api.ts`
- Shared auth/session helpers in `lib/kizfarm/auth.ts`
- Cart state through `CartProvider` in `lib/kizfarm/cart-context.tsx`

## App Areas

- `app/public/*`: public pages, signup, login, OTP.
- `app/buyer/*`: buyer dashboard, marketplace, cart, checkout, orders, refunds, chat, profile.
- `app/farmer/*`: seller/farmer dashboard, products, orders, chats, payouts, profile, verification.
- `app/admin/*`: admin shell, dashboard, users, farmers, products, orders, drivers, escrow, refunds.
- `app/learning/*`: course marketplace, checkout, subscriptions, and admin course management.

## Authentication

Authentication tokens come from the backend JWT login endpoints.

- Normal buyer/farmer login is stored in `localStorage`.
- Admin login is stored in `sessionStorage` for the actual admin gate, so closing the browser session requires admin login again.
- Admin login also mirrors the token to `localStorage` only for older admin components that still make direct fetch calls; `AdminGuard` still requires the session token before admin pages render.
- `AuthGuard` protects buyer pages.
- `AdminGuard` protects admin pages.
- `app/farmer/layout.tsx` protects seller/farmer pages and waits for `/farmer/status` before rendering.

If an unverified user tries to log in, the backend returns `needsVerification`, the frontend stores the pending email, and sends the user back to `/public/otp`.

## State Management

- Global cart state lives in `CartProvider`.
- Auth helpers are centralized in `lib/kizfarm/auth.ts`.
- Most page data is fetched inside page components and held in local component state.
- Admin and dashboard loading states should render loading panels until data is fetched, instead of blank content.

## Order Flow

Buyer checkout no longer takes payment immediately.

1. Buyer submits checkout from `/buyer/checkout`.
2. Backend creates unpaid order(s) with status `awaiting_transport_quote`.
3. Admin opens `/admin/order-control`, adds the transport fare.
4. Order status becomes `awaiting_payment`.
5. Buyer opens order detail and pays through Paystack.
6. Backend verifies payment, creates escrow, and moves the order to `pending`.
7. Farmer/admin/driver fulfillment continues from the existing lifecycle.

## Learning Admin Payouts

Course purchase payouts are managed in the learning admin page.

- Pending purchases show `Release Payout`.
- The clicked row shows `Releasing...` while the request is running.
- Released purchases show `Funds released` and cannot be released twice.

## Development

```bash
npm install
npm run dev
npm run build
```

The frontend expects the backend URL in `NEXT_PUBLIC_API_URL`; it falls back to `http://localhost:4000`.
