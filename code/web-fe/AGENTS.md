# Declay Store Frontend — AI Agent Instructions

This document helps AI coding agents be immediately productive in the `web-fe` Next.js 16 + React 19 frontend.

## Quick Reference

- **Framework**: Next.js 16 (App Router, React 19)
- **Styling**: Tailwind CSS v4 + custom CSS variables
- **Language**: TypeScript (strict mode)
- **State**: Client-side only (no Redux/Zustand framework)
- **Start**: `npm run dev` (port 3000)
- **API URL**: `NEXT_PUBLIC_API_URL=http://localhost:3001/api`

See [CLAUDE.md](../CLAUDE.md) for full architecture, design system, and coding conventions.

---

## Next.js 16 / React 19 Breaking Changes

**This is NOT the Next.js you know.** APIs and conventions differ from training data:

- Refer to `node_modules/next/dist/docs/` for latest API docs
- Heed deprecation notices in error messages
- Server Components are default — use `'use client'` only for interactivity
- No `getServerSideProps`, `getStaticProps` (use async components instead)

---

## Page Structure

### Route Organization
```
app/
├── layout.tsx                    # Root layout (fonts, globals, body wrapper)
├── (storefront)/                 # Customer-facing pages (public)
│   ├── layout.tsx               # Storefront chrome (nav, footer)
│   ├── page.tsx                 # Home
│   ├── products/
│   │   ├── page.tsx             # Product list
│   │   └── [slug]/page.tsx      # Product detail (SSG params: productId)
│   ├── cart/page.tsx
│   ├── checkout/page.tsx
│   ├── orders/page.tsx          # Order history (customer auth required)
│   ├── auth/                    # OAuth callback routes
│   ├── login/, register/
│   └── blog/, careers/
│
├── (admin)/                      # Admin dashboard (auth-gated)
│   ├── layout.tsx               # Root layout (Sonner toast, global admin styles)
│   ├── login/page.tsx           # Admin login (public)
│   └── (protected)/             # Auth check + redirect here
│       ├── layout.tsx           # Enforce admin auth, redirect /admin/login if not authed
│       ├── page.tsx             # Admin dashboard home
│       ├── users/
│       ├── products/
│       ├── orders/
│       └── ...
│
└── globals.css                  # Tailwind + CSS variables
```

### Layout Hierarchy
- **Root layout**: Fonts (Fraunces, Source Serif 4, Archivo, Geist Mono), provider setup
- **`(storefront)` layout**: Storefront UI chrome (header, footer, navigation)
- **`(admin)` layout**: Root admin layout (Sonner toast container)
- **`(admin)/(protected)` layout**: Auth guard — reads token from localStorage, redirects to `/admin/login` if not authed

### Server vs Client
- **Prefer server components**: Data fetching, DB queries, sensitive logic
- **Client components only for**: State, event handlers, hooks, interactivity
- Mark with `'use client'` at the top of file

---

## API Integration

### Helper: `lib/api.ts`
All API calls go through the `api` helper — never use `fetch` directly.

**Features**:
- Auto-injects auth token (`Authorization: Bearer <token>`) from localStorage
- Auto-retries on 401 (refreshes token, retries once)
- Handles response shape: `{ success, message, data, meta }`
- Returns typed data or throws error

**Usage**:
```typescript
import { api } from '@/lib/api';

// Fetch products
const { data: products } = await api.get<IProduct[]>('/products');

// Create product (admin)
await api.post('/admin/products', productData);

// Update order
await api.patch(`/orders/${orderId}`, { status: 'shipped' });
```

### Error Handling
The `api` helper throws typed errors. Wrap in try/catch:
```typescript
try {
  await api.post('/checkout', orderData);
} catch (err) {
  const message = err instanceof Error ? err.message : 'Unknown error';
  toast.error(message);
}
```

### Authentication
- Customer token: Stored in `localStorage.getItem('token')` (access token only)
- Admin token: Stored in `localStorage.getItem('adminToken')`
- Refresh token: In httpOnly cookie (auto-handled by backend)
- **Login flow**: `POST /auth/login` → get access + refresh → store in localStorage
- **Logout**: Clear localStorage, revoke token server-side

---

## Component Patterns

