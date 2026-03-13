import { useMemo, useState } from "react";
import {
  buildCategoryGroups,
  buildColorGroups,
  buildMaterialGroups,
  normalizeFilterOption
} from "../../utils/catalog";

const COLOR_SWATCH_RULES = [
  { keywords: ["хром", "chrome"], value: "linear-gradient(180deg, #f6f6f6, #b8b8b8)" },
  { keywords: ["бел", "white"], value: "#f8f8f8" },
  { keywords: ["черн", "black"], value: "#1d1d1d" },
  { keywords: ["антрацит"], value: "#333" },
  { keywords: ["графит"], value: "#555" },
  { keywords: ["золот", "gold"], value: "linear-gradient(135deg, #f7db54, #c7940d)" },
  { keywords: ["бронз", "bronze"], value: "#8b6a45" },
  { keywords: ["латун", "brass"], value: "#b69353" },
  { keywords: ["сер", "grey", "gray"], value: "#b9b9b9" },
  { keywords: ["беж"], value: "#d7c8b6" },
  { keywords: ["корич", "brown"], value: "#8a654a" },
  { keywords: ["син", "blue"], value: "#5c7fa8" },
  { keywords: ["зелен", "green"], value: "#78906f" },
  { keywords: ["красн", "red"], value: "#a34c4c" },
  { keywords: ["роз", "pink"], value: "#d7a3ad" }
];

function swatchFor(color) {
  if (!color) return "#ddd";
  const key = normalizeFilterOption(color).toLocaleLowerCase("ru-RU");
  const rule = COLOR_SWATCH_RULES.find((item) =>
    item.keywords.some((keyword) => key.includes(keyword))
  );
  return rule?.value || "#ddd";
}

function normalizeBrandKey(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU").replace(/ё/g, "е");
}

function chooseBrandName(current, candidate) {
  if (!current) return candidate;
  const currentIsLower = current === current.toLocaleLowerCase("ru-RU");
  const candidateIsLower = candidate === candidate.toLocaleLowerCase("ru-RU");
  return currentIsLower && !candidateIsLower ? candidate : current;
}

function priceMask(value) {
  return String(value || "").replace(/\D+/g, "");
}

function hasValue(value) {
  return Array.isArray(value) ? value.length > 0 : Boolean(String(value || "").trim());
}

