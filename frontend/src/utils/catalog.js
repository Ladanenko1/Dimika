import { getMinPrice } from "./product";
import { HOME_CATEGORIES } from "../constants/site";

export const DEFAULT_FILTERS = {
  sectionSearch: "",
  brandSearch: "",
  materialSearch: "",
  colorGroups: [],
  categoryGroups: [],
  materialGroups: [],
  categories: [],
  brands: [],
  colors: [],
  materials: [],
  priceMin: "",
  priceMax: "",
  widthMin: "",
  widthMax: "",
  lengthMin: "",
  lengthMax: "",
  heightMin: "",
  heightMax: "",
  query: ""
};

export const MAIN_CATEGORY_NAMES = HOME_CATEGORIES.map((item) => item.slug);

const DEFAULT_MAIN_CATEGORY = "Аксессуары";

const KNOWN_OPTION_TOKENS = new Map([
  ["abs", "ABS"],
  ["влдсп", "ВЛДСП"],
  ["лдсп", "ЛДСП"],
  ["дсп", "ДСП"],
  ["мдф", "МДФ"],
  ["пвх", "ПВХ"],
  ["staron", "Staron"],
  ["stonex", "Stonex"]
]);

const DEFAULT_MAIN_COLOR = "Другое";

const MAIN_COLOR_RULES = [
  { name: "Хром", keywords: ["хром", "chrome"] },
  { name: "Белый", keywords: ["бел", "white"] },
  { name: "Черный", keywords: ["черн", "black"] },
  { name: "Антрацит", keywords: ["антрацит"] },
  { name: "Графит", keywords: ["графит"] },
  { name: "Золото", keywords: ["золот", "gold"] },
  { name: "Бронза", keywords: ["бронз", "bronze"] },
  { name: "Латунь", keywords: ["латун", "brass"] },
  { name: "Серый", keywords: ["сер", "grey", "gray"] },
  { name: "Бежевый", keywords: ["беж"] },
  { name: "Коричневый", keywords: ["корич", "brown"] },
  { name: "Синий", keywords: ["син", "blue"] },
  { name: "Зеленый", keywords: ["зелен", "green"] },
  { name: "Красный", keywords: ["красн", "red"] },
  { name: "Розовый", keywords: ["роз", "pink"] }
];

const DEFAULT_MAIN_MATERIAL = "Другое";

const MAIN_MATERIAL_RULES = [
  { name: "Нержавеющая сталь", keywords: ["нержав"] },
  { name: "Литьевой мрамор", keywords: ["литьевой мрамор", "литой мрамор"] },
  { name: "Акрил", keywords: ["акрил"] },
  { name: "Алюминий", keywords: ["алюмин"] },
  { name: "ВЛДСП", keywords: ["влдсп"] },
  { name: "ЛДСП", keywords: ["лдсп"] },
  { name: "ДСП", keywords: ["дсп"] },
  { name: "МДФ", keywords: ["мдф"] },
  { name: "Сталь", keywords: ["сталь"] },
  { name: "Латунь", keywords: ["латун"] },
  { name: "Пластик", keywords: ["пластик", "abs", "пвх"] },
  { name: "Полипропилен", keywords: ["полипропилен"] },
  { name: "Фарфор", keywords: ["фарфор", "санфарфор"] },
  { name: "Керамика", keywords: ["керамик"] },
  { name: "Стекло", keywords: ["стекл", "зеркал"] },
  { name: "Камень", keywords: ["камень", "staron", "stonex", "искусствен"] },
  { name: "Дерево", keywords: ["дерев", "массив"] }
];

const MAIN_CATEGORY_RULES = [
  { name: "Раковины", keywords: ["раковин", "умываль", "умыв"] },
  { name: "Смесители", keywords: ["смесител", "кран"] },
  { name: "Инсталляции", keywords: ["инсталляц"] },
  { name: "Унитазы", keywords: ["унитаз", "бачк", "чаш", "сидень", "крышк"] },
  { name: "Биде", keywords: ["биде"] },
  { name: "Ванны", keywords: ["ванн", "экран"] },
  { name: "Душевые поддоны", keywords: ["поддон"] },
  { name: "Сифоны", keywords: ["сифон"] },
  { name: "Трапы и сливы", keywords: ["трап", "слив", "перелив"] },
  { name: "Душевые ограждения", keywords: ["душев", "огражд", "кабин", "двер", "штор", "угол"] },
  { name: "Мойки", keywords: ["мойк"] },
  { name: "Зеркала", keywords: ["зеркал"] },
  { name: "Мебель для ванной комнаты", keywords: ["мебел", "тумб", "шкаф", "пенал", "колонн"] },
  { name: "Полотенцесушители", keywords: ["полотенцесуш"] },
  { name: "Панели смыва", keywords: ["панел", "клавиш", "смыв"] },
  { name: "Аксессуары", keywords: ["аксессуар", "дозатор", "держател", "крюч", "ерш", "мыльниц", "стакан", "полк"] }
];

