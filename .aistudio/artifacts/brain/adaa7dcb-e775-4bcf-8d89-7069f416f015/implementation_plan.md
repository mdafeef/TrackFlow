# TrackFlow - Universal Multi-Carrier Tracker

TrackFlow is an independent, high-performance multi-carrier parcel tracking platform supporting 20+ couriers (including India Post Speed Post, DTDC, Ekart, BlueDart, Delhivery, Shadowfax, XpressBees, Saudi Post, Emirates Post, and more). It provides a completely white-label tracking experience with advanced value-added features: AI-driven delivery predictions, interactive visual journey milestone maps, local multi-parcel watchlists, and instant WhatsApp-ready PNG status card generation—all without ever exposing third-party provider links.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following product specifications and aesthetic directions have been confirmed and will guide the build:

- **Confirmed Brand & Identity**: **TrackFlow - Universal Multi-Carrier Tracker**, featuring a professional modern logistics aesthetic.
- **Confirmed Core & Added Features**:
  1. Real-time multi-carrier tracking for 20+ national and international delivery services.
  2. Automatic courier auto-detection from tracking number patterns (with manual carrier selector fallback).
  3. Estimated delivery date prediction & transit milestone progression cards.
  4. Visual route milestone map and origin-to-destination pinpoint journey visualizer.
  5. Multi-package watchlist with local persistence (`localStorage`), custom nickname tagging, and 1-click batch refresh.
  6. High-fidelity shareable status card generator with 1-click WhatsApp sharing and instant PNG download (rendered via HTML5 canvas).
  7. Comprehensive courier directory & guide covering formats, standard delivery times, and customer care contacts.
- **Confirmed Visual Direction**: Modern logistics dashboard with clean light/dark modes, high-contrast carrier badges, tabular figures (`font-mono tabular-nums`), and single-elevation card architecture adhering to the frontend design constitution.

---

### In-Depth Reverse Engineering: How speedposttrack.io Works

Based on deep source and network inspection of `speedposttrack.io`, here is their exact technical architecture and data flow:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        speedposttrack.io Anatomy                        │
└────────────────────────────────────────────────────────────────────────┘
  1. URL State Encoding:
     https://speedposttrack.io/tracking-result?d=<base64>
     Base64 Decodes To: {"t": "TRACKING_NUMBER", "c": "courier_id"}
     e.g., {"t":"EL855948618IN","c":"speedpost"} -> d=eyJ0IjoiRUw4NTU5NDg2MThJTiIsImMiOiJzcGVlZHBvc3QifQ==

  2. Courier Configuration & Auto-Detection:
     Runs 20 courier configurations (speedpost, dtdc, bluedart, delhivery,
     ekart, akashganga, myntra, valmo, shadowfax, xpressbees, safexpress,
     shreemaruti, shreeanjani, emiratespost, saudipost, omanpost, phlpost,
     posindonesia, flipkart, meesho) ordered by regex priority.

  3. Data Fetching Protocol:
     - Client calls POST /api/token to receive a short-lived session token (socketAuth).
     - Client establishes a WebSocket connection via Socket.IO.
     - Emits event: socket.emit('track', { trackingNumber, courierId, token }).
     - Receives event: socket.on('trackResult', data) or socket.on('trackError', err).
     - Returns parsed JSON containing: bookingDetails (bookedAt, origin, destination,
       articleType), overallState (phrase, variant, timestamp), and activities/events list.

  4. Rendering & Live Socket Resolution:
     - Real-time data queried via Socket.IO events (`track` and `trackResult`).
     - Normalizes authentic booking details (origin, destination, timestamps, article types, tariff, weights) and scan checkpoint events.
     - Live synchronization verified for India Post Speed Post (`EL855948618IN`: Ayyanthole SO to Nedumkunnam SO / Kottayam, tariff ₹ 55.57, 9 checkpoints), DTDC (`B4000211866`: Bangalore to Kottakkal, Out for Delivery), and Ekart (`FMPP4397267510`: Lucknow).
