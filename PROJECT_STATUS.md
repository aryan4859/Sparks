# Sparks — project status

A minimal, editorial guide to cafés, restaurants, shops and hidden gems across Nepal, with a personal journal and an admin dashboard. Design inspired by citylife.global; intro animation adapted from the anime.js logo intro.

_Last updated: 16 October 2026_

---

## 1. Where things stand

- The **site and admin are built** and tested on desktop and mobile, in light and dark mode.
- **8,996 real cafés and restaurants** from across Nepal are in the database as **hidden drafts** (imported from OpenStreetMap).
- **Nothing is published yet**, so the public site is empty until you publish your first places.
- **No place has a photo yet.** See [section 5](#5-photos--the-open-question) for the options.
- The site is **not deployed** and the project is **not in git** yet.

---

## 2. Stack (all free tiers)

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript | Server-rendered pages, good for SEO |
| Styling | Tailwind CSS v4 | Colours are CSS variables → light and dark themes |
| Database, auth, photos | Supabase (Postgres + Auth + Storage) | Free: 500 MB DB, 1 GB storage. **Pauses after 7 days with no traffic** |
| Place data | OpenStreetMap (via the Overpass API) | Free, ODbL licence; credit shown in the footer |
| Maps | Leaflet + OpenStreetMap tiles | No API key. Directions open in Google Maps via a link |
| Animation | anime.js v4 | Intro preloader only |
| Hosting (planned) | Vercel Hobby or Cloudflare Pages | Vercel Hobby is non-commercial only |

---

## 3. What's done

### Public site
- [x] **Home page**: hero, featured place, neighbourhood links, handpicked spots, "new this week", one section per category, latest journal posts
- [x] **Café / Restaurant / Shop pages**: search plus filters (type, area, budget, ambience, vegetarian), results grid next to a map
- [x] **Explore map** (`/explore`): every published place on one map; pins open a popup with a Google Maps directions link
- [x] **Place pages**: photo gallery, review ("Our take"), signature drinks/dishes with prices, menu with veg markers, map, hours, address, directions/website/Instagram buttons, nearby places with distances
- [x] **Journal**: list page and post pages; posts can embed place cards and photos
- [x] **Intro preloader**: big "sparks" letters draw → fill → outline → erase; the icon and wordmark assemble and fly into the navbar. Plays once per browser session, skipped for reduced-motion users and on `/admin`, with a 10-second failsafe. Lands pixel-exact on desktop and mobile
- [x] **Dark mode**: follows the device setting by default; header toggle that remembers the choice; no flash on load
- [x] **Monochrome design**: black, white and greys only (photos stay in colour)
- [x] **Mobile**: full-screen menu, two-column cards, swipeable photo gallery, address + directions bar on place pages; intro scaled and centred. Tested at 390 px with no sideways overflow
- [x] **OpenStreetMap credit** in the footer (required by its licence)

### Admin dashboard (`/admin`)
- [x] Email + password login (Supabase Auth); only accounts in the `admins` table can get in
- [x] **Built for thousands of places**: search by name, filters (published/drafts, category, city), 50 per page; saving returns you to the same filtered page
- [x] Places: create/edit/delete, drafts, "featured" flag, cover + gallery upload (shrunk to WebP in the browser), reorder photos, paste a Google Maps link to fill coordinates, signature items, menu editor
- [x] **Drafts can be saved without a photo**; a cover photo is only required to publish
- [x] **A draft's URL (slug) can be edited until it's published**, then it's locked so links don't break
- [x] Journal: create/edit/delete, cover photo, body editor with buttons to insert a heading, a photo or a place card
- [x] Saving refreshes the public site immediately
- [x] Security: row-level security in Postgres, so only admins can write, even with the public key; server actions also re-check admin status

### Data
- [x] **Sample content removed**: the 12 fictional places and 3 sample stories are deleted from the database, and the sample files and placeholder photos (picsum.photos) are deleted from the code
- [x] **8,996 real places imported as hidden drafts** (`npm run import-osm`):

  | | |
  |---|---|
  | Cafés / restaurants | 1,872 / 7,124 |
  | Name + exact location | all |
  | Neighbourhood / city | 95% / 100% (looked up from OpenStreetMap place names) |
  | Opening hours | 795 |
  | Website or social link | 240 |
  | Photos, menus, prices, reviews | none, added by you when publishing |
  | Top cities | Kathmandu 1,476 · Pokhara 1,131 · Lalitpur 1,087 · Tokha 651 · Siddharthanagar 360 · Kirtipur 247 |

  Re-running the import only adds places that are new on OpenStreetMap; it never duplicates or overwrites your edits.

### Scripts
| Command | What it does |
|---|---|
| `npm run dev` | Run the site at http://localhost:3000 |
| `npm run create-admin -- email "password"` | Create an admin, or reset an admin's password |
| `npm run import-osm -- --dry-run` | Preview what the OpenStreetMap import would add |
| `npm run import-osm` | Add new OpenStreetMap places as hidden drafts |

---

## 4. Running it

`.env` needs:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...          # scripts only — never NEXT_PUBLIC_, never commit, not needed on hosting
```

Database: run `supabase/schema.sql` in the Supabase SQL Editor (safe to re-run).

Admin: http://localhost:3000/admin/login (one admin account exists; add more with `npm run create-admin`)

> **Known dev quirk:** the dev server sometimes doesn't pick up edits to `src/app/globals.css`. If a style change doesn't appear, stop and rerun `npm run dev`.

### Publishing a place (the curating workflow)
1. `/admin` → **Drafts** + a city → **Filter** (or search a name)
2. Open the place; add a cover photo (+ gallery), tagline, "Our take", budget, ambience, signature items / menu
3. Fix the URL if it's an id like `restaurant-n12345` (places with Nepali-script names)
4. Tick **Published** → save. It's live immediately

### Where things live

| What | File |
|---|---|
| Colours, light/dark themes | `src/app/globals.css` |
| Site name, price labels, helpers | `src/lib/site.ts` |
| Public database reads | `src/lib/queries.ts` |
| Admin save/delete logic | `src/app/admin/actions.ts` |
| Admin list (search, filters, pages) | `src/app/admin/(dashboard)/page.tsx` |
| Logo | `src/components/SparksLogo.tsx` |
| Intro animation | `src/components/preloader/` |
| Database schema | `supabase/schema.sql` |
| OpenStreetMap import | `scripts/import-osm.mjs` |
| Admin account script | `scripts/create-admin.mjs` |

---

## 5. Photos — the open question

The imported places have **no photos**: OpenStreetMap has almost none (7 of 9,883). Photos from Google Search, Google Maps, Instagram or the places' websites **can't be copied**. They belong to the photographers (often the cafés and their customers), and re-publishing them risks takedown notices and breaks Google's terms. Publishing currently requires a cover photo.

Options, best first. **Not decided yet; parked for now.**

| Option | Cost | Notes |
|---|---|---|
| Your own photos when you visit | Free | Best quality, and what makes the guide feel handpicked |
| Ask the places (Instagram DM) for 2–3 photos with credit | Free | Most small cafés say yes to free promotion |
| **Google Places API** (official) | Needs a Google Cloud billing account; monthly free allowance, then pay per photo view | Photos load live from Google with photographer credit (they can't be stored). Would add a "Find on Google" button in the admin and only load photos for published places. Setup: enable **Places API (New)**, add `GOOGLE_MAPS_API_KEY` to `.env` |
| Wikimedia Commons "free photos nearby" finder in the admin | Free | Openly licensed, credit added automatically. Good for landmarks, often empty for small cafés |
| Publish without a photo, using a typographic cover (name on grey) | Free | Lets places go live now and look intentional; add photos later |

---

## 6. Before launch — must do

- [ ] **Publish real places.** Curate drafts (section 4); aim for 10–20 well-photographed places first
- [ ] **Decide on photos** (section 5)
- [ ] **Set up git** and push to GitHub. There's no history or backup yet
- [ ] **Deploy** to Vercel or Cloudflare Pages with the two `NEXT_PUBLIC_` env vars. Don't add `SUPABASE_SECRET_KEY` to hosting
- [ ] **Run a production build** (`npm run build`) against the real database
- [ ] **Map tiles.** OpenStreetMap's free tiles aren't meant for heavy traffic; move to a free-tier provider (MapTiler or Stadia, free key)
- [ ] **Domain.** `.com.np` is free for Nepali citizens (register.com.np)
- [ ] **Keep Supabase awake.** Free projects pause after 7 days without traffic; real visitors prevent it, or add a free weekly ping (GitHub Action / cron-job.org)
- [ ] **Vercel Hobby is non-commercial.** If you add ads, sponsored listings or affiliate links, use Cloudflare Pages or upgrade

---

## 7. Things to improve

### Data quality (imported places)
- [ ] Some OpenStreetMap details are outdated or odd (e.g. hours "09:00-09:00"); check them when you visit
- [ ] Some places will have closed. Delete them as you find them
- [ ] Opening hours are raw OpenStreetMap text (e.g. `Mo-Su 10:00-21:30`); show them in friendlier form
- [ ] Some city labels come from the nearest town (e.g. "Tokha" for places just north of Kathmandu). Fine for filtering; adjust per place if needed
- [ ] The admin city filter lists the most common cities from a sample of rows; make it exact with a small database function

### Content & SEO
- [ ] `sitemap.xml` and `robots.txt` so Google finds every published place and post
- [ ] Structured data (JSON-LD `Restaurant` / `CafeOrCoffeeShop` / `Store`) for rich results
- [ ] Social share images per place and post
- [ ] A styled 404 page (currently the Next.js default), plus loading and error states
- [ ] Image alt text editable in the admin
- [ ] "Prices last checked" should show a real date per listing

### Search & filters
- [ ] Public search matches simple word fragments; switch to Postgres full-text search with typo tolerance and romanised spellings ("momo", "mo:mo") as the published list grows
- [ ] Allow several choices per filter row (e.g. Patan **and** Jhamsikhel)
- [ ] Sort options: newest, nearest, budget

### Admin
- [ ] Deleting or replacing a photo doesn't remove the old file from storage, so unused files pile up toward the 1 GB limit
- [ ] Bulk actions: delete or hide many drafts at once (e.g. all closed places in an area)
- [ ] Preview a story before publishing; autosave drafts
- [ ] Journal formatting is minimal (headings, photos, place cards); add bold, italic and links
- [ ] Scheduled publishing

### Intro & UX
- [ ] The intro takes about 6.5 s. Consider a "Skip" button or a shorter version
- [ ] Map pin clustering for when many places are published close together
- [ ] The newsletter form in the footer doesn't do anything yet

### Code quality
- [ ] No automated tests. Add a few end-to-end checks (Playwright): home loads, filters work, admin login, intro lands in the nav
- [ ] Cosmetic: two accent-stripping regexes (`src/components/admin/ui.tsx`, `scripts/import-osm.mjs`) contain literal characters instead of `\u` escapes (they work fine)

---

## 8. Feature ideas

### Quick wins
1. **"Open now" filter**, using the opening hours already imported for 795 places
2. **"Near me"**: sort by distance from the phone's location (the distance code exists for "Nearby")
3. **More attributes:** wifi, power outlets, laptop-friendly, vegan, gluten-free, parking, pet-friendly, wheelchair access
4. **Curated lists:** "Best momo in Patan", "Rainy-day cafés", "Date night"
5. **Newsletter:** connect the footer form to Buttondown, Resend or Brevo (free tiers)
6. **Share buttons:** WhatsApp, Viber, Instagram story card

### Bigger features
7. **Visitor accounts:** favourites and personal lists
8. **Visitor reviews & ratings**, with admin moderation
9. **"Suggest a place" form**: submissions arrive as drafts
10. **Neighbourhood guides**: a page per area with map, intro and places
11. **Nepali language** toggle
12. **Events**: pop-ups, live music, new menus
13. **PWA**: add to home screen, offline saved places

### For you as the admin
14. **Analytics** (Cloudflare Web Analytics or Umami, free)
15. **CSV import** for places
16. **Photo helpers** (see section 5)
17. **Monetisation (later)**: featured listings, affiliate links. Needs commercial hosting

---

## 9. Suggested next steps

1. Sign in, filter **Drafts → Kathmandu** (or your area), and publish 5–10 places you know well, with your own photos
2. Decide on the photo approach (section 5)
3. Set up git and push to GitHub
4. Deploy to Vercel or Cloudflare on a free subdomain and try it on your phone
5. SEO basics (sitemap + structured data), then "Open now" and "Near me"