function normalizeText(value) {
  return String(value || "").trim().toLocaleLowerCase("ru-RU").replace(/ё/g, "е");
}

export function normalizeFilterOption(value) {
  const text = String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s*([+/])\s*/g, "$1");

  if (!text) return "";

  const lower = text.toLocaleLowerCase("ru-RU").replace(/ё/g, "е");
  let firstWordFormatted = false;

  return lower.replace(/[\p{L}\d]+/gu, (word) => {
    const knownToken = KNOWN_OPTION_TOKENS.get(word);
    if (knownToken) return knownToken;

    if (!firstWordFormatted) {
      firstWordFormatted = true;
      return word.charAt(0).toLocaleUpperCase("ru-RU") + word.slice(1);
    }

    return word;
  });
}

function normalizeComparable(value) {
  return normalizeFilterOption(value).toLocaleLowerCase("ru-RU");
}

function findRuleByKeywordPosition(value, rules, fallback) {
  const text = normalizeText(value);
  let bestMatch = null;

  rules.forEach((rule, ruleIndex) => {
    rule.keywords.forEach((keyword) => {
      const index = text.indexOf(keyword);
      if (index === -1) return;
      if (
        !bestMatch ||
        index < bestMatch.index ||
        (index === bestMatch.index && ruleIndex < bestMatch.ruleIndex)
      ) {
        bestMatch = { name: rule.name, index, ruleIndex };
      }
    });
  });

  return bestMatch?.name || fallback;
}

function buildVariantGroups(products, field, getMainGroup) {
  const groups = new Map();

  products.forEach((product) => {
    product.variants?.forEach((variant) => {
      const value = normalizeFilterOption(variant[field]);
      if (!value) return;

      const groupName = getMainGroup(value);
      if (!groups.has(groupName)) {
        groups.set(groupName, { name: groupName, count: 0, children: new Map() });
      }

      const group = groups.get(groupName);
      group.count += 1;

      if (value !== groupName) {
        group.children.set(value, (group.children.get(value) || 0) + 1);
      }
    });
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      children: Array.from(group.children.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name, "ru"))
    }))
    .sort((a, b) => {
      if (a.name === "Другое") return 1;
      if (b.name === "Другое") return -1;
      return a.name.localeCompare(b.name, "ru");
    });
}

export function getMainColor(color) {
  return findRuleByKeywordPosition(color, MAIN_COLOR_RULES, DEFAULT_MAIN_COLOR);
}

export function getMainMaterial(material) {
  return findRuleByKeywordPosition(material, MAIN_MATERIAL_RULES, DEFAULT_MAIN_MATERIAL);
}

export function getMainCategory(product) {
  const exactValues = [product?.category, product?.type].map((value) => normalizeFilterOption(value));
  const exactMatch = exactValues.find((value) => MAIN_CATEGORY_NAMES.includes(value));
  if (exactMatch) return exactMatch;

  const haystack = normalizeText([product?.category, product?.type, product?.name].filter(Boolean).join(" "));
  const matchedRule = MAIN_CATEGORY_RULES.find((rule) =>
    rule.keywords.some((keyword) => haystack.includes(keyword))
  );
  return matchedRule?.name || DEFAULT_MAIN_CATEGORY;
}

export function buildCategoryGroups(products) {
  const groups = new Map(
    MAIN_CATEGORY_NAMES.map((name) => [name, { name, count: 0, children: new Map() }])
  );

  products.forEach((product) => {
    const mainCategory = getMainCategory(product);
    const group = groups.get(mainCategory) || groups.get(DEFAULT_MAIN_CATEGORY);
    if (!group) return;

    group.count += 1;
    const childName = normalizeFilterOption(product.category);
    if (childName && childName !== mainCategory) {
      group.children.set(childName, (group.children.get(childName) || 0) + 1);
    }
  });

  return Array.from(groups.values())
    .filter((group) => group.count > 0)
    .map((group) => ({
      ...group,
      children: Array.from(group.children.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name, "ru"))
    }));
}

export function buildColorGroups(products) {
  return buildVariantGroups(products, "color", getMainColor);
}

export function buildMaterialGroups(products) {
  return buildVariantGroups(products, "material", getMainMaterial);
}