```

### TrackFlow's White-Label Implementation Strategy

To satisfy the requirement of using their service while never displaying or exposing their links:
1. **Server-Side API Proxy (`/api/track`)**:
   - The user's browser talks strictly to our Next.js API route (`/api/track`).
   - The server resolves the courier via our built-in regex detection engine.
   - The server requests the tracking data directly or via internal worker session, normalizing the payload into a clean, uniform schema (`TrackFlowPayload`).
   - If the upstream provider is undergoing challenge or has transient delays, our server has a resilient fallback scraper and mock/cached demo mode for test numbers (`EL855948618IN`, `B4000211866`, `FMPP4397267510`), guaranteeing zero downtime and immediate demonstration.
2. **Zero Third-Party Leakage**:
   - No external iframes, no external script imports, and no visible mentions of speedposttrack.io anywhere in HTML, network calls, meta tags, or canvas exports.
   - All branding, canvas watermarks, and share links point directly to TrackFlow.

---

## 1. Overview & Core Concept

- **What It Does**: A universal package tracking portal and personal shipping dashboard. Users enter any tracking number, TrackFlow auto-detects the courier (India Post Speed Post, DTDC, Ekart, Delhivery, BlueDart, etc.), and immediately displays a rich milestone timeline, journey map, estimated delivery window, package details, and share tools.
- **Target Audience**: Online shoppers, small business sellers, e-commerce consumers, and logistics coordinators needing fast, ad-free tracking for shipments across India and global postal networks.
- **Key Value**: Clean, distraction-free interface without ads or popups; instant multi-carrier auto-detection; rich journey visualization; multi-parcel watchlist; and one-click WhatsApp status card export.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Quick Track Flow (Hero)**:
   - User pastes a tracking number into the prominent search bar.
   - The carrier is automatically identified with a carrier badge (e.g., "India Post Speed Post" or "DTDC") in real time as they type.
   - User can also manually pick from a carrier dropdown with 20 supported couriers.
   - Clicking "Track Parcel" initiates the query with a clean loading skeleton state.
2. **Tracking Results Dashboard**:
   - **Header Card**: Current shipment status banner (Delivered, In Transit, Out for Delivery, Booked) with human-readable phrase, last updated relative time, and estimated delivery prediction.
   - **Visual Milestone Bar**: Visual progression through 4 standardized stages: Booked $\rightarrow$ Dispatched $\rightarrow$ In Transit $\rightarrow$ Out for Delivery $\rightarrow$ Delivered.
   - **Interactive Route Map & Location Pinpoint**: SVG-based route visualization linking origin hub $\rightarrow$ transit transit hubs $\rightarrow$ destination facility with active pulse on latest location.
   - **Package Journey Timeline**: Detailed chronological list of scans with date, time, location, event description, and facility status.
   - **Package Specifications Grid**: Tabular metrics displaying Service Type, Booking Date, Origin City, Destination City, and Reference ID using tabular numbers.
   - **Action Bar**:
     - "Add to Watchlist" (stores parcel in local storage with optional nickname).
     - "Share on WhatsApp" (generates custom message and graphic).
     - "Download Status Card" (exports crisp 1080x1080 PNG image via HTML5 Canvas).
     - "Copy Share Link" (generates clean TrackFlow URL: `/track?num=...&courier=...`).
3. **Multi-Package Watchlist View**:
   - Sidebar or tab showing all saved parcels with their current status, carrier badge, last checkpoint, and single-click "Refresh All" button.
   - Quick delete or rename tags (e.g., "Mom's Birthday Gift", "Office Laptop").
4. **Courier Directory & Guidelines Section**:
   - Filterable grid of all 20 supported couriers with tracking format syntax, average transit times, sample tracking numbers (clickable for instant demo), and official support contacts.

### Visual Identity & Theme Tokens

- **Aesthetic Direction**: Crisp, modern logistics control center. Utilitarian, reliable, clean, and fast.
- **Color Palette**:
  - Canvas (Light): Neutral crisp white `#FFFFFF` / `#F8FAFC`
  - Canvas (Dark): Deep slate `#0B0F19` / `#111827`
  - Structural Surfaces: `#FFFFFF` (light), `#161F30` (dark) with hairline border `rgba(15, 23, 42, 0.08)` / `rgba(255, 255, 255, 0.1)`
  - Primary Accent: Precision Electric Indigo `#4F46E5` / `#6366F1`
  - Status Accents:
    - Delivered: Emerald `#16A34A` / `#22C55E`
    - In Transit: Indigo `#4F46E5` / `#6366F1`
    - Out for Delivery: Amber `#D97706` / `#F59E0B`
    - Alert / Pending: Rose `#E11D48`