export default function CatalogFilters({
  products,
  filters,
  onChange
}) {
  const [openCategoryGroups, setOpenCategoryGroups] = useState([]);
  const [openColorGroups, setOpenColorGroups] = useState([]);
  const [openMaterialGroups, setOpenMaterialGroups] = useState([]);

  const categories = useMemo(() => {
    return buildCategoryGroups(products);
  }, [products]);

  const brands = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      if (!p.brand) return;
      const name = String(p.brand).trim().replace(/\s+/g, " ");
      const key = normalizeBrandKey(name);
      const current = map.get(key);
      map.set(key, {
        name: chooseBrandName(current?.name, name),
        count: (current?.count || 0) + 1
      });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [products]);

  const colors = useMemo(() => {
    return buildColorGroups(products);
  }, [products]);

  const materials = useMemo(() => {
    return buildMaterialGroups(products);
  }, [products]);

  function toggleInList(key, value) {
    const list = new Set(filters[key] || []);
    if (list.has(value)) list.delete(value);
    else list.add(value);
    onChange({ ...filters, [key]: Array.from(list) });
  }

  function resetFilter(keys) {
    const nextFilters = { ...filters };
    keys.forEach((key) => {
      nextFilters[key] = Array.isArray(filters[key]) ? [] : "";
    });
    onChange(nextFilters);
  }

  function toggleCategoryGroup(group) {
    const groups = new Set(filters.categoryGroups || []);
    if (groups.has(group.name)) groups.delete(group.name);
    else groups.add(group.name);

    const childNames = new Set(group.children.map((child) => child.name));
    onChange({
      ...filters,
      categoryGroups: Array.from(groups),
      categories: filters.categories.filter((name) => !childNames.has(name))
    });
  }

  function toggleCategoryOpen(groupName) {
    setOpenCategoryGroups((items) =>
      items.includes(groupName)
        ? items.filter((item) => item !== groupName)
        : [...items, groupName]
    );
  }

  function toggleColorGroup(group) {
    const groups = new Set(filters.colorGroups || []);
    if (groups.has(group.name)) groups.delete(group.name);
    else groups.add(group.name);

    const childNames = new Set(group.children.map((child) => child.name));
    onChange({
      ...filters,
      colorGroups: Array.from(groups),
      colors: filters.colors.filter((name) => !childNames.has(name))
    });
  }

  function toggleColorOpen(groupName) {
    setOpenColorGroups((items) =>
      items.includes(groupName)
        ? items.filter((item) => item !== groupName)
        : [...items, groupName]
    );
  }

  function toggleMaterialGroup(group) {
    const groups = new Set(filters.materialGroups || []);
    if (groups.has(group.name)) groups.delete(group.name);
    else groups.add(group.name);

    const childNames = new Set(group.children.map((child) => child.name));
    onChange({
      ...filters,
      materialGroups: Array.from(groups),
      materials: filters.materials.filter((name) => !childNames.has(name))
    });
  }

  function toggleMaterialOpen(groupName) {
    setOpenMaterialGroups((items) =>
      items.includes(groupName)
        ? items.filter((item) => item !== groupName)
        : [...items, groupName]
    );
  }

  const visibleCategories = useMemo(() => {
    const query = filters.sectionSearch.trim().toLowerCase();
    if (!query) return categories;

    return categories
      .map((group) => {
        const groupMatches = group.name.toLowerCase().includes(query);
        return {
          ...group,
          children: groupMatches
            ? group.children
            : group.children.filter((child) => child.name.toLowerCase().includes(query))
        };
      })
      .filter((group) => group.name.toLowerCase().includes(query) || group.children.length);
  }, [categories, filters.sectionSearch]);

  const visibleMaterials = useMemo(() => {
    const query = filters.materialSearch.trim().toLocaleLowerCase("ru-RU");
    if (!query) return materials;

    return materials
      .map((group) => {
        const groupMatches = group.name.toLocaleLowerCase("ru-RU").includes(query);
        return {
          ...group,
          children: groupMatches
            ? group.children
            : group.children.filter((child) => child.name.toLocaleLowerCase("ru-RU").includes(query))
        };
      })
      .filter((group) => group.name.toLocaleLowerCase("ru-RU").includes(query) || group.children.length);
  }, [materials, filters.materialSearch]);

  return (
    <aside className="catalog-sidebar">
      <FilterBlock
        title="Название товара"
        canReset={hasValue(filters.query)}
        onReset={() => resetFilter(["query"])}
      >
        <input
          type="search"
          className="filter-search"
          placeholder="Поиск"
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
        />
      </FilterBlock>

      <FilterBlock
        title="Раздел каталога"
        canReset={
          hasValue(filters.sectionSearch) ||
          hasValue(filters.categoryGroups) ||
          hasValue(filters.categories)
        }
        onReset={() => {
          setOpenCategoryGroups([]);
          resetFilter(["sectionSearch", "categoryGroups", "categories"]);
        }}
      >
        <input
          type="search"
          className="filter-search"
          placeholder="Поиск"
          value={filters.sectionSearch}
          onChange={(e) => onChange({ ...filters, sectionSearch: e.target.value })}
        />
        <div className="filter-checklist filter-category-tree">
          {visibleCategories.map((group) => (
            <div key={group.name} className="filter-category-group">
              <div className="filter-category-main-row">
                <label className="filter-check filter-check-main">
                  <input
                    type="checkbox"
                    checked={(filters.categoryGroups || []).includes(group.name)}
                    onChange={() => toggleCategoryGroup(group)}
                  />
                  <span>
                    {group.name} <em>({group.count})</em>
                  </span>
                </label>
                {group.children.length ? (
                  <button
                    type="button"
                    className={
                      openCategoryGroups.includes(group.name) || filters.sectionSearch
                        ? "filter-category-toggle is-open"
                        : "filter-category-toggle"
                    }
                    onClick={() => toggleCategoryOpen(group.name)}
                    aria-label="Показать подкатегории"
                    aria-expanded={openCategoryGroups.includes(group.name) || Boolean(filters.sectionSearch)}
                  />
                ) : null}
              </div>
              {openCategoryGroups.includes(group.name) || filters.sectionSearch ? (
                group.children.map((child) => (
                  <label key={child.name} className="filter-check filter-check-child">
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(child.name)}
                      onChange={() => toggleInList("categories", child.name)}
                    />
                    <span>
                      {child.name} <em>({child.count})</em>
                    </span>
                  </label>
                ))
              ) : null}
            </div>
          ))}
        </div>
      </FilterBlock>

      <FilterBlock
        title="Стоимость"
        canReset={hasValue(filters.priceMin) || hasValue(filters.priceMax)}
        onReset={() => resetFilter(["priceMin", "priceMax"])}
      >
        <div className="filter-range-inputs">
          <label>
            От
            <input
              type="text"
              placeholder="0"
              inputMode="numeric"
              value={filters.priceMin}
              onChange={(e) => onChange({ ...filters, priceMin: priceMask(e.target.value) })}
            />
          </label>
          <label>
            До
            <input
              type="text"
              placeholder="0"
              inputMode="numeric"
              value={filters.priceMax}
              onChange={(e) => onChange({ ...filters, priceMax: priceMask(e.target.value) })}
            />
          </label>
        </div>
      </FilterBlock>

      <FilterBlock
        title="Бренд"
        canReset={hasValue(filters.brandSearch) || hasValue(filters.brands)}
        onReset={() => resetFilter(["brandSearch", "brands"])}
      >
        <input
          type="search"
          className="filter-search"
          placeholder="Поиск"
          value={filters.brandSearch}
          onChange={(e) => onChange({ ...filters, brandSearch: e.target.value })}
        />
        <div className="filter-checklist filter-checklist-scroll">
          {brands
            .filter(({ name }) =>
              !filters.brandSearch ||
              name.toLowerCase().includes(filters.brandSearch.toLowerCase())
            )
            .map(({ name, count }) => (
              <label key={name} className="filter-check">
                <input
                  type="checkbox"
                  checked={filters.brands.includes(name)}
                  onChange={() => toggleInList("brands", name)}
                />
                <span>
                  {name} <em>({count})</em>
                </span>
              </label>
            ))}
        </div>
      </FilterBlock>

      <FilterBlock
        title="Цвет"
        canReset={hasValue(filters.colorGroups) || hasValue(filters.colors)}
        onReset={() => {
          setOpenColorGroups([]);
          resetFilter(["colorGroups", "colors"]);
        }}
      >
        <div className="filter-colors filter-color-tree">
          {colors.map((group) => {
            const colorOpen =
              openColorGroups.includes(group.name) ||
              group.children.some((child) => filters.colors.includes(child.name));
            return (
            <div key={group.name} className="filter-color-group">
              <div className="filter-color-main-row">
                <label className="filter-color filter-color-main">
                  <input
                    type="checkbox"
                    checked={(filters.colorGroups || []).includes(group.name)}
                    onChange={() => toggleColorGroup(group)}
                  />
                  <span className="color-swatch" style={{ background: swatchFor(group.name) }} />
                  <span>
                    {group.name} <em>({group.count})</em>
                  </span>
                </label>
                {group.children.length ? (
                  <button
                    type="button"
                    className={
                      colorOpen
                        ? "filter-category-toggle is-open"
                        : "filter-category-toggle"
                    }
                    onClick={() => toggleColorOpen(group.name)}
                    aria-label="Показать оттенки"
                    aria-expanded={colorOpen}
                  />
                ) : null}
              </div>
              {colorOpen ? (
                group.children.map((child) => (
                  <label key={child.name} className="filter-color filter-color-child">
                    <input
                      type="checkbox"
                      checked={filters.colors.includes(child.name)}
                      onChange={() => toggleInList("colors", child.name)}
                    />
                    <span className="color-swatch" style={{ background: swatchFor(child.name) }} />
                    <span>
                      {child.name} <em>({child.count})</em>
                    </span>
                  </label>
                ))
              ) : null}
            </div>
            );
          })}
        </div>
      </FilterBlock>

      <FilterBlock
        title="Размер"
        canReset={
          hasValue(filters.widthMin) ||
          hasValue(filters.widthMax) ||
          hasValue(filters.lengthMin) ||
          hasValue(filters.lengthMax) ||
          hasValue(filters.heightMin) ||
          hasValue(filters.heightMax)
        }
        onReset={() =>
          resetFilter(["widthMin", "widthMax", "lengthMin", "lengthMax", "heightMin", "heightMax"])
        }
      >
        <DimensionRange
          label="Ширина, см"
          minValue={filters.widthMin}
          maxValue={filters.widthMax}
          onMinChange={(value) => onChange({ ...filters, widthMin: value })}
          onMaxChange={(value) => onChange({ ...filters, widthMax: value })}
        />
        <DimensionRange
          label="Длина, см"
          minValue={filters.lengthMin}
          maxValue={filters.lengthMax}
          onMinChange={(value) => onChange({ ...filters, lengthMin: value })}
          onMaxChange={(value) => onChange({ ...filters, lengthMax: value })}
        />
        <DimensionRange
          label="Высота, см"
          minValue={filters.heightMin}
          maxValue={filters.heightMax}
          onMinChange={(value) => onChange({ ...filters, heightMin: value })}
          onMaxChange={(value) => onChange({ ...filters, heightMax: value })}
        />
      </FilterBlock>

      <FilterBlock
        title="Материал"
        canReset={
          hasValue(filters.materialSearch) ||
          hasValue(filters.materialGroups) ||
          hasValue(filters.materials)
        }
        onReset={() => {
          setOpenMaterialGroups([]);
          resetFilter(["materialSearch", "materialGroups", "materials"]);
        }}
      >
        <input
          type="search"
          className="filter-search"
          placeholder="Поиск"
          value={filters.materialSearch}
          onChange={(e) => onChange({ ...filters, materialSearch: e.target.value })}
        />
        <div className="filter-checklist filter-checklist-scroll">
          {visibleMaterials.map((group) => (
            <div key={group.name} className="filter-category-group">
              <div className="filter-category-main-row">
                <label className="filter-check filter-check-main">
                  <input
                    type="checkbox"
                    checked={(filters.materialGroups || []).includes(group.name)}
                    onChange={() => toggleMaterialGroup(group)}
                  />
                  <span>
                    {group.name} <em>({group.count})</em>
                  </span>
                </label>
                {group.children.length ? (
                  <button
                    type="button"
                    className={
                      openMaterialGroups.includes(group.name) || filters.materialSearch
                        ? "filter-category-toggle is-open"
                        : "filter-category-toggle"
                    }
                    onClick={() => toggleMaterialOpen(group.name)}
                    aria-label="Показать подкатегории материала"
                    aria-expanded={openMaterialGroups.includes(group.name) || Boolean(filters.materialSearch)}
                  />
                ) : null}
              </div>
              {openMaterialGroups.includes(group.name) || filters.materialSearch ? (
                group.children.map((child) => (
                  <label key={child.name} className="filter-check filter-check-child">
                    <input
                      type="checkbox"
                      checked={filters.materials.includes(child.name)}
                      onChange={() => toggleInList("materials", child.name)}
                    />
                    <span>
                      {child.name} <em>({child.count})</em>
                    </span>
                  </label>
                ))
              ) : null}
            </div>
          ))}
        </div>
      </FilterBlock>
    </aside>
  );
}

function FilterBlock({ title, canReset = false, onReset, children }) {
  return (
    <section className="filter-block">
      <div className="filter-block-head">
        <h3 className="filter-block-title">{title}</h3>
        <button
          type="button"
          className="filter-reset"
          onClick={onReset}
          disabled={!canReset}
          aria-label={`Сбросить фильтр ${title}`}
          title="Сбросить"
        >
          ×
        </button>
      </div>
      {children}
    </section>
  );
}

function DimensionRange({ label, minValue, maxValue, onMinChange, onMaxChange }) {
  return (
    <div className="dimension-range">
      <p className="dimension-range-title">{label}</p>
      <div className="dimension-range-inputs">
        <input
          type="number"
          placeholder="От"
          value={minValue}
          onChange={(event) => onMinChange(event.target.value)}
        />
        <input
          type="number"
          placeholder="До"
          value={maxValue}
          onChange={(event) => onMaxChange(event.target.value)}
        />
      </div>
    </div>
  );
}
