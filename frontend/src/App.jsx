import { useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useSearchParams
} from "react-router-dom";

import {
  fetchMe,
  fetchProducts,
  fetchSuppliers,
  importExcel,
  loginAdmin
} from "./api";

const TOKEN_KEY = "db_magaz_admin_token";

function formatSupplierName(supplier) {
  const name = [supplier.first_name, supplier.last_name].filter(Boolean).join(" ").trim();
  return name || `Supplier #${supplier.id_s}`;
}

function ProductCard({ product }) {
  const firstVariant = product.variants?.[0];
  return (
    <article className="product-card">
      <h3>{product.name}</h3>
      <p className="card-brand">{product.brand || "Без бренда"}</p>
      <div className="card-meta">
        <span>{product.category || "Категория не указана"}</span>
        <span>{product.type || "Тип не указан"}</span>
      </div>
      {firstVariant ? (
        <dl>
          <div>
            <dt>Артикул</dt>
            <dd>{firstVariant.article}</dd>
          </div>
          <div>
            <dt>Размер</dt>
            <dd>{firstVariant.size || "-"}</dd>
          </div>
          <div>
            <dt>Цвет</dt>
            <dd>{firstVariant.color || "-"}</dd>
          </div>
          <div>
            <dt>Материал</dt>
            <dd>{firstVariant.material || "-"}</dd>
          </div>
          <div>
            <dt>Страна</dt>
            <dd>{firstVariant.country || "-"}</dd>
          </div>
        </dl>
      ) : (
        <p className="muted">Варианты не добавлены</p>
      )}
    </article>
  );
}

function HomePage({ products, loading, error }) {
  const preview = products.slice(0, 6);
  const categoryPreview = Array.from(
    new Set(products.map((item) => item.category).filter(Boolean))
  ).slice(0, 10);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">DB MAGAZ</p>
          <h1>Салон сантехники и мебели для ванной</h1>
          <p>
            Подбор ассортимента для проектов и частных клиентов. Каталог без
            онлайн-оплаты, с быстрым обновлением позиций.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/catalog">
              Открыть каталог
            </Link>
            <Link className="btn btn-secondary" to="/contacts">
              Связаться с нами
            </Link>
          </div>
        </div>
        <div className="hero-badge">
          <p>Поставщики</p>
          <strong>{categoryPreview.length > 0 ? "EU / RU бренды" : "Подключаем прайсы"}</strong>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Популярные категории</h2>
        </div>
        <div className="chips">
          {categoryPreview.length ? (
            categoryPreview.map((item) => (
              <Link key={item} className="chip" to={`/catalog?category=${encodeURIComponent(item)}`}>
                {item}
              </Link>
            ))
          ) : (
            <p className="muted">Категории появятся после загрузки прайсов.</p>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Витрина каталога</h2>
          <Link className="text-link" to="/catalog">
            Смотреть все
          </Link>
        </div>
        {loading ? <p className="muted">Загрузка каталога...</p> : null}
        {error ? <p className="error">{error}</p> : null}
        <div className="product-grid">
          {preview.map((product) => (
            <ProductCard key={product.id_products} product={product} />
          ))}
        </div>
      </section>
    </>
  );
}

function CatalogPage({ products, loading, error }) {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") || "");

  useEffect(() => {
    const paramCategory = searchParams.get("category") || "";
    setCategory(paramCategory);
  }, [searchParams]);

  const categories = useMemo(() => {
    const unique = new Set(products.map((item) => item.category).filter(Boolean));
    return Array.from(unique).sort((a, b) => a.localeCompare(b, "ru"));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      if (category && product.category !== category) {
        return false;
      }
      if (!query) {
        return true;
      }

      const inName = product.name?.toLowerCase().includes(query);
      const inBrand = product.brand?.toLowerCase().includes(query);
      const inType = product.type?.toLowerCase().includes(query);
      const inArticle = product.variants?.some((variant) =>
        variant.article?.toLowerCase().includes(query)
      );
      return inName || inBrand || inType || inArticle;
    });
  }, [products, search, category]);

  return (
    <section className="section">
      <div className="section-head">
        <h2>Каталог</h2>
      </div>
      <div className="filters">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск: название, бренд, артикул"
        />
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">Все категории</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      {loading ? <p className="muted">Загрузка...</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <div className="catalog-count">Найдено позиций: {filteredProducts.length}</div>
      <div className="product-grid">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id_products} product={product} />
        ))}
      </div>
    </section>
  );
}