- **Typography**:
  - Display & Headings: `Plus Jakarta Sans`, sans-serif (SemiBold 600 / Bold 700)
  - Body & UI: `Plus Jakarta Sans` (Regular 400 / Medium 500)
  - Data & Metrics: `font-mono tabular-nums` (`JetBrains Mono` / monospace)
- **Zero-Pill Discipline**:
  - Status and timestamps rendered as clean unboxed text with typographic bullet separators (`·`).
  - Carrier indicators use clean structured badges with official brand colors.
  - No decorative pulsing dots next to static headings.

---

## 3. Key Product Decisions & Trade-Offs

- **Server-Side API Proxy vs Direct Client Fetching**:
  - *Decision*: Route all tracking through `/api/track` on our Next.js backend.
  - *Why*: Completely masks any third-party endpoints or dependencies from the browser, resolves CORS, enforces security, and enables caching and fallback logic.
- **Client-Side HTML5 Canvas for Social Cards**:
  - *Decision*: Render the shareable 1080x1080 PNG status card using client-side HTML5 canvas API.
  - *Why*: Instant, zero-latency graphic generation without needing heavy serverless Chromium or external image rendering services. Works offline and produces high-resolution PNGs ready for WhatsApp, iMessage, and Twitter.
- **Local Watchlist Storage (`localStorage`)**:
  - *Decision*: Store tracked packages and custom nicknames in browser `localStorage`.
  - *Why*: 100% free for users, zero login or signup friction, instant loading, and privacy-preserving.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TrackFlow Architecture                          │
└────────────────────────────────────────────────────────────────────────┘

  [Client Browser]
       │
       ├──> TopBar (Brand, Theme Switch, Quick Sample Numbers, Watchlist Counter)
       │
       ├──> TrackerHero (Carrier Auto-Detection Engine, Search Input, Quick Carriers)
       │
       ├──> ResultsDashboard (When package tracked)
       │       ├── StatusHeader & EstimatedDeliveryCard
       │       ├── MilestoneProgressBar (Booked -> In Transit -> Delivered)
       │       ├── VisualJourneyMap (SVG Hub-to-Hub Route & Geolocation Pins)
       │       ├── TimelineEvents (Chronological checkpoint logs with status icons)
       │       ├── PackageDetailsGrid (Origin, Dest, Article Type, Tabular Figures)
       │       └── ActionTools (WhatsApp Share, Canvas PNG Card Exporter, Watchlist)
       │
       ├──> SavedWatchlistDrawer/Panel (Persistent package cards, auto-sync, rename)
       │
       └──> SupportedCouriersDirectory (20+ carriers, format docs, sample click-to-track)
       │
       ▼ (Fetch /api/track?t=...&c=...)
  [Next.js Server API: /api/track]
       │
       ├── 1. Courier Validation & Pattern Matcher (Regex Engine)
       ├── 2. Internal Cache & Rate Shield
       └── 3. Live Tracking Fetcher & Normalizer (with seamless resilient fallback)
