const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";
const API_ORIGIN = API_BASE.replace(/\/api\/v\d+(?:\/.*)?$/i, "");

function normalizePhotoPath(file) {
  const value = String(file || "").trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) {
    return `${API_BASE}/products/photo-proxy?url=${encodeURIComponent(value)}`;
  }
  if (value.startsWith("/uploads/")) return `${API_ORIGIN}${value}`;
  if (value.startsWith("uploads/")) return `${API_ORIGIN}/${value}`;
  if (value.startsWith("/images/")) return value;
  return null;
}

function brandSlug(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function brandSlugOriginalCase(value) {
  return String(value || "")
    .trim()
    .replace(/ё/g, "е")
    .replace(/Ё/g, "Е")
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function brandFileCandidates(value) {
  const raw = String(value || "").trim();
  if (!raw) return [];

  return Array.from(
    new Set([
      raw,
      raw.toLocaleLowerCase("ru-RU"),
      raw.replace(/\s+/g, ""),
      raw.toLocaleLowerCase("ru-RU").replace(/\s+/g, ""),
      brandSlug(raw),
      brandSlugOriginalCase(raw)
    ].filter(Boolean))
  );
}

export function formatSupplierName(supplier) {
  if (!supplier) return "";
  const name = [supplier.first_name, supplier.last_name].filter(Boolean).join(" ").trim();
  return name || `Поставщик #${supplier.id_s}`;
}

export function getProductImage(product, index = 0) {
  return getProductImages(product)[index] || null;
}

export function getProductImages(product) {
  const seen = new Set();
  return (product?.photos || [])
    .map((photo) => normalizePhotoPath(photo?.file))
    .filter((src) => {
      if (!src || seen.has(src)) return false;
      seen.add(src);
      return true;
    });
}

export function getMinPrice(product) {
  const prices = (product?.variants || [])
    .map((variant) => Number(variant.price))
    .filter((value) => Number.isFinite(value) && value > 1);
  if (!prices.length) return null;
  return Math.min(...prices);
}

export function formatPrice(value) {
  if (value == null) return "Цена по запросу";
  return `${Number(value).toLocaleString("ru-RU")} руб.`;
}

const COUNTRY_FLAGS = [
  { match: ["чеш", "czech", "чехия"], flag: "🇨🇿" },
  { match: ["герман", "germany", "немец"], flag: "🇩🇪" },
  { match: ["итал", "italy"], flag: "🇮🇹" },
  { match: ["росси", "russia"], flag: "🇷🇺" },
  { match: ["китай", "china"], flag: "🇨🇳" },
  { match: ["польш", "poland"], flag: "🇵🇱" },
  { match: ["испан", "spain"], flag: "🇪🇸" },
  { match: ["франц", "france"], flag: "🇫🇷" },
  { match: ["турц", "turkey"], flag: "🇹🇷" },
  { match: ["португал", "portugal"], flag: "🇵🇹" },
  { match: ["нидерланд", "holland", "netherlands"], flag: "🇳🇱" },
  { match: ["бельг", "belgium"], flag: "🇧🇪" },
  { match: ["дания", "датск", "denmark"], flag: "🇩🇰" },
  { match: ["швейцар", "switzerland"], flag: "🇨🇭" },
  { match: ["сша", "usa", "united states"], flag: "🇺🇸" }
];

export function getCountryFlag(country) {
  if (!country) return "";
  const normalized = country.toLowerCase();
  const item = COUNTRY_FLAGS.find(({ match }) =>
    match.some((entry) => normalized.includes(entry))
  );
  return item?.flag || "";
}

export function uniqueCategories(products) {
  return Array.from(new Set(products.map((item) => item.category).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "ru")
  );
}

export function uniqueBrands(products) {
  return Array.from(new Set(products.map((item) => item.brand).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "ru")
  );
}

export function getBrandLogoSources(brand) {
  return brandFileCandidates(brand).flatMap((candidate) => {
    const fileName = encodeURIComponent(candidate);
    return ["svg", "png", "webp", "jpg", "jpeg"].flatMap((extension) => [
      `${API_ORIGIN}/brand-logos/${fileName}.${extension}`,
      `/images/brands/${fileName}.${extension}`
    ]);
  });
}