function AboutPage() {
  return (
    <section className="section prose">
      <h2>О нас</h2>
      <p>
        Мы работаем как каталог сантехники и интерьерных решений для ванной
        комнаты. Фокус на актуальном ассортименте и удобной навигации по брендам,
        категориям и артикулам.
      </p>
      <p>
        Для владельца реализована админ-панель с загрузкой прайсов поставщиков из
        Excel, чтобы позиции обновлялись быстро и без ручного ввода каждой
        карточки.
      </p>
      <p>
        Наш формат: консультация, подбор, резервирование и сопровождение заказа
        офлайн.
      </p>
    </section>
  );
}

function ContactsPage() {
  return (
    <section className="section contacts-grid">
      <div className="contact-card">
        <h2>Контакты</h2>
        <p>
          Телефон: <a href="tel:+74951206777">+7 (495) 120-67-77</a>
        </p>
        <p>
          Email: <a href="mailto:info@dbmagaz.ru">info@dbmagaz.ru</a>
        </p>
        <p>Адрес: Москва, ул. Калитниковская, д. 28, стр. 2</p>
        <p>График: Пн–Сб 10:00–20:00</p>
      </div>
      <div className="contact-card">
        <h3>Реквизиты</h3>
        <p>ООО «DB MAGAZ»</p>
        <p>ИНН: 0000000000</p>
        <p>ОГРН: 0000000000000</p>
      </div>
    </section>
  );
}