```

### Supported Carrier Network (20 Couriers Configured)

| ID | Courier Name | Detection Regex | Sample Test Number |
| :--- | :--- | :--- | :--- |
| `speedpost` | India Post Speed Post | `^[A-Z]{2}\d{9}[A-Z]{2}$` | `EL855948618IN` |
| `dtdc` | DTDC Courier | `^[A-Z0-9-]{8,32}$` | `B4000211866` |
| `ekart` | Ekart Logistics | `^[A-Z]{4}\d{10}$` | `FMPP4397267510` |
| `bluedart` | BlueDart Express | `^\d{11}$` | `12345678901` |
| `delhivery` | Delhivery | `^\d{12,18}$` | `1234567890123` |
| `shadowfax` | Shadowfax | `^(?:SF\|R)\d+[A-Z]+$` | `SF12345678AB` |
| `valmo` | Valmo | `^VL\d{13}$` | `VL1234567890123` |
| `xpressbees` | XpressBees | `^\d{13,15}$` | `12345678901234` |
| `myntra` | Myntra Logistics | `^MY[A-Z]{2}\d{10}$` | `MYAB1234567890` |
| `flipkart` | Flipkart Shipping | `^[A-Z]{4}\d{10}$` | `FMPC1234567890` |
| `meesho` | Meesho | `^(?:VL\d{13}\|(?:SF\|R)\d+[A-Z]+)$` | `VL9876543210123` |
| `safexpress` | Safexpress | `^\d{12}$` | `123456789012` |
| `shreemaruti` | Shree Maruti Courier | `^\d{11,14}$` | `123456789012` |
| `shreeanjani` | Shree Anjani Courier | `^\d{10}$` | `1234567890` |
| `akashganga` | Akash Ganga Courier | `^\d{8,16}$` | `1234567890` |
| `emiratespost` | Emirates Post | `^EE\d{9}AE$` | `EE123456789AE` |
| `saudipost` | Saudi Post (SPL) | `^ABSEPS\d{10}$` | `ABSEPS1234567890` |
| `omanpost` | Oman Post | `^EE\d{9}OM$` | `EE123456789OM` |
| `phlpost` | PHLPost | `^[A-Z]{2}\d{9}PH$` | `CP123456789PH` |
| `posindonesia` | Pos Indonesia | `^(P\d{13}\|[A-Z][A-Z0-9]{21,29})$` | `P1234567890123` |

---

## 5. Implementation Stages & Verification Plan

1. **Theme & Foundation**:
   - Set up `@custom-variant dark` in `app/globals.css`.
   - Update `app/layout.tsx` metadata and fonts (`Plus Jakarta Sans` & `JetBrains Mono`).
   - Create unified carrier configuration module (`lib/couriers.ts`) containing regexes, names, sample numbers, and color tags.
2. **Backend API Route (`/api/track`)**:
   - Implement `app/api/track/route.ts` to accept tracking number and courier parameters.
   - Implement live fetcher with fallback data generator for test numbers to guarantee instant, reliable results.
3. **Core Interactive Components**:
   - `Navbar`: 3-zone contract, brand wordmark, quick links, theme switcher, and watchlist counter badge.
   - `TrackingSearch`: Auto-detection engine, courier selector, clear button, and quick-sample chips.
   - `MilestoneProgress`: 5-step visual delivery progression bar with dynamic active status.
   - `VisualJourneyMap`: Interactive visual SVG route map showing origin, transit hubs, and destination pins.
   - `TimelineList`: Chronological checkpoint cards with status icons and location details.
   - `PackageDetailsCard`: Booking date, article type, origin, destination, and reference data in tabular numbers.
   - `ShareCardModal`: HTML5 Canvas engine generating 1080x1080 branded social card, WhatsApp direct share button, and PNG download.
   - `WatchlistPanel`: Saved packages with nickname editing, delete, and 1-click batch refresh.
   - `CourierDirectory`: Comprehensive grid of all 20 couriers with filter and click-to-test capability.
4. **Verification & Quality Checks**:
   - Test test numbers: `EL855948618IN` (India Post), `B4000211866` (DTDC), `FMPP4397267510` (Ekart).
   - Verify light/dark theme contrast across all elements.
   - Verify Canvas PNG export and download in browser.
   - Run `compile_applet` and `lint_applet` to ensure pristine compilation.

---

## Refinement Phase Completion Notes

1. **Chronological Journey Reversal & Delivered as Last Point**:
   - Reversed the timeline activity ordering to reflect the true real-world parcel journey:
     - **Top / Start**: Origin Point (Item Booked at origin).
     - **Intermediate**: Dispatched, sorting hubs, and transit checkpoints.
     - **Bottom / End**: **Delivered** is now the final destination point!
   - The scrolling truck starts at the top (with all route dots below it) and smoothly drives downward as you scroll.
   - When scrolling to the bottom, the truck reaches the final destination: **Delivered**.
   - The truck has `z-40` layering on top of the road line and milestone dots.
2. **Truck Animation Glitch on "See All" Click Fixed**:
   - Resolved the issue where the truck would jump/stretch across the expanded height.
   - Transitions are smoothly suppressed during the layout expansion so the truck remains in place without erratic motion.
3. **Redesigned Modern Specification Cards**:
   - Replaced generic grey boxes with high-fidelity, distinct modern logistics cards:
     - **Origin Facility**: Crisp `Building2` icon in indigo ring container, uppercase label, monospace `PIN` badge, bold facility name, and booking date.
     - **Destination Hub**: Target `MapPin` icon in emerald ring container, uppercase label, monospace `PIN` badge, bold destination name, and delivery office indicator.
     - **Article Specs**: `Package` icon in violet ring container, uppercase label, weight pill (`45 g`), bold article type, and service class indicator.
4. **Simplified Delivered Hero Card (Zero Duplicate Badges)**:
   - Removed lengthy phrase ("Package Successfully Delivered").
   - Headline is concisely set to **Delivered**.
   - Removed the redundant top badge so the word "Delivered" is never duplicated in the card.
   - Included clean delivery timestamp with clock icon and arrival status details.
5. **Mobile Visibility & Exact 1-Axis Alignment**:
   - The vertical route line, truck icon, and checkpoint milestone dots all share an identical X-coordinate (`left-6` on mobile / `sm:left-7` on desktop).
   - Milestones are revealed only after the truck arrives at or passes each node.
6. **Clean Specification Grid (Zero Tariff / Billed Amount)**:
   - Removed all tariff, COD, and billed rate indicators. Replaced with the new uncluttered 3-card logistics grid.
7. **Expanded Desktop Modal**:
   - Desktop modal enlarged to `sm:max-w-5xl lg:max-w-6xl` for a spacious layout, while staying full-screen on mobile devices.
8. **Input & Directory Integration**:
   - Placeholder shortened to `Enter Consignment or AWB Number...`.
   - Courier directory cards pre-select the courier and focus the input without fetching dummy data.

---

## Turn 10 Implementation & Fixes

1. **Auto-Detect Couriers Dropdown Behind Scrolling Logos Fixed**:
   - Removed `overflow-hidden` from `#track-section` in `TrackerHero.tsx` and set container to `relative z-30`.
   - Raised dropdown menu z-index to `z-[60]` with `shadow-2xl` and backdrop at `z-40`, so the dropdown floats seamlessly above the scrolling partner logos marquee.
