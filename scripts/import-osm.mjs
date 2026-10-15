// Import Nepal's cafés and restaurants from OpenStreetMap as HIDDEN DRAFTS.
//
//   npm run import-osm -- --dry-run     # download + preview, write nothing
//   npm run import-osm                  # insert new places as drafts
//
// Data © OpenStreetMap contributors, licensed under the ODbL
// (https://www.openstreetmap.org/copyright) — credit is shown in the site footer.
//
// Only facts OSM has are imported: name, location, cuisine, hours, website,
// vegetarian tags. No photos, reviews, menus or prices — those come from you,
// in the admin, when you visit and publish a place.
//
// Safe to re-run: places are matched by their OSM id, so existing ones (and
// your edits to them) are never duplicated or overwritten.

import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");
const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const AREA = `area["ISO3166-1"="NP"][admin_level=2]->.np;`;
// Two lighter requests: public servers time out on one big combined query.
const VENUES_QUERY = `[out:json][timeout:240];${AREA}(nwr["amenity"="cafe"](area.np); nwr["amenity"="restaurant"](area.np););out center tags;`;
const PLACES_QUERY = `[out:json][timeout:240];${AREA}node["place"~"^(city|town|suburb|quarter|neighbourhood|village)$"](area.np);out body;`;

// ─── Download ────────────────────────────────────────────────────────────
async function download(label, query) {
  for (const url of [...MIRRORS, ...MIRRORS]) {
    try {
      process.stdout.write(`Downloading ${label} from ${new URL(url).host}… `);
      const res = await fetch(url, {
        method: "POST",
        headers: { "User-Agent": "Sparks-guide-importer/1.0", "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(300_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      console.log(`${json.elements.length.toLocaleString()} elements`);
      return json.elements;
    } catch (e) {
      console.log(`failed (${e.message})`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  throw new Error("All Overpass mirrors failed — try again in a few minutes.");
}

// ─── Helpers ─────────────────────────────────────────────────────────────
const CUISINE = {
  regional: "Nepali", local: "Nepali", nepali: "Nepali", nepalese: "Nepali", newari: "Newari", newar: "Newari",
  thakali: "Thakali", tibetan: "Tibetan", indian: "Indian", chinese: "Chinese", asian: "Asian", korean: "Korean",
  japanese: "Japanese", thai: "Thai", italian: "Italian", pizza: "Pizza", burger: "Burgers", chicken: "Chicken",
  coffee_shop: "Coffee", coffee: "Coffee", tea: "Tea house", breakfast: "Breakfast", international: "International",
  western: "Western", momo: "Momo", cake: "Bakery", bakery: "Bakery", ice_cream: "Ice cream", vegetarian: "Vegetarian",
  vegan: "Vegan", barbecue: "Barbecue", bbq: "Barbecue", steak_house: "Steakhouse", sushi: "Sushi", mexican: "Mexican",
  american: "American", seafood: "Seafood", fish: "Seafood", noodle: "Noodles", sandwich: "Sandwiches", juice: "Juice bar",
};
const titleCase = (s) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function typeFor(tags) {
  const first = (tags.cuisine ?? "").split(";").map((s) => s.trim().toLowerCase()).find(Boolean);
  if (first) return CUISINE[first] ?? titleCase(first);
  return tags.amenity === "cafe" ? "Café" : "Restaurant";
}

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

function socialUrl(v, base) {
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `${base}/${v.replace(/^@/, "").replace(/^\/+/, "")}`;
}

function httpUrl(v) {
  if (!v) return null;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

// Nearest named place of the given kinds, within maxKm, via a 0.1° grid.
function buildLocator(placeNodes) {
  const grid = new Map();
  const key = (lat, lng) => `${Math.floor(lat * 10)}:${Math.floor(lng * 10)}`;
  for (const p of placeNodes) {
    const k = key(p.lat, p.lng);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(p);
  }
  const km = (a, b) => {
    const r = (d) => (d * Math.PI) / 180;
    const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  };
  return (pt, kinds, maxKm) => {
    const span = Math.ceil(maxKm / 11) + 1; // 0.1° ≈ 11 km
    let best = null;
    let bestKm = maxKm;
    const cy = Math.floor(pt.lat * 10);
    const cx = Math.floor(pt.lng * 10);
    for (let dy = -span; dy <= span; dy++)
      for (let dx = -span; dx <= span; dx++)
        for (const p of grid.get(`${cy + dy}:${cx + dx}`) ?? []) {
          if (!kinds.includes(p.kind)) continue;
          const d = km(pt, p);
          if (d < bestKm) [best, bestKm] = [p, d];
        }
    return best ? { name: best.name, km: bestKm } : null;
  };
}

// ─── Main ────────────────────────────────────────────────────────────────
const elements = [...(await download("cafés & restaurants", VENUES_QUERY)), ...(await download("place names", PLACES_QUERY))];

const placeNodes = elements
  .filter((e) => e.tags?.place && (e.tags["name:en"] || e.tags.name))
  .map((e) => ({ lat: e.lat, lng: e.lon, kind: e.tags.place, name: e.tags["name:en"] || e.tags.name }));
const locate = buildLocator(placeNodes);
const nearest = (pt, kinds, maxKm) => locate(pt, kinds, maxKm)?.name ?? null;

// City: prefer a real city (Kathmandu, Lalitpur, Pokhara…) unless a town is
// clearly closer — otherwise suburbs of Kathmandu get labelled "Tokha" etc.
function cityFor(pt) {
  const city = locate(pt, ["city"], 8);
  const town = locate(pt, ["town"], 15);
  if (city && (!town || town.km >= city.km / 2)) return city.name;
  if (town) return town.name;
  return nearest(pt, ["city", "town", "village"], 25);
}

const venues = elements.filter((e) => e.tags?.amenity && (e.tags["name:en"] || e.tags.name));
console.log(`${venues.length.toLocaleString()} named cafés/restaurants · ${placeNodes.length.toLocaleString()} place names for neighbourhoods`);

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
if (!process.env.SUPABASE_SECRET_KEY) throw new Error("SUPABASE_SECRET_KEY is missing from .env");

// Existing slugs / OSM ids, so we never collide with places you've created.
const takenSlugs = new Set();
const knownOsm = new Set();
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase.from("places").select("slug, osm_id").range(from, from + 999);
  if (error) {
    if (error.message.includes("osm_id")) {
      const msg = "The osm_id column is missing — re-run supabase/schema.sql in the Supabase SQL Editor first.";
      if (!DRY_RUN) throw new Error(msg);
      console.warn(`⚠ ${msg} (continuing: dry run)`);
      break;
    }
    throw error;
  }
  for (const r of data) {
    takenSlugs.add(r.slug);
    if (r.osm_id) knownOsm.add(r.osm_id);
  }
  if (data.length < 1000) break;
}

const today = new Date().toISOString().slice(0, 10);
const rows = [];
for (const e of venues) {
  const osmId = `${e.type}/${e.id}`;
  if (knownOsm.has(osmId)) continue;
  const t = e.tags;
  const lat = e.lat ?? e.center?.lat;
  const lng = e.lon ?? e.center?.lon;
  if (lat == null || lng == null) continue;

  const name = (t["name:en"] || t.name).trim();
  const pt = { lat, lng };
  const neighborhood =
    t["addr:suburb"] || t["addr:quarter"] || t["addr:neighbourhood"] || nearest(pt, ["suburb", "quarter", "neighbourhood"], 2) || nearest(pt, ["village", "town"], 4) || "";
  const city = t["addr:city"] || cityFor(pt) || t["addr:district"] || "";
  const street = [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ") || t["addr:place"] || "";
  const address = [street, neighborhood, city].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ");

  const category = t.amenity === "cafe" ? "cafe" : "restaurant";
  let slug = slugify(name) || `${category}-${e.type[0]}${e.id}`; // non-Latin names get an id slug (editable while a draft)
  if (takenSlugs.has(slug)) slug = slugify(`${slug}-${neighborhood || city}`) || slug;
  for (let n = 2; takenSlugs.has(slug); n++) slug = `${slug.replace(/-\d+$/, "")}-${n}`;
  takenSlugs.add(slug);

  const veg = t["diet:vegetarian"] || t["diet:vegan"];
  rows.push({
    slug,
    osm_id: osmId,
    name,
    category,
    type: typeFor(t),
    neighborhood,
    city,
    budget: 2,
    ambience: [],
    tagline: "",
    review: "",
    cover: "",
    gallery: [],
    lat,
    lng,
    address: address || null,
    hours: t.opening_hours || null,
    instagram: socialUrl(t["contact:instagram"], "https://instagram.com"),
    website: httpUrl(t.website || t["contact:website"] || t.url) || socialUrl(t["contact:facebook"], "https://facebook.com"),
    online: false,
    vegetarian: veg === "only" ? "pure-veg" : veg === "yes" ? "veg-friendly" : null,
    signature: [],
    menu: [],
    featured: false,
    published: false, // hidden until you add photos + your review and publish
    added_at: today,
  });
}

const count = (f) => rows.filter(f).length;
console.log(`\nNew drafts to add: ${rows.length.toLocaleString()} (${knownOsm.size.toLocaleString()} already imported)`);
console.log(`  cafés ${count((r) => r.category === "cafe")} · restaurants ${count((r) => r.category === "restaurant")}`);
console.log(`  with hours ${count((r) => r.hours)} · website/social ${count((r) => r.website || r.instagram)} · neighbourhood ${count((r) => r.neighborhood)} · city ${count((r) => r.city)}`);
const byCity = {};
for (const r of rows) byCity[r.city || "(unknown)"] = (byCity[r.city || "(unknown)"] ?? 0) + 1;
console.log(`  top cities: ${Object.entries(byCity).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${v}`).join(", ")}`);
console.log("  examples:");
for (const r of rows.filter((r) => r.hours && r.neighborhood).slice(0, 3))
  console.log(`    ${r.name} — ${r.type}, ${r.neighborhood}, ${r.city} · ${r.hours} · /places/${r.slug}`);

if (DRY_RUN) {
  console.log("\nDry run — nothing written. Run without --dry-run to import.");
  process.exit(0);
}

let written = 0;
for (let i = 0; i < rows.length; i += 500) {
  const batch = rows.slice(i, i + 500);
  const { error } = await supabase.from("places").upsert(batch, { onConflict: "osm_id", ignoreDuplicates: true });
  if (error) throw new Error(`Batch ${i / 500 + 1} failed: ${error.message}`);
  written += batch.length;
  process.stdout.write(`\rImported ${written.toLocaleString()} / ${rows.length.toLocaleString()}`);
}
console.log(`\n✔ Done. ${written.toLocaleString()} hidden drafts added — curate them at /admin (filter: Drafts).`);
