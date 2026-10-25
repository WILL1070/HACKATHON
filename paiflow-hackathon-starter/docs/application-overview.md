# StayFlow — Application Overview

A detailed explanation of the marketplace at `paiflow-hackathon-starter`: a
Next.js 15 demo booking marketplace where customers pay in XLM through a
**non-custodial** Paiflow payment flow on the Stellar testnet, signing every
transaction themselves in the Freighter browser wallet. The server never
sees a private key — it prepares payment envelopes, and the browser signs
and submits them.

---

## 1. What the app is

StayFlow lets customers book spaces — hotels, vacation houses, lounges,
conference rooms, study hubs, coffee shops, internet cafés — and nearby
event-driven stays, paying in XLM through a verify-before-confirm payment
pipeline.

| Area | Route | Purpose |
| --- | --- | --- |
| Marketplace home | `/` | Hero search, category browsing, listings grid, events preview, host CTA |
| Listing details | `/listing/[id]` | Full details, booking controls, live availability, promo pricing |
| Checkout | `/checkout/[id]` | Booking summary + the four-step payment panel |
| Events & Festivals | `/events`, `/events/[id]` | Event browsing, filters, event detail + nearby listings |
| Payment demo | `/pay` | The original minimal Paiflow 1-XLM walkthrough (preserved) |
| Admin | `/admin/events` | Demo-grade event + promotion management (**no auth**) |

---

## 2. Technology stack

- **Framework:** Next.js 15 (App Router, React 19, TypeScript, ESM). Pages
  showing live data use `export const dynamic = "force-dynamic"`.
- **Payment SDK:** `@paiflow/sdk` 0.2.0 — runs **server-only**; the browser
  never touches the Paiflow credential.
- **Wallet:** `@stellar/freighter-api` — connects, reads address/network,
  signs envelopes.
- **Chain:** Stellar **testnet** only. `lib/types.ts` holds the passphrase
  `Test SDF Network ; September 2015`; `lib/paiflow.ts` and `lib/wallet.ts`
  hard-refuse any other network.
- **State:** **No database.** Bookings, payment attempts, events, and
  promotions live in per-process in-memory `Map`s and are lost on restart —
  deliberately documented as demo-grade.
- **Checks:** `pnpm typecheck` (tsc) and `pnpm test` (vitest, 114 tests).
  There is no lint script.

---

## 3. The payment flow — the heart of the app

The design follows Paiflow's documented lifecycle:
**connect → prepare → sign → submit → verify → recover**, with one rule
baked in everywhere: *never replace a payment you aren't sure about —
reconcile the original.*

### Step by step (booking checkout)

1. **Create booking** — `POST /api/bookings`
   (`app/api/bookings/route.ts` → `createBooking` in `lib/demo-bookings.ts`).
   Validates listing, dates, guests, duration, time slots, minimum spend,
   and seat/PC overlap. Returns a `PENDING_PAYMENT` booking with
   `totalStroops`. Money is always integer stroops via `lib/amount.ts` —
   floats are never used for money.
2. **Prepare** — `POST /api/pay` with `action: "prepareBooking"`
   (`lib/booking-payments.ts`). The server asks Paiflow for an unsigned XDR
   envelope for exactly the booking total, **persists the payment attempt
   before anything else** (one active attempt per booking), and returns the
   envelope + `txHash` + `expiresAt` (180-second validity window).
3. **Sign** — in the browser, `signPrepared` (`lib/wallet.ts`) checks the
   wallet is still the original one and that Freighter is on testnet, then
   calls `signTransaction`. `assertOriginal` (`lib/transaction.ts`) verifies
   the signed envelope hashes to the *same* hash as the preparation.
4. **Submit** — `action: "submitBooking"` sends `{ signedXdr }` to the
   server, which re-checks the envelope hash against the stored attempt and
   submits the **original** envelope to Paiflow. The attempt becomes
   `SUBMITTED`.
5. **Verify before confirming** — `checkBookingPayment` polls
   `action: "statusBooking"`. Only **SUCCESS on the original hash *plus* a
   matching RECEIVE event for the expected amount** marks the booking `PAID`
   (`lib/confirmation.ts` enforces deadline/expiry logic). SUCCESS-without-
   receipt, FAILED, REJECTED, and "still pending" are distinct UI states;
   UNKNOWN never authorizes a new payment.
6. **Recover** — `lib/recovery.ts` and the `/pay` demo keep signed-envelope
   evidence in `localStorage` so an interrupted flow can be reconciled
   instead of replaced.

### Server-side payment configuration

`lib/paiflow.ts` reads three **server-only** env vars (never
`NEXT_PUBLIC_*`):

- `PAIFLOW_BASE_URL`
- `PAIFLOW_API_TOKEN` (a `pfd_…` developer token)
- `PAIFLOW_DEPLOYMENT_ID`

On startup it fetches the deployment and **refuses to operate unless** it is
an active testnet, native-XLM, Receive deployment with execute support.
`GET /api/integration` exposes only non-secret readiness
(`ready: true/false`) to the browser — checkout shows a "not configured"
notice instead of failing.

---

## 4. Data model

