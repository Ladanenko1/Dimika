import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { fetchProduct } from "../api";
import FeedbackForm from "../components/forms/FeedbackForm";
import {
  getBrandLogoSources,
  getMinPrice,
  getProductImages
} from "../utils/product";

function SpecRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="spec-row">
      <span>{label}</span>
      <span className="spec-dots" />
      <span>{value}</span>
    </div>
  );
}

export default function ProductPage() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [failedImages, setFailedImages] = useState(new Set());
  const [brandLogoIndex, setBrandLogoIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchProduct(productId)
      .then((data) => {
        if (!cancelled) {
          setProduct(data);
          setActiveImage(0);
          setFailedImages(new Set());
          setBrandLogoIndex(0);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(String(err.message || err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (loading) return <p className="muted page-loading">Загрузка карточки...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!product) return <p className="muted">Товар не найден</p>;

  const variant = product.variants?.[0];
  const images = getProductImages(product).filter((src) => !failedImages.has(src));
  const activeImageSrc = images[activeImage] || images[0] || null;
  const price = getMinPrice(product);
  const brandLogoSources = getBrandLogoSources(product.brand);
  const brandLogoSrc = brandLogoSources[brandLogoIndex] || null;

  function scrollToFeedback(event) {
    event.preventDefault();
    document.getElementById("feedback")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function markImageFailed(src) {
    setFailedImages((current) => {
      if (current.has(src)) return current;
      const next = new Set(current);
      next.add(src);
      return next;
    });
    setActiveImage(0);
  }

  return (
    <article className="product-page">
      <p className="back-link-wrap back-link-wrap-top">
        <Link to="/catalog">← Вернуться в каталог</Link>
      </p>

      <h1 className="product-page-title">{product.name}</h1>

      <div className="product-page-grid">
        <div className="product-thumbs">
          {images.map((src, index) => (
            <button
              key={src}
              type="button"
              className={index === activeImage ? "active" : ""}
              onClick={() => setActiveImage(index)}
            >
              <img src={src} alt="" onError={() => markImageFailed(src)} />
            </button>
          ))}
        </div>

        <div className="product-main-image">
          {activeImageSrc ? (
            <img
              src={activeImageSrc}
              alt={product.name}
              onError={() => markImageFailed(activeImageSrc)}
            />
          ) : null}
        </div>

        <aside className="product-buy">
          {price != null ? (
            <div className="product-price-box">
              <span className="product-price-value">{price.toLocaleString("ru-RU")}</span>
              <span className="product-price-currency">руб.</span>
            </div>
          ) : null}
          {price != null ? (
            <a className="btn-request" href="#feedback" onClick={scrollToFeedback}>
              Оставить заявку
            </a>
          ) : (
            <a className="btn-request" href="#feedback" onClick={scrollToFeedback}>
              Уточнить цену
            </a>
          )}
          {product.brand ? (
            <div className="product-brand-mark">
              {brandLogoSrc ? (
                <img
                  src={brandLogoSrc}
                  alt={product.brand}
                  onError={() => setBrandLogoIndex((index) => index + 1)}
                />
              ) : (
                <span>{product.brand}</span>
              )}
            </div>
          ) : null}
        </aside>
      </div>

      <section className="product-specs">
        <h2>Характеристики</h2>
        <div className="specs-columns">
          <div>
            <SpecRow label="Артикул" value={variant?.article} />
            <SpecRow label="Производитель" value={product.brand} />
            <SpecRow label="Коллекция" value={variant?.collection} />
            <SpecRow label="Страна" value={variant?.country} />
          </div>
          <div>
            <SpecRow label="Цвет" value={variant?.color} />
            <SpecRow label="Фактура" value={variant?.material} />
            <SpecRow label="Раздел" value={product.type} />
            <SpecRow label="Тип" value={product.category} />
          </div>
        </div>
        {product.discription ? <p className="product-description">{product.discription}</p> : null}
      </section>

      <FeedbackForm />
    </article>
  );
}
