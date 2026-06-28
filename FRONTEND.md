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

- `app/public/*`: public pages, signup, login, OTP, and public blogs index/details.
- `app/buyer/*`: buyer dashboard, marketplace, cart, checkout, orders, refunds, chat, profile, and buyer blogs directory.
- `app/farmer/*`: seller/farmer dashboard, products, orders, chats, payouts, profile, verification, and farmer blogs directory.
- `app/admin/*`: admin shell, dashboard, users, farmers, products, orders, drivers, escrow, refunds, and admin blogs panel.
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

## Dynamic Blog System

We have implemented a dynamic blog system across the platform:

### 1. Structure & Pages
- **Public Blog**:
  - `/public/blog`: Displays a beautiful featured banner article and a list of published blogs with category selectors and keyword search filters.
  - `/public/blog/[slug]`: Displays the full blog post dynamically to search engines and non-logged-in users.
- **Buyer & Farmer Portals**:
  - `/buyer/blog` & `/farmer/blog`: Displays the interactive blogs index right within the respective dashboard layout.
  - `/buyer/blog/[slug]` & `/farmer/blog/[slug]`: Displays the full post contents directly inside the dashboard viewport.
- **Admin Console**:
  - `/admin/blog`: Admin dashboard to view, edit, or delete existing posts, including publishing status (published vs draft).
  - `/admin/blog/new`: Dynamic block editor to compose a new post.
  - `/admin/blog/edit/[id]`: Pre-populated block editor to modify posts.

### 2. Interactive Block Builder Editor (`components/admin-blog-editor.tsx`)
Rather than typing unconstrained HTML, admins compose articles using structured **Content Blocks**. They can add, delete, and drag/reorder:
- **Heading Block**: Configurable H1, H2, or H3 tags.
- **Paragraph Block**: Standard formatted text areas.
- **Image Block**: Click to upload image files directly from their local PC. The file is sent to the backend `/blog/upload` route, uploaded to Cloudinary, and previewed in real-time.
- **YouTube Video Block**: Enter any YouTube link. The editor validates and extracts the YouTube Video ID to display an embed player preview.

### 3. Rendering Engine (`components/blog-detail.tsx`)
Deserializes the JSON block array from the database and renders standard, accessible HTML:
- Headings render as specific `<h1/h2/h3>` tags with premium typography.
- Paragraphs render with readable text leading.
- Images render in full-width containers with rounded corners and dropshadows.
- YouTube videos render inside responsive `iframe` player wrappers.

## State Management

- Global cart state lives in `CartProvider`.
- Auth helpers are centralized in `lib/kizfarm/auth.ts`.
- Most page data is fetched inside page components and held in local component state.
- Admin and dashboard loading states render dynamic loaders and spinners until data is fetched, instead of blank content.

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
