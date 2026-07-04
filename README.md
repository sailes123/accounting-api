# AI Karobar — Backend Architecture &amp; Build Guide

This document is the spec to build the rest of the backend against. It was derived by reading the
actual frontend code (pages, forms, localStorage prototypes, and the generated API client), and the
actual backend code that already exists (schema, routes, conventions). Follow the existing conventions
described in §2 for every new table/route so the codebase stays consistent.

## 0. Current State (already implemented — don't redo)

Stack: **Express 5 + Drizzle ORM + PostgreSQL (Aiven, SSL) + Zod v4 + JWT (jsonwebtoken/bcryptjs) +
pino/pino-http**. Entry: `src/index.ts` → `src/app.ts`, all routes mounted at `/api/v1`.

Existing tables: `users`, `customers`, `products`, `transactions`, `sales_orders` + `sales_order_items`.

Existing endpoints:
- `POST /auth/register`, `POST /auth/login`
- `GET/POST /customers`, `GET/PATCH/DELETE /customers/:id`
- `GET/POST /products`, `GET/PATCH/DELETE /products/:id`
- `GET/POST /transactions` (query: `type`, `customerId`), `GET/PATCH/DELETE /transactions/:id`
- `GET /dashboard/summary`, `GET /dashboard/recent-transactions`, `GET /dashboard/top-customers`
- `GET/POST /sales-orders`, `GET /sales-orders/:id`, `DELETE /sales-orders/:id`
- `GET /health`

Frontend is already wired to all of the above via a generated client in `frontend/src/api/*`
(base URL from `VITE_API_URL`, bearer token auto-attached). **Every other page** — Sales/Purchase
Invoice, Payment In/Out, Sales/Purchase Return, rich Product form, Categories, Units, Manufacture,
Settings, Accounts/Ledger/Balance — is a fully built UI that currently persists to `localStorage`,
waiting for real endpoints. Those localStorage shapes are the field-level spec for the tables below.

## 1. Key Design Decisions

**1.1 Customers and vendors share one table.** The frontend already does this — `purchase/vendor.tsx`
calls the customers API because there's no separate vendor concept. Rather than fight it, add a
`type` discriminator (`customer` / `vendor` / `both`) to `customers` instead of introducing a parallel
`vendors` table with duplicate logic. Every "vendor" FK in this doc points at `customers.id`.

**1.2 `transactions` stays the cash/day-book ledger.** Dashboard and Reports already read from it and
that shouldn't need a rewrite. When a Sales Invoice, Purchase Invoice, or standalone Payment
In/Out is recorded, also insert a corresponding row into `transactions` (in the same DB transaction)
so Dashboard/Reports keep working without modification. Treat `transactions` as the append-only
cash ledger; the new document tables (invoices, payments, returns) are the detailed records behind
each entry.

**1.3 Numeric columns are `numeric(12,2)` stored/sent as strings**, matching the existing
`customers.balance` / `products.sellingPrice` pattern (Postgres `numeric` round-trips as a string
through `pg`; cast with `Number()` in response formatters, exactly like `dashboard.ts` and
`sales-orders.ts` already do).

**1.4 Everything is scoped by `userId`, no orgs/teams.** Every table gets a `user_id` column, every
query filters `eq(table.userId, userId)`, exactly as today. Don't add a tenancy layer beyond this.

**1.5 Line items get an optional `product_id` FK.** Existing `sales_order_items.name` is free text
with no link to the catalog. Every new item table should keep the free-text `name`/`hsCode` (for
custom/one-off line items) but add a nullable `product_id` so real products can be looked up and
stock can eventually be decremented/incremented automatically.

**1.6 Status enums per document**, matching the localStorage prototypes exactly:
`sales_orders`/`purchase_orders`: `pending | converted | cancelled`.
`sales_invoices`/`purchase_invoices`: `pending | partially_paid | paid | cancelled`.
`sales_returns`/`purchase_returns`: `pending | approved | refunded`.

**1.7 File uploads** (payment attachment photo, company logo) — store as a `text` URL column
(`attachment_url`, `logo_url`). For MVP, serve uploads from local disk via `multer` +
`express.static('/uploads')`; swap for S3/Cloudinary later without a schema change.

**1.8 Response formatting**: keep the `fmtX()` helper-function pattern used in `sales-orders.ts` —
one function per resource that joins in the related name (customer/product) and converts numeric
strings to numbers, reused across list/get/create handlers.

## 2. Conventions for New Code (copy exactly)