### Layout Structure
Layouts enforce auth and render shared UI:

```typescript
// app/admin/(protected)/layout.tsx
import { redirect } from 'next/navigation';

export default function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read token client-side (this is a server component wrapping a client component)
  return <AdminAuthGuard>{children}</AdminAuthGuard>;
}
```

Use a client component to check auth and redirect:
```typescript
// components/AdminAuthGuard.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) router.push('/admin/login');
  }, []);
  return children;
}
```

### Page Fetching
Server components can fetch directly:

```typescript
// app/products/page.tsx (server component)
export default async function ProductsPage() {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`);
  const { data: products } = await response.json();
  return <ProductList products={products} />;
}
```

For interactive pages, use a client component with `useEffect`:
```typescript
// components/AdminProductsClient.tsx
'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function AdminProductsClient() {
  const [products, setProducts] = useState<IProduct[]>([]);
  useEffect(() => {
    api.get<IProduct[]>('/admin/products')
      .then(res => setProducts(res.data))
      .catch(err => toast.error(err.message));
  }, []);
  return <ProductTable products={products} />;
}
```

---

## Styling

### Visual Identity
**Warm/artisan aesthetic**: Earthy tones, textured, handcrafted feel.

### Tailwind v4 + CSS Variables
- Custom colors and spacing defined in `globals.css`
- Utility-first: Use Tailwind classes, avoid custom CSS unless necessary
- Class naming: `btn-ink`, `btn-line`, `card-soft`, `bg-sky-gradient`, etc.

### Theme Example
```css
/* globals.css */
@layer theme {
  :root {
    --color-ink: #1a1a1a;
    --color-sand: #e8dcc8;
    --color-sky: #87ceeb;
  }
}
```

```tsx
<button className="px-4 py-2 bg-slate-50 text-slate-900 rounded hover:bg-slate-100">
  Add to Cart
</button>
```

---

## Common Patterns

### Form Submission
```typescript
'use client';
async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  try {
    await api.post('/products', Object.fromEntries(formData));
    toast.success('Product created!');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Error');
  }
}
```

### Pagination
Use the `usePagination` hook from `lib/usePagination.ts`:

```typescript
const { page, limit, totalPages, handlePageChange } = usePagination({ limit: 20 });
// Fetch with ?page={page}&limit={limit}
```

### Data Fetching + Loading State
```typescript
'use client';
const [loading, setLoading] = useState(false);
const [items, setItems] = useState([]);

useEffect(() => {
  setLoading(true);
  api.get('/items?page=' + page)
    .then(res => setItems(res.data))
    .finally(() => setLoading(false));
}, [page]);

if (loading) return <Skeleton />;
return <ItemsList items={items} />;
```

---

## Environment Setup

```bash
cd web-fe
npm install
npm run dev          # Runs on http://localhost:3000
```

**Required env vars** (`.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Ensure backend is running: `npm run dev` from `web-api/` folder.

---

## Common Pitfalls

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| 404 on API calls | `NEXT_PUBLIC_API_URL` not set or wrong | Check `.env.local` matches backend port (3001) |
| Auth token not persisted | Not using `localStorage` | Use `lib/api.ts` helper which handles auth |
| Page shows old data | Component not re-fetching on param change | Add dependency to `useEffect` |
| 401 even with valid token | Token format wrong or expired | Clear localStorage, log in again |
| Styling not applied | Tailwind classes not recognized | Ensure `globals.css` imported in root layout |
| Infinite redirect loop | Auth check in layout runs on every render | Move auth check to client component with `useEffect` |

---

## Testing (Not Yet Implemented)

When tests are added, use:
- **Frontend**: React Testing Library + Vitest
- Start with critical user flows (login, checkout, admin CRUD)

---

## Debugging

**Next.js debug logs**:
```bash
DEBUG=* npm run dev
```

**Chrome DevTools**:
- Check Network tab for API calls
- Check localStorage for auth tokens
- Check Application tab for cookies

**Common HTTP Status Codes**:
- 400: Validation error — check response `meta.details`
- 401: Unauthorized — refresh token or log in again
- 403: Forbidden — admin-only endpoint accessed without admin token
- 404: Resource not found
- 500: Server error — check backend logs
