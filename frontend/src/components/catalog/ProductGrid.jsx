import ProductCard from "./ProductCard";

export default function ProductGrid({ products, emptyText = "Товары не найдены" }) {
  if (!products.length) {
    return <p className="muted empty-state">{emptyText}</p>;
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id_products} product={product} />
      ))}
    </div>
  );
}