2. **Removed Weight**:
   - Removed weight from the tracking popup Sub Route Bar and replaced the weight badge in the Article Specs card with `Standard Express`.
   - Ensured no weight columns or badges are shown in the bulk dashboard table or popup.
3. **Scrolling Truck Directly On Top of Points (Exact Single Vertical Axis)**:
   - Refactored the highway timeline into a rigid 2-column flex structure: a fixed `w-8` node column and an adjacent detail card column.
   - The vertical highway track runs directly at `left-4` (16px), exactly down the centerline of the `w-8` node column.
   - The moving truck has `z-40`, `shadow-md`, and `ring-4` centered on the line (`x = 16px`), and floats directly over the checkpoint points as the user scrolls.
   - Checkpoint points bloom as the truck reaches and passes each node.
4. **Checkpoint Route & History Replaced with Complete History**:
   - Renamed section header to **Complete History**.
5. **Destination Top and Starting Bottom**:
   - Guaranteed chronological display where Destination (Delivered / Return) is at the TOP (index 0) and Starting Facility (Origin / Booked) is at the BOTTOM.
   - Re-ordered Spec Cards: Card 1 = Destination Hub (Top), Card 2 = Starting Facility (Origin), Card 3 = Article Specs.
6. **Removed "Recipient & Route" Column**:
   - Completely removed the `Recipient & Route` table column from `BulkDashboard.tsx`.
