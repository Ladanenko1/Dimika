import { useState } from "react";
import { Link } from "react-router-dom";

import { formatPrice, getMinPrice, getProductImage } from "../../utils/product";

export default function CatalogProductCard({ product }) {
  const [imageFailed, setImageFailed] = useState(false);
  const price = getMinPrice(product);
  const image = getProductImage(product);
  const hasPrice = price != null;

  function scrollToFeedback() {
    document.getElementById("feedback")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <article className="catalog-card">
      <Link to={`/catalog/${product.id_products}`} className="catalog-card-image">
        {image && !imageFailed ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : null}
      </Link>
      <Link to={`/catalog/${product.id_products}`} className="catalog-card-title">
        {product.name}
      </Link>
      {hasPrice ? (
        <p className="catalog-card-price">{formatPrice(price)}</p>
      ) : (
        <button className="catalog-card-price-button" type="button" onClick={scrollToFeedback}>
          Уточнить цену
        </button>
      )}
    </article>
  );
}
