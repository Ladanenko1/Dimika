CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    login VARCHAR(80) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS suppliers (
    id_s SERIAL PRIMARY KEY,
    first_name VARCHAR(120) NOT NULL,
    last_name VARCHAR(120) NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
    id_products SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    discription VARCHAR(1000),
    brand VARCHAR(120),
    type VARCHAR(120),
    category VARCHAR(120),
    supplier_id INTEGER REFERENCES suppliers(id_s) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS products_variants (
    id_pv SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id_products) ON DELETE CASCADE,
    article VARCHAR(100) NOT NULL UNIQUE,
    size VARCHAR(50),
    color VARCHAR(50),
    price NUMERIC(10, 2) NOT NULL,
    collection VARCHAR(120),
    material VARCHAR(120),
    country VARCHAR(120)
);

CREATE TABLE IF NOT EXISTS photos (
    id_photo SERIAL PRIMARY KEY,
    products_id INTEGER NOT NULL REFERENCES products(id_products) ON DELETE CASCADE,
    file VARCHAR(1000) NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL,
    question VARCHAR(4000) NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_products_name ON products(name);
CREATE INDEX IF NOT EXISTS ix_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS ix_products_type ON products(type);
CREATE INDEX IF NOT EXISTS ix_products_category ON products(category);
CREATE INDEX IF NOT EXISTS ix_products_supplier_id ON products(supplier_id);
CREATE INDEX IF NOT EXISTS ix_variants_product_id ON products_variants(product_id);
CREATE INDEX IF NOT EXISTS ix_photos_products_id ON photos(products_id);