- One file per resource in `src/db/schema/*.ts`, re-exported from `src/db/schema/index.ts`.
- `createInsertSchema` (drizzle-zod) for simple tables; a hand-written `z.object` (like
  `createSalesOrderSchema`) for tables with nested items/lines.
- One router file per resource in `src/routes/*.ts`, mounted in `src/routes/index.ts` behind
  `requireAuth` (except `/auth` and `/health`).
- Every handler: `const userId = (req as AuthRequest).userId!;`, `safeParse` the body, `400` with
  `{ error, details }` on validation failure, `500` with `{ error: "Internal server error" }` +
  `req.log.error({ err }, "...")` on exceptions, `404 { error: "Not found" }` when a row is missing.
- IDs are `serial`, dates in existing tables are `text` (kept for consistency, e.g. `"2082-03-15"`
  for AD or BS strings) — keep new date fields `text` too rather than mixing in `timestamp`/`date`
  types, unless doing real range queries (see Reports in §5).
- `createdAt: timestamp({ withTimezone: true }).notNull().defaultNow()` on every table.

## 3. Database Schema — New &amp; Extended Tables

### 3.1 `customers` (extend existing table)
Add columns:
| column | type | notes |
|---|---|---|
| `type` | text enum `customer\|vendor\|both` | default `'customer'` |
| `email` | text, nullable | from `AddPersonalModal` quick-add form (not persisted today) |
| `pan_type` | text enum `PAN\|VAT\|NONE`, nullable | |
| `pan_number` | text, nullable | |
| `remarks` | text, nullable | |

Keep: `name`, `phone`, `address`, `balance` (udharo/credit owed).

### 3.2 `categories`
| column | type |
|---|---|
| `id` | serial PK |
| `user_id` | integer |
| `name` | text not null |
| `parent_category_id` | integer, nullable, self-FK → `categories.id` (covers "sub-category") |
| `description` | text, nullable |
| `created_at` | timestamp |

### 3.3 `units`
| column | type |
|---|---|
| `id` | serial PK |
| `user_id` | integer |
| `name` | text not null (e.g. "Kilogram") |
| `short_name` | text not null (e.g. "kg") |
| `accept_fraction` | boolean, default false |
| `created_at` | timestamp |

### 3.4 `warehouses`
| column | type |
|---|---|
| `id` | serial PK |
| `user_id` | integer |
| `name` | text not null |
| `created_at` | timestamp |

Seed 1-2 default rows ("Main Warehouse") on first product creation if the user has none, or just
let the frontend's hardcoded list become user-managed data going forward.

### 3.5 `products` (extend existing table)
Add columns:
| column | type | notes |
|---|---|---|
| `type` | text enum `goods\|services\|expenses` | default `'goods'` |
| `category_id` | integer, nullable, FK → `categories.id` | |
| `sub_category_id` | integer, nullable, FK → `categories.id` | |
| `hsn_code` | text, default `''` | |
| `sku` | text, nullable | unique per `user_id` (composite unique index) |
| `reorder_point` | integer, nullable | |
| `description` | text, nullable | |
| `unit_id` | integer, nullable, FK → `units.id` | |
| `sub_unit_id` | integer, nullable, FK → `units.id` | |
| `unit_conversion_factor` | numeric(12,4), nullable | e.g. 1 box = 12 pcs |
| `opening_qty` | integer, default 0 | initial stock at creation, distinct from live `stock` |
| `warehouse_id` | integer, nullable, FK → `warehouses.id` | |
| `size` | text, nullable | |
| `color` | text, nullable | |
| `expiry_date` | text, nullable | |
| `purchase_non_taxable` | boolean, default false | |
| `sales_non_taxable` | boolean, default false | |
| `party_id` | integer, nullable, FK → `customers.id` | preferred vendor |

Keep: `name`, `stock`, `sellingPrice`, `purchasePrice`.

### 3.6 `sales_orders` / `sales_order_items` (extend existing tables)
- `sales_orders`: add `status` text enum `pending\|converted\|cancelled`, default `'pending'`.
- `sales_order_items`: add `product_id` integer, nullable, FK → `products.id`; add `batch` text,
  default `''` (present in the Sales Order UI, not yet in the schema).

### 3.7 `sales_invoices`
| column | type |
|---|---|
| `id` | serial PK |
| `user_id` | integer |
| `sn` | text not null |
| `invoice_no` | text not null, default `''` |
| `invoice_date` | text not null |
| `due_date` | text, nullable |
| `customer_id` | integer, nullable, FK → `customers.id` |
| `sales_order_id` | integer, nullable, FK → `sales_orders.id` (optional "convert SO → Invoice" link) |
| `tax_pct` | numeric(5,2), default `13` |
| `discount_pct` | numeric(5,2), default `0` |
| `advance` | numeric(12,2), default `0` |
| `remarks` | text, default `''` |
| `status` | text enum `pending\|partially_paid\|paid\|cancelled`, default `'pending'` |
| `created_at` | timestamp |