function parseNumber(value) {
  if (value === "" || value == null) return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function inRange(value, min, max) {
  if (value == null) return false;
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

function parseDimensionCandidates(size) {
  if (!size) return [];
  const text = String(size).toLowerCase();
  const numbers = text
    .match(/\d+(?:[.,]\d+)?/g)
    ?.map((value) => Number(value.replace(",", ".")))
    .filter((value) => Number.isFinite(value));

  if (!numbers?.length) return [];

  const named = {};
  const widthMatch = text.match(/(?:ширина|шир\.?|w)\D*(\d+(?:[.,]\d+)?)/i);
  const lengthMatch = text.match(/(?:длина|дл\.?|l)\D*(\d+(?:[.,]\d+)?)/i);
  const heightMatch = text.match(/(?:высота|выс\.?|h)\D*(\d+(?:[.,]\d+)?)/i);

  if (widthMatch) named.width = Number(widthMatch[1].replace(",", "."));
  if (lengthMatch) named.length = Number(lengthMatch[1].replace(",", "."));
  if (heightMatch) named.height = Number(heightMatch[1].replace(",", "."));

  const candidates = [];
  if (Object.keys(named).length) candidates.push(named);

  if (numbers.length >= 3) {
    candidates.push(
      { width: numbers[0], length: numbers[1], height: numbers[2] },
      { width: numbers[1], length: numbers[0], height: numbers[2] }
    );
  } else if (numbers.length === 2) {
    candidates.push(
      { width: numbers[0], length: numbers[1] },
      { width: numbers[1], length: numbers[0] }
    );
  } else {
    candidates.push({ width: numbers[0], length: numbers[0], height: numbers[0] });
  }

  return candidates;
}

function matchesSizeFilters(variant, filters) {
  const ranges = {
    width: [parseNumber(filters.widthMin), parseNumber(filters.widthMax)],
    length: [parseNumber(filters.lengthMin), parseNumber(filters.lengthMax)],
    height: [parseNumber(filters.heightMin), parseNumber(filters.heightMax)]
  };
  const hasSizeFilter = Object.values(ranges).some(([min, max]) => min != null || max != null);
  if (!hasSizeFilter) return true;

  return parseDimensionCandidates(variant.size).some((candidate) =>
    Object.entries(ranges).every(([key, [min, max]]) => {
      if (min == null && max == null) return true;
      return inRange(candidate[key], min, max);
    })
  );
}

export function filterProducts(products, filters) {
  const min = parseNumber(filters.priceMin);
  const max = parseNumber(filters.priceMax);
  const query = filters.query.trim().toLowerCase();
  const hasSizeFilter = [
    filters.widthMin,
    filters.widthMax,
    filters.lengthMin,
    filters.lengthMax,
    filters.heightMin,
    filters.heightMax
  ].some((value) => parseNumber(value) != null);

  return products.filter((product) => {
    const selectedCategoryGroups = filters.categoryGroups || [];
    const selectedCategories = filters.categories || [];
    const productCategory = normalizeFilterOption(product.category);
    const hasCategoryFilter = selectedCategoryGroups.length || selectedCategories.length;
    if (
      hasCategoryFilter &&
      !selectedCategoryGroups.includes(getMainCategory(product)) &&
      !selectedCategories.includes(productCategory)
    ) {
      return false;
    }
    const selectedBrands = (filters.brands || []).map(normalizeComparable);
    if (selectedBrands.length && !selectedBrands.includes(normalizeComparable(product.brand))) {
      return false;
    }

    const variants = product.variants || [];
    const selectedColorGroups = filters.colorGroups || [];
    const selectedColors = filters.colors || [];
    if (selectedColorGroups.length || selectedColors.length) {
      const hasColor = variants.some((v) => {
        const color = normalizeFilterOption(v.color);
        return color && (selectedColors.includes(color) || selectedColorGroups.includes(getMainColor(color)));
      });
      if (!hasColor) return false;
    }
    const selectedMaterialGroups = filters.materialGroups || [];
    const selectedMaterials = filters.materials || [];
    if (selectedMaterialGroups.length || selectedMaterials.length) {
      const hasMaterial = variants.some((v) => {
        const material = normalizeFilterOption(v.material);
        return (
          material &&
          (selectedMaterials.includes(material) || selectedMaterialGroups.includes(getMainMaterial(material)))
        );
      });
      if (!hasMaterial) return false;
    }
    if (hasSizeFilter && !variants.some((variant) => matchesSizeFilters(variant, filters))) {
      return false;
    }

    const price = getMinPrice(product);
    if (min != null && !Number.isNaN(min) && (price == null || price < min)) return false;
    if (max != null && !Number.isNaN(max) && (price == null || price > max)) return false;

    if (query) {
      const inName = product.name?.toLowerCase().includes(query);
      const inBrand = product.brand?.toLowerCase().includes(query);
      const inArticle = variants.some((v) => v.article?.toLowerCase().includes(query));
      if (!inName && !inBrand && !inArticle) return false;
    }

    return true;
  });
}

export function sortProducts(products, sortBy) {
  const list = [...products];
  if (sortBy === "price-asc") {
    list.sort((a, b) => (getMinPrice(a) ?? Infinity) - (getMinPrice(b) ?? Infinity));
  } else if (sortBy === "price-desc") {
    list.sort((a, b) => (getMinPrice(b) ?? 0) - (getMinPrice(a) ?? 0));
  } else {
    list.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ru"));
  }
  return list;
}