```
DemoListing        (lib/demo-listings.ts — static sample data)
├── core: id, title, category, location, hostName, priceXlm,
│   priceUnit ("night" | "hour"), rating, reviews, guests, beds,
│   imageUrl, description
├── venue details (optional): openingHours {open, close}, amenities[],
│   wifi, powerOutlets, seatingTypes[], noiseLevel, pcSpecs,
│   gamingEquipment[], verifiedSpeedMbps, minSpendXlm, reservationKinds[]
└── seats[] (optional reservable inventory):
    { id, label, kind: table|seat|workspace|pc, specs }

Booking            (lib/demo-bookings.ts — in-memory)
├── id, listingId/title, hostName, customerAddress (bound at payment time)
├── checkIn, checkOut (dates), guests, units, unitLabel
├── slot fields (optional): resourceId, resourceLabel, startHour
├── pricing: totalXlm, totalStroops, optional promotionId/Label, discountXlm
└── status: PENDING_PAYMENT → PAID | PAYMENT_FAILED | UNRESOLVED (+ txHash)

PaymentAttempt     (one per booking): prepared XDR/hash/expiry, optional
                   signedXdr, txHash, status PREPARED → SUBMITTED
                   → VERIFIED | FAILED

MarketplaceEvent   (lib/events.ts — in-memory; seeded examples are
│                   DRAFT + tentative + unverified)
├── name, description, coverImageUrl,
│   category (festival|cultural|concert|fair|convention|community),
│   city, province, venue, startDate, endDate
├── schedule[], organizer, officialLinks[], ticketingLinks[]
├── verified, lastVerifiedAt, tentative (dates not officially announced)
└── status: DRAFT → PUBLISHED | UNPUBLISHED → ARCHIVED

EventPromotion     (lib/promotions.ts — in-memory)
└── eventId? (optional tie), listingId, label,
    kind (percent 1–90 | fixed XLM), value, startDate..endDate window,
    terms, active
```

Key relationships: bookings reference listings; payment attempts reference
bookings (1:1); promotions reference listings and optionally events; events
relate to listings only through the location-token `nearbyListings()` match —
no distance math exists because listings have no coordinates.

---

## 5. Feature areas in detail

### Marketplace & bookings

- **Categories (7):** `hotel`, `vacation-house`, `lounge`,
  `conference-room`, `study-hub`, `coffee-shop`, `internet-cafe`. The
  `CATEGORIES` array drives the category bar, hero search, and filtering
  automatically.
- **Hourly & nightly bookings:** nightly uses check-in/check-out dates;
  hourly uses a duration; listings with `seats` inventory add date + unit +
  start-hour pickers.
- **Overlap prevention:** the server rejects two live bookings of the same
  unit on the same day with overlapping hour windows (409 CONFLICT); failed
  payments release the slot. `GET /api/bookings?listingId=&date=` powers the
  "already reserved" display.
- **Server-side validation only:** the UI warns, but `createBooking`
  enforces opening hours (including overnight windows like 10:00–02:00),
  capacity, duration bounds, minimum spend, and per-unit conflicts.

### Events & Festivals

- Public pages only ever show `PUBLISHED` events; the server **refuses to
  publish** unverified or tentative dates and requires at least one official
  source link — unverified festival dates can never appear as confirmed.
- Seeded Philippine festivals (Dinagyang, Panagbenga, Manggahan) are
  explicitly labeled *example — unverified*, with placeholder dates and
  empty official-links, awaiting real verification in the admin UI.
- Cards show verified/unverified and "Dates tentative" chips; detail pages
  show schedule, organizer, official links, external ticketing links (with
  "StayFlow does not sell tickets"), and a **nearby listings** section that
  matches by location name and states plainly that no distance claims are
  made. Selecting a listing never books anything.

### Host promotions

- Managed in the admin UI; applied **transparently** at listing and checkout
  (struck-through subtotal, named discount row, final total) and identically
  in `createBooking`, so the price the customer approves in Freighter is
  exactly what the booking records.
- Guards: percent capped at 1–90, fixed discount must be smaller than the
  unit rate, and any promotion that would reduce a total below zero is a
  hard validation error rather than a silent clamp. Existing bookings are
  never retroactively changed.

### Admin (`/admin/events`)

- Open (unauthenticated, clearly bannered as demo-grade) interface for the
  full event lifecycle — create (draft) → edit → mark verified (stamps
  `lastVerifiedAt`) → publish → unpublish → archive — plus promotion
  create/activate/deactivate. All mutations go through the same validated
  server functions the APIs use.

---

## 6. Security & reliability design

- **Token isolation:** the Paiflow developer token exists only in
  `.env.local` on the server; the SDK is imported only into `server-only`
  modules; the integration endpoint leaks nothing but a boolean.
- **Same-origin + rate limiting:** all mutating routes check
  `Origin`/`sec-fetch-site` (`lib/http.ts`) and pass through a payment rate
  limiter; JSON bodies are size-capped while streaming.
- **Idempotency & no double-payment:** one attempt per booking;
  re-preparation returns the *stored original*; duplicate submission is
  rejected; conflicting-wallet binding is a 409.
- **Error taxonomy:** 4xx validation/conflict errors reach the client with
  safe messages; anything unexpected becomes a 502 "UNRESOLVED — retain the
  original record," never an instruction to retry.
- **Honesty constraints:** no real-auth claims, no distance claims, no
  ticket sales, no USDC (payments are native XLM by deployment design), and
  every demo surface says it is sample data.

---

## 7. Known limitations (by design, documented in README)

- In-memory stores: bookings, availability, events, and promotions **do not
  survive a restart**; overlap prevention is only reliable within a process
  lifetime.
- No authentication or host accounts; the admin page must not be deployed
  as-is.
- No event-data API feed — entry is manual with official source links.
- No lint script; Node version warns (project wants `>=22.22.2 <23`; checks
  pass on newer versions regardless).

---

## 8. Run and verify

```sh
cp .env.example .env.local   # fill in PAIFLOW_* from your Paiflow deployment
pnpm install
pnpm dev                     # http://localhost:3000
pnpm typecheck               # tsc --noEmit
pnpm test                    # vitest run (114 tests)
```