### 3.8 `sales_invoice_items`
Same shape as `sales_order_items`: `id, invoice_id FK, product_id (nullable FK), name, hs_code, batch, quantity, price`.

### 3.9 `sales_invoice_payments`
Captures the multi-method payment split from the invoice form (cash + mobile banking + eSewa +
others in one save).
| column | type |
|---|---|
| `id` | serial PK |
| `invoice_id` | integer, FK → `sales_invoices.id` |
| `method` | text enum `cash\|mobile_banking\|esewa\|bank\|others` |
| `amount` | numeric(12,2) |
| `bank_name` | text, nullable |
| `created_at` | timestamp |

`sum(sales_invoice_payments.amount) vs grand_total` drives the `status` field on save
(`paid` if fully covered, `partially_paid` if partial, `pending` if none / all on credit).

### 3.10 `sales_returns` / `sales_return_items`
```
sales_returns:      id, user_id, credit_note_no, date, sales_invoice_id (nullable FK),
                     customer_id (nullable FK), tax_pct, reason, other_reason (nullable),
                     status enum(pending|approved|refunded) default 'pending', created_at
sales_return_items: id, return_id FK, sales_invoice_item_id (nullable FK), name,
                     original_qty, return_qty, price
```

### 3.11 Purchase side — exact mirror of 3.6–3.10
```
purchase_orders            (= sales_orders,  customer_id column renamed vendor_id, still → customers.id)
purchase_order_items       (= sales_order_items)
purchase_invoices          (= sales_invoices, + vendor_id instead of customer_id)
purchase_invoice_items     (= sales_invoice_items)
purchase_invoice_payments  (= sales_invoice_payments, method enum can reuse the same values)
purchase_returns           (= sales_returns, + vendor_id, debit_note_no instead of credit_note_no)
purchase_return_items      (= sales_return_items)
```
Build these by copying the sales-side schema/routes and swapping the FK name and the `SO-`/`INV-`/
`CN-` prefixes for `PO-`/`PINV-`/`DN-`.