function AdminPage({
  token,
  me,
  suppliers,
  login,
  password,
  authLoading,
  authError,
  file,
  supplierName,
  importLoading,
  importError,
  importReport,
  onLoginChange,
  onPasswordChange,
  onSignIn,
  onLogout,
  onFileChange,
  onSupplierNameChange,
  onImport
}) {
  const supplierNames = useMemo(
    () => suppliers.map(formatSupplierName).filter(Boolean),
    [suppliers]
  );

  return (
    <section className="section">
      <div className="section-head">
        <h2>Админ-панель</h2>
        {token ? (
          <button type="button" className="btn btn-secondary" onClick={onLogout}>
            Выйти
          </button>
        ) : null}
      </div>

      {!token ? (
        <form className="stack" onSubmit={onSignIn}>
          <label>
            Логин
            <input type="text" value={login} onChange={onLoginChange} required />
          </label>
          <label>
            Пароль
            <input type="password" value={password} onChange={onPasswordChange} required />
          </label>
          <button type="submit" className="btn btn-primary" disabled={authLoading}>
            {authLoading ? "Вход..." : "Войти"}
          </button>
          {authError ? <p className="error">{authError}</p> : null}
        </form>
      ) : (
        <div className="stack">
          <p className="muted">
            Авторизован: <strong>{me?.login || "admin"}</strong>
          </p>
          <form className="stack" onSubmit={onImport}>
            <label>
              Excel файл поставщика
              <input
                type="file"
                accept=".xlsx,.xlsm,.xltx,.xltm"
                onChange={onFileChange}
                required
              />
            </label>
            <label>
              Поставщик (по названию)
              <input
                type="text"
                value={supplierName}
                onChange={onSupplierNameChange}
                list="supplier-options"
                placeholder="Например: ROCA"
              />
              <datalist id="supplier-options">
                {supplierNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </label>
            <button type="submit" className="btn btn-primary" disabled={importLoading}>
              {importLoading ? "Импорт..." : "Загрузить в БД"}
            </button>
          </form>
          {importError ? <p className="error">{importError}</p> : null}
          {importReport ? (
            <div className="report">
              <h3>Результат импорта</h3>
              {importReport.supplier_name ? (
                <p>
                  Поставщик: {importReport.supplier_name} (id: {importReport.supplier_id})
                </p>
              ) : null}
              <p>Всего строк: {importReport.total_rows}</p>
              <p>Добавлено: {importReport.inserted}</p>
              <p>Обновлено: {importReport.updated}</p>
              <p>Пропущено: {importReport.skipped}</p>
            </div>
          ) : null}
        </div>
      )}

      {!file && token ? <p className="muted">Загрузите Excel прайс для обновления каталога.</p> : null}
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div>
          <h3>DB MAGAZ</h3>
          <p>Каталог сантехники и мебели для ванной.</p>
          <p>Без онлайн-оплаты, с актуальным ассортиментом.</p>
        </div>
        <div>
          <h3>Карта</h3>
          <div className="map-wrap">
            <iframe
              title="map"
              src="https://www.openstreetmap.org/export/embed.html?bbox=37.67%2C55.71%2C37.73%2C55.75&layer=mapnik&marker=55.73%2C37.70"
              loading="lazy"
            />
          </div>
        </div>
      </div>
      <p className="footer-line">
        © {new Date().getFullYear()} DB MAGAZ • Москва, ул. Калитниковская, д. 28, стр. 2
      </p>
    </footer>
  );
}

function App() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState("");

  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || "");
  const [me, setMe] = useState(null);
  const [suppliers, setSuppliers] = useState([]);

  const [login, setLogin] = useState("admin");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [file, setFile] = useState(null);
  const [supplierName, setSupplierName] = useState("");
  const [importReport, setImportReport] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");

  async function loadProducts() {
    setLoadingProducts(true);
    setProductsError("");
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (error) {
      setProductsError(String(error.message || error));
    } finally {
      setLoadingProducts(false);
    }
  }

  async function loadSuppliers(currentToken) {
    if (!currentToken) {
      setSuppliers([]);
      return;
    }
    try {
      const data = await fetchSuppliers(currentToken);
      setSuppliers(data);
    } catch {
      setSuppliers([]);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (!token) {
      setMe(null);
      setSuppliers([]);
      return;
    }
    fetchMe(token)
      .then((user) => {
        setMe(user);
        loadSuppliers(token);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken("");
        setMe(null);
        setSuppliers([]);
      });
  }, [token]);

  async function handleSignIn(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const data = await loginAdmin(login, password);
      localStorage.setItem(TOKEN_KEY, data.access_token);
      setToken(data.access_token);
      setPassword("");
    } catch (error) {
      setAuthError(String(error.message || error));
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setMe(null);
    setImportReport(null);
    setSupplierName("");
  }

  async function handleImport(event) {
    event.preventDefault();
    if (!file) {
      setImportError("Выберите Excel файл");
      return;
    }
    setImportLoading(true);
    setImportError("");
    setImportReport(null);
    try {
      const report = await importExcel(token, file, supplierName);
      setImportReport(report);
      if (report.supplier_name) {
        setSupplierName(report.supplier_name);
      }
      await loadProducts();
      await loadSuppliers(token);
    } catch (error) {
      setImportError(String(error.message || error));
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <BrowserRouter>
      <div className="site-shell">
        <header className="site-header">
          <div className="top-line">
            <span>+7 (495) 120-67-77</span>
            <span>Москва • Калитниковская, 28с2</span>
          </div>
          <div className="main-line">
            <Link className="logo" to="/">
              DB MAGAZ
            </Link>
            <nav>
              <NavLink to="/" end>
                Главная
              </NavLink>
              <NavLink to="/catalog">Каталог</NavLink>
              <NavLink to="/about">О нас</NavLink>
              <NavLink to="/contacts">Контакты</NavLink>
              <NavLink to="/admin">Админ</NavLink>
            </nav>
          </div>
        </header>

        <main className="page-wrap">
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  products={products}
                  loading={loadingProducts}
                  error={productsError}
                />
              }
            />
            <Route
              path="/catalog"
              element={
                <CatalogPage
                  products={products}
                  loading={loadingProducts}
                  error={productsError}
                />
              }
            />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route
              path="/admin"
              element={
                <AdminPage
                  token={token}
                  me={me}
                  suppliers={suppliers}
                  login={login}
                  password={password}
                  authLoading={authLoading}
                  authError={authError}
                  file={file}
                  supplierName={supplierName}
                  importLoading={importLoading}
                  importError={importError}
                  importReport={importReport}
                  onLoginChange={(event) => setLogin(event.target.value)}
                  onPasswordChange={(event) => setPassword(event.target.value)}
                  onSignIn={handleSignIn}
                  onLogout={handleLogout}
                  onFileChange={(event) => setFile(event.target.files?.[0] || null)}
                  onSupplierNameChange={(event) => setSupplierName(event.target.value)}
                  onImport={handleImport}
                />
              }
            />
          </Routes>
        </main>

        <SiteFooter />
      </div>
    </BrowserRouter>
  );
}

export default App;
