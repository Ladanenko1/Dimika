import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

import CatalogFilters from "../components/catalog/CatalogFilters";
import CatalogProductCard from "../components/catalog/CatalogProductCard";
import FeedbackForm from "../components/forms/FeedbackForm";
import PageDivider from "../components/layout/PageDivider";
import {
  DEFAULT_FILTERS,
  MAIN_CATEGORY_NAMES,
  filterProducts,
  normalizeFilterOption,
  sortProducts
} from "../utils/catalog";

const PAGE_SIZE = 49;

function getPageFromSearch(searchParams) {
  const value = Number(searchParams.get("page"));
  return Number.isInteger(value) && value > 0 ? value : 1;
}

export default function CatalogPage({ products, loading, error }) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const skipNextEmptySearch = useRef(false);
  const skipInitialPageReset = useRef(true);
  const catalogTopRef = useRef(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState("name");
  const [page, setPage] = useState(() => getPageFromSearch(searchParams));

  useEffect(() => {
    const category = searchParams.get("category");
    const brand = searchParams.get("brand");
    if (category || brand) {
      const normalizedCategory = normalizeFilterOption(category);
      const isMainCategory = normalizedCategory && MAIN_CATEGORY_NAMES.includes(normalizedCategory);
      setFilters({
        ...DEFAULT_FILTERS,
        categoryGroups: isMainCategory ? [normalizedCategory] : [],
        categories: normalizedCategory && !isMainCategory ? [normalizedCategory] : [],
        brands: brand ? [brand] : []
      });
      setSortBy("name");
      setPage(1);
      skipNextEmptySearch.current = true;
      setSearchParams({}, { replace: true });
      return;
    }

    if (skipNextEmptySearch.current) {
      skipNextEmptySearch.current = false;
      return;
    }

    setFilters(DEFAULT_FILTERS);
    setSortBy("name");
    setPage(getPageFromSearch(searchParams));
  }, [location.key, searchParams, setSearchParams]);

  const filtered = useMemo(
    () => sortProducts(filterProducts(products, filters), sortBy),
    [products, filters, sortBy]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleItems = useMemo(
    () => {
      const start = (page - 1) * PAGE_SIZE;
      return filtered.slice(start, start + PAGE_SIZE);
    },
    [filtered, page]
  );
  const paginationItems = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (page <= 4) {
      return [1, 2, 3, 4, "end-ellipsis", totalPages];
    }

    if (page >= totalPages - 2) {
      return [1, "start-ellipsis", totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, "start-ellipsis", page - 1, page, page + 1, "end-ellipsis", totalPages];
  }, [page, totalPages]);

  const goToPage = (nextPage) => {
    const normalizedPage = Math.min(totalPages, Math.max(1, nextPage));
    setPage(normalizedPage);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("category");
    nextParams.delete("brand");
    if (normalizedPage > 1) {
      nextParams.set("page", String(normalizedPage));
    } else {
      nextParams.delete("page");
    }
    skipNextEmptySearch.current = true;
    setSearchParams(nextParams, { replace: true });
    catalogTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (skipInitialPageReset.current) {
      skipInitialPageReset.current = false;
      return;
    }

    setPage(1);
    if (searchParams.has("page")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("page");
      skipNextEmptySearch.current = true;
      setSearchParams(nextParams, { replace: true });
    }
  }, [filters, sortBy]);

  useEffect(() => {
    if (!filtered.length || page <= totalPages) return;
    goToPage(totalPages);
  }, [filtered.length, page, totalPages]);

  return (
    <div className="catalog-list-page">
      <PageDivider title="Каталог" />

      <div className="catalog-layout">
        <CatalogFilters products={products} filters={filters} onChange={setFilters} />

        <div className="catalog-main" ref={catalogTopRef}>
          <div className="catalog-toolbar">
            <span className="catalog-sort-label">Сортировка:</span>
            <button
              type="button"
              className={sortBy === "name" ? "active" : ""}
              onClick={() => setSortBy("name")}
            >
              По названию
            </button>
            <button
              type="button"
              className={sortBy === "price-asc" ? "active" : ""}
              onClick={() => setSortBy("price-asc")}
            >
              По возрастанию цены
            </button>
            <button
              type="button"
              className={sortBy === "price-desc" ? "active" : ""}
              onClick={() => setSortBy("price-desc")}
            >
              По убыванию цены
            </button>
          </div>

          {loading ? <p className="catalog-state muted">Загрузка...</p> : null}
          {error ? <p className="catalog-state catalog-state-error error">{error}</p> : null}

          <div className="catalog-grid">
            {visibleItems.map((product) => (
              <CatalogProductCard key={product.id_products} product={product} />
            ))}
          </div>

          {!loading && !error && !visibleItems.length ? (
            <p className="muted empty-state">Товары не найдены</p>
          ) : null}

          {totalPages > 1 ? (
            <nav className="pagination" aria-label="Страницы">
              {paginationItems.map((item) => (
                typeof item === "number" ? (
                  <button
                    key={item}
                    type="button"
                    className={page === item ? "active" : ""}
                    onClick={() => goToPage(item)}
                  >
                    {item}
                  </button>
                ) : (
                  <span key={item} className="pagination-ellipsis">…</span>
                )
              ))}
            </nav>
          ) : null}
        </div>
      </div>

      <FeedbackForm />
    </div>
  );
}