### 3.12 `payments_in` / `payments_out`
Standalone receivable/payable collection log — independent of any specific invoice (the "Payment
In" / "Payment Out" pages let you log a payment against a party generally, not just one invoice).
```
payments_in:  id, user_id, receipt_no, date, customer_id (nullable FK → customers.id), amount,
              method enum(cash|bank_transfer|cheque|esewa|khalti|other), remarks,
              attachment_url (nullable), created_at
payments_out: id, user_id, receipt_no, date, vendor_id (nullable FK → customers.id), amount,
              method (same enum), remarks, attachment_url (nullable), created_at
```
On create: adjust `customers.balance` by `-amount` (payment in reduces what they owe you) /
`+amount` (payment out — you paid a vendor down), and insert a mirrored row into `transactions`
(type `income`/`expense`, `payment_mode` mapped from `method`) so Dashboard stays accurate.

### 3.13 `manufacture_records` / `manufacture_raw_materials`
```
manufacture_records:     id, user_id, product_id (FK → products.id, the output item), batch,
                          quantity, unit_id (nullable FK), created_date, expiry_date (nullable),
                          labor_cost, other_expenses, note, created_at
manufacture_raw_materials: id, manufacture_record_id FK, product_id (FK → products.id), batch,
                            qty, cost
```
On create (in one DB transaction): increment `products.stock` for the output product by
`quantity`, decrement `products.stock` for each raw material by its `qty`.

### 3.14 `company_settings`
One row per user.
```
id, user_id (unique), shop_name, phone, address, pan_number, logo_url (nullable),
currency default 'NPR', fiscal_year (text, BS format e.g. "2082/83"), created_at, updated_at
```

### 3.15 Accounts / Ledger (greenfield double-entry — build last)
The Accounts pages are currently just "Coming Soon" placeholders, so this is unconstrained by any
existing UI. Minimal double-entry design to support a real Ledger and Balance Sheet later:
```
chart_of_accounts: id, user_id, code, name,
                    type enum(asset|liability|equity|income|expense),
                    parent_account_id (nullable, self-FK), created_at
journal_entries:      id, user_id, date, reference (text, e.g. "sales_invoice:42"), description,
                       created_at
journal_entry_lines:  id, journal_entry_id FK, account_id FK, debit numeric(12,2) default 0,
                       credit numeric(12,2) default 0
```
Every invoice/payment/return handler that writes to `transactions` should, once this exists, also
post a balanced `journal_entries` + two-or-more `journal_entry_lines`. Treat this as phase 2 —
ship the document flows first, wire ledger postings once the Accounts UI is actually being built.

## 4. Recommended Build Order

1. **Extend `customers` and `products`** (§3.1, §3.5) — everything else FKs into these.
2. **`categories`, `units`, `warehouses`** — small standalone CRUD, needed by the product form.
3. **Sales flow**: extend `sales_orders`/`sales_order_items` → build `sales_invoices` (+items,
   +payments) → `sales_returns`.
4. **Purchase flow**: copy the sales flow wholesale (§3.11).
5. **`payments_in` / `payments_out`** — standalone, but wire the `customers.balance` +
   `transactions` side effects described in §3.12.
6. **`manufacture_records` / `manufacture_raw_materials`**.
7. **`company_settings`**.
8. **Accounts / double-entry ledger** (§3.15) — only once the Accounts UI moves past "Coming Soon".

## 5. API Endpoints to Add

Follow the exact REST shape already used for `/sales-orders` (list with joins, single get, create
with nested items in one transaction, delete). All under `/api/v1`, all behind `requireAuth`.

```
PATCH  /customers/:id                     (extend existing route to accept new columns)

GET    /categories            POST /categories           PATCH/DELETE /categories/:id
GET    /units                 POST /units                PATCH/DELETE /units/:id
GET    /warehouses            POST /warehouses           PATCH/DELETE /warehouses/:id

PATCH  /products/:id                      (extend to accept new columns)

GET    /sales-orders/:id      PATCH /sales-orders/:id    (add — currently missing)

GET    /sales-invoices        POST /sales-invoices
GET    /sales-invoices/:id    PATCH /sales-invoices/:id  DELETE /sales-invoices/:id
GET    /sales-returns         POST /sales-returns
GET    /sales-returns/:id     PATCH /sales-returns/:id   (approve/refund status transitions)

GET    /purchase-orders       POST /purchase-orders      GET/PATCH/DELETE /purchase-orders/:id
GET    /purchase-invoices     POST /purchase-invoices    GET/PATCH/DELETE /purchase-invoices/:id
GET    /purchase-returns      POST /purchase-returns     GET/PATCH /purchase-returns/:id

GET    /payments-in           POST /payments-in          GET/DELETE /payments-in/:id
GET    /payments-out          POST /payments-out         GET/DELETE /payments-out/:id

GET    /manufacture           POST /manufacture          GET/DELETE /manufacture/:id

GET    /company-settings      PUT /company-settings      (single row per user, upsert)

GET    /reports/sales?from=&to=       (date-range aggregation over sales_invoices/transactions)
GET    /reports/purchase?from=&to=
GET    /reports/expenses?from=&to=
```

`reports/*` should do server-side date-range filtering and aggregation (the current frontend
report pages fetch the *entire* transaction list and filter client-side — fine at prototype scale,
worth fixing once real invoice data exists). This is also the point to switch report/date filters
away from raw `text` dates to a real `date`/`timestamp` column if range queries get slow.

## 6. Request/Response Shape Notes (from what the frontend already expects)

- Auth responses: `{ token: string, user: { id, fullName, email } }` — unchanged, don't touch.
- List endpoints may return a bare array **or** `{ data: [...] }` — the frontend's
  `unwrapListResponse()` helper in `frontend/src/api/custom-fetch.ts` accepts either, but stay
  consistent with the bare-array style already used by `/customers`, `/products`, `/sales-orders`.
- Money fields come back as `number` in JSON (not string) — every formatter must `Number(...)` the
  Postgres numeric string before responding, exactly like `fmtOrder`/`dashboard.ts` do today.
- `billNo`-style computed identifiers (e.g. `"SA" + 100 + id`) are **not stored**, they're computed
  in the response formatter — keep doing this for `invoiceNo`/`creditNoteNo`/`receiptNo` *only* when
  the user hasn't supplied a manual number (the frontend has an auto/manual toggle for these — send
  whatever the client provided, default to server-generated only if empty).

## 7. Explicitly Out of Scope for Now

- Multi-user/org/team accounts, roles/permissions — single user per account throughout.
- Refresh tokens, logout endpoint, password reset — not present in the frontend, don't add. 
- Real file/object storage — local disk + multer is enough until deployment needs otherwise.
- Fiscal year as a first-class entity — `company_settings.fiscal_year` (a string) is enough; the
  frontend's `FiscalYearContext` doesn't send it to the backend anywhere today.
