import { useState } from "react";
import { Link } from "react-router-dom";

import { formatPrice, getMinPrice, getProductImage } from "../../utils/product";

export default function ProductCard({ product }) {
  const [imageFailed, setImageFailed] = useState(false);
  const price = getMinPrice(product);
  const image = getProductImage(product);

  return (
    <article className="product-card">
      <Link className="product-card-media" to={`/catalog/${product.id_products}`}>
        {image && !imageFailed ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : null}
      </Link>
      <div className="product-card-body">
        {product.brand ? <p className="product-card-brand">{product.brand}</p> : null}
        <h3>
          <Link to={`/catalog/${product.id_products}`}>{product.name}</Link>
        </h3>
        <p className="product-card-meta">
          {[product.category, product.type].filter(Boolean).join(" · ") || "Сантехника"}
        </p>
        <p className="product-card-price">{formatPrice(price)}</p>
        <Link className="product-card-link" to={`/catalog/${product.id_products}`}>
          Подробнее
        </Link>
      </div>
    </article>
  );
}