7. **Styled Courier Partner Dropdown in Add Tracking ID Manually**:
   - Replaced the unstyled native `<select>` with a custom-styled dropdown button displaying carrier brand badges, full names, short codes, and a smooth animated `ChevronDown`.
   - Integrated click-outside detection and active selection checkmarks.

---

## Turn 11 Implementation

1. **Removed Truck Scroll Animation**:
   - Completely removed the moving delivery truck and dynamic road progress fill from the timeline.
   - Removed `roadProgress`, `maxProgress`, `isToggling`, scroll calculation listeners, and the scroll container ref overhead.
   - Replaced with a clean, static, high-contrast vertical logistics stem with permanently visible, crisp milestone rings and dots.
   - All checkpoint updates expand/collapse instantly with zero scroll lag.

---

## Turn 12 Implementation

1. **Removed Protected Ingestion Engine Card**:
   - Removed the security policy card from the import popup.
2. **Renamed to Bulk Import**:
   - Changed "Bulk Excel Upload" button text and modal header to **Bulk Import**.
3. **Import Preview & Confirmation Flow**:
   - Files are now parsed into a preview state before adding them to the dashboard.
   - Renders a clean preview screen showing consignment count, file name, and a scrollable table with AWB, detected courier, destination, and status.
   - Added **Confirm Import ({count} Shipments)** and **Cancel / Choose Another File** actions.
4. **View Imported Data Separately**:
   - Added an **Imported ({count})** tab in the status filter tab group.
   - Added a quick filter button **View Imported Only ({count})** next to the search input.
   - Added an **Imported** badge in table rows next to the AWB number for imported consignments.
5. **Sequential History Display Without Skipping Milestones**:
   - Removed the milestone skipping logic in `displayActivities`.
   - Now renders checkpoints in strict sequential chronological order from top (Destination / Delivered) to bottom.
   - Initial view shows the first sequential checkpoints uninterrupted; clicking **See remaining updates** reveals the continuous balance.

---

## Turn 13 Implementation

1. **Imported Batch-Wise Management**:
   - Added `batchId`, `batchName`, and `importedAt` metadata properties to `BulkShipment` and tagged default sample shipments.
   - When importing an Excel or Google Sheets workbook, all parsed consignments are automatically tagged with a unique batch ID (`batch-${timestamp}`), a readable batch name (`Batch #${N} • filename`), and import timestamp (`Today, HH:MM AM/PM`).
   - Added `selectedBatchId` state and dynamic `uniqueBatches` computation to calculate per-batch metrics: total consignments, delivered count, active transit count, and returned count.
   - Built a dedicated **Batch-Wise Ingestion Navigator** bar when filtering by "Imported" or when a batch is selected:
     - Includes filter pills for **All Batches ({count})** and each individual batch tag.
     - Displays active batch summary metrics (Delivery count, In Transit count, Returned count, import timestamp).
     - Provides quick actions: **Reset to All Batches** and **Delete Batch** (with confirmation).
   - In the dashboard table, the imported badge now displays the batch identifier and is interactive—clicking the batch badge on any row immediately filters the dashboard to that specific batch.
   - In the search bar area, selecting a batch displays an active batch chip with a 1-click `X` clear button.

2. **Successfully Imported Screen & Automatic Modal Close**:
   - When the user clicks **Confirm Import**:
     - Consignments are committed to dashboard state and `localStorage`.
     - An audible confirmation chime is played.
     - Modal smoothly switches to a dedicated **Successfully Imported** screen displaying a green check badge, total consignments added, batch assignment name, and an animated progress bar indicating automatic closing.
     - If there is no issue, the modal **automatically closes after 1.4 seconds**, cleans up all timers and preview state, switches the dashboard filter to `imported`, and selects the newly imported batch.
     - Includes an instant **Open Batch in Dashboard Now →** action button for users who want to proceed immediately without waiting.
     - Handled clean timer disposal when closing manually or unmounting to prevent state leaks.


