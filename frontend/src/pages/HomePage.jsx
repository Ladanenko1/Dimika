import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import FeedbackForm from "../components/forms/FeedbackForm";
import PageDivider from "../components/layout/PageDivider";
import { HOME_BRANDS, HOME_CATEGORIES } from "../constants/site";
import { getBrandLogoSources, uniqueBrands } from "../utils/product";

function uniqueList(values) {
  const seen = new Set();
  return values
    .map((value) => String(value || "").trim())
    .filter((value) => {
      const key = value.toLowerCase();
      if (!value || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function BrandTile({ brand }) {
  const [logoIndex, setLogoIndex] = useState(0);
  const logoSources = useMemo(() => getBrandLogoSources(brand), [brand]);
  const logoSrc = logoSources[logoIndex] || null;

  function handleLogoError() {
    setLogoIndex((index) => index + 1);
  }

  return (
    <Link
      className={logoSrc ? "brand-tile brand-tile-logo" : "brand-tile"}
      to={`/catalog?brand=${encodeURIComponent(brand)}`}
    >
      {logoSrc ? (
        <img
          className="brand-tile-image"
          src={logoSrc}
          alt={brand}
          onError={handleLogoError}
        />
      ) : (
        <span>{brand}</span>
      )}
    </Link>
  );
}

export default function HomePage({ products = [], brands = [] }) {
  const brandsRowRef = useRef(null);
  const visibleBrands = useMemo(() => {
    const dynamicBrands = uniqueList([...brands, ...uniqueBrands(products)]);
    return dynamicBrands.length ? dynamicBrands : HOME_BRANDS;
  }, [brands, products]);

  const scrollBrands = (direction) => {
    const row = brandsRowRef.current;
    if (!row) return;
    row.scrollBy({
      left: direction * Math.max(280, row.clientWidth * 0.85),
      behavior: "smooth"
    });
  };

  return (
    <div className="home-page">
      <PageDivider title="Каталог" />

      <section className="category-grid">
        {HOME_CATEGORIES.map((item) => (
          <Link
            key={item.slug}
            className={`category-tile ${item.tone}`}
            to={`/catalog?category=${encodeURIComponent(item.slug)}`}
            style={item.image ? { backgroundImage: `url("${item.image}")` } : undefined}
          >
            <span className="category-tile-label">{item.title}</span>
          </Link>
        ))}
      </section>

      <PageDivider title="Бренды" />

      <section className="brands-carousel" aria-label="Бренды">
        <button
          type="button"
          className="brand-scroll-button brand-scroll-button-prev"
          onClick={() => scrollBrands(-1)}
          aria-label="Предыдущие бренды"
        >
          ‹
        </button>
        <div className="brands-row" ref={brandsRowRef}>
          {visibleBrands.map((brand) => (
            <BrandTile key={brand} brand={brand} />
          ))}
        </div>
        <button
          type="button"
          className="brand-scroll-button brand-scroll-button-next"
          onClick={() => scrollBrands(1)}
          aria-label="Следующие бренды"
        >
          ›
        </button>
      </section>

      <FeedbackForm />
    </div>
  );
}
