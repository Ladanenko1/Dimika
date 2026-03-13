import { useEffect, useMemo, useState } from "react";

import {
  createProduct,
  createSupplier,
  createVariant,
  createPhoto,
  deleteQuestion,
  deletePhoto,
  deleteProduct,
  deleteSupplier,
  deleteVariant,
  fetchAdminProducts,
  fetchMe,
  fetchQuestions,
  fetchSuppliers,
  importExcel,
  loginAdmin,
  updateProduct,
  updatePhoto,
  updateSupplier,
  updateVariant
} from "../api";
import { HOME_CATEGORIES } from "../constants/site";
import { formatSupplierName } from "../utils/product";

const TOKEN_KEY = "db_magaz_admin_token";

const EMPTY_PRODUCT = {
  name: "",
  discription: "",
  brand: "",
  category: "",
  type: "",
  supplier_id: ""
};

const EMPTY_VARIANT = {
  article: "",
  price: "",
  color: "",
  size: "",
  material: "",
  country: "",
  collection: ""
};

const EMPTY_SUPPLIER = {
  first_name: "",
  last_name: ""
};

function cleanText(value) {
  const text = String(value || "").trim();
  return text || null;
}

function productToForm(product) {
  if (!product) return EMPTY_PRODUCT;
  return {
    name: product.name || "",
    discription: product.discription || "",
    brand: product.brand || "",
    category: product.category || "",
    type: product.type || "",
    supplier_id: product.supplier_id ? String(product.supplier_id) : ""
  };
}

function buildProductPayload(form) {
  return {
    name: form.name.trim(),
    discription: cleanText(form.discription),
    brand: cleanText(form.brand),
    category: cleanText(form.category),
    type: cleanText(form.type),
    supplier_id: form.supplier_id ? Number(form.supplier_id) : null
  };
}

function buildVariantPayload(form) {
  return {
    article: form.article.trim(),
    price: Number(String(form.price).replace(",", ".")),
    color: cleanText(form.color),
    size: cleanText(form.size),
    material: cleanText(form.material),
    country: cleanText(form.country),
    collection: cleanText(form.collection)
  };
}

export default function AdminApp() {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || "");
  const [login, setLogin] = useState("admin");
  const [password, setPassword] = useState("");
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("products");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [variantForm, setVariantForm] = useState(EMPTY_VARIANT);
  const [photoUrl, setPhotoUrl] = useState("");
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER);
  const [editingSupplierId, setEditingSupplierId] = useState(null);
  const [file, setFile] = useState(null);
  const [supplierId, setSupplierId] = useState("");
  const [importReport, setImportReport] = useState(null);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id_products === selectedId) || null,
    [products, selectedId]
  );
  const categoryOptions = useMemo(() => {
    const values = [
      ...HOME_CATEGORIES.map((item) => item.slug),
      ...products.map((product) => product.category)
    ];
    return Array.from(
      new Set(values.map((value) => String(value || "").trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "ru"));
  }, [products]);

  async function loadData(currentToken = token) {
    if (!currentToken) return;
    setLoading(true);
    setError("");
    try {
      const [productData, supplierData] = await Promise.all([
        fetchAdminProducts(currentToken),
        fetchSuppliers(currentToken)
      ]);
      setProducts(productData);
      setSuppliers(supplierData);
      if (!selectedId && productData.length) {
        setSelectedId(productData[0].id_products);
        setProductForm(productToForm(productData[0]));
      }
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function loadQuestions(currentToken = token) {
    if (!currentToken) return;
    setError("");
    try {
      const data = await fetchQuestions(currentToken);
      setQuestions(data);
    } catch (err) {
      setError(String(err.message || err));
    }
  }

  useEffect(() => {
    if (!token) return;
    fetchMe(token)
      .then((user) => {
        setMe(user);
        loadData(token);
        loadQuestions(token);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken("");
      });
  }, [token]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 2500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function selectProduct(product) {
    setSelectedId(product.id_products);
    setProductForm(productToForm(product));
    setVariantForm(EMPTY_VARIANT);
    setPhotoUrl("");
    setNotice("");
    setError("");
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await loginAdmin(login, password);
      localStorage.setItem(TOKEN_KEY, data.access_token);
      setToken(data.access_token);
      setPassword("");
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setMe(null);
    setProducts([]);
    setSuppliers([]);
    setQuestions([]);
    setSelectedId(null);
    setSupplierId("");
  }

  function startNewProduct() {
    setSelectedId(null);
    setProductForm(EMPTY_PRODUCT);
    setVariantForm(EMPTY_VARIANT);
    setPhotoUrl("");
    setNotice("");
    setTab("products");
  }

  async function saveProduct(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const payload = buildProductPayload(productForm);
      if (selectedProduct) {
        await updateProduct(token, selectedProduct.id_products, payload);
        setNotice("Товар сохранен");
      } else {
        const created = await createProduct(token, payload);
        setSelectedId(created.id_products);
        setNotice("Товар создан");
      }
      await loadData();
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function removeSelectedProduct() {
    if (!selectedProduct) return;
    if (!window.confirm("Удалить товар и все его варианты?")) return;
    setLoading(true);
    setError("");
    try {
      await deleteProduct(token, selectedProduct.id_products);
      setSelectedId(null);
      setProductForm(EMPTY_PRODUCT);
      await loadData();
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function addVariant(event) {
    event.preventDefault();
    if (!selectedProduct) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      await createVariant(token, selectedProduct.id_products, buildVariantPayload(variantForm));
      setVariantForm(EMPTY_VARIANT);
      setNotice("Вариант добавлен");
      await loadData();
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function addPhoto(event) {
    event.preventDefault();
    if (!selectedProduct || !photoUrl.trim()) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      await createPhoto(token, selectedProduct.id_products, { file: photoUrl.trim() });
      setPhotoUrl("");
      setNotice("Фото добавлено");
      await loadData();
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function savePhoto(photoId, file) {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      await updatePhoto(token, photoId, { file: file.trim() });
      setNotice("Фото сохранено");
      await loadData();
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function removePhoto(photoId) {
    if (!window.confirm("Удалить фото товара?")) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      await deletePhoto(token, photoId);
      setNotice("Фото удалено");
      await loadData();
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function saveSupplier(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (editingSupplierId) {
        await updateSupplier(token, editingSupplierId, supplierForm);
      } else {
        await createSupplier(token, supplierForm);
      }
      setSupplierForm(EMPTY_SUPPLIER);
      setEditingSupplierId(null);
      await loadData();
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function removeSupplier(supplierId) {
    if (!window.confirm("Внимание! При удалении поставщика удалятся все его товары. Продолжить?")) return;
    setLoading(true);
    setError("");
    try {
      await deleteSupplier(token, supplierId);
      await loadData();
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(event) {
    event.preventDefault();
    if (!file) {
      setError("Выберите Excel-файл");
      return;
    }
    setLoading(true);
    setError("");
    setNotice("");
    setImportReport(null);
    try {
      const report = await importExcel(token, file, supplierId ? { supplierId } : "");
      setImportReport(report);
      setNotice("Импорт завершен");
      await loadData();
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function removeQuestion(questionId) {
    if (!window.confirm("Удалить вопрос из базы данных?")) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      await deleteQuestion(token, questionId);
      setQuestions((items) => items.filter((item) => item.id !== questionId));
      setNotice("Вопрос удален");
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <main className="admin-login-page">
        <form className="login-panel" onSubmit={handleLogin}>
          <p className="eyebrow">Димика</p>
          <h1>Админ-панель</h1>
          <label>
            Логин
            <input value={login} onChange={(event) => setLogin(event.target.value)} required />
          </label>
          <label>
            Пароль
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Вход..." : "Войти"}
          </button>
          {error ? <p className="error-text">{error}</p> : null}
        </form>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div>
          <p className="eyebrow">Димика</p>
          <h1>Админ-панель</h1>
        </div>
        <div className="admin-user">
          <span>{me?.login || "admin"}</span>
          <button type="button" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      </header>

      <nav className="admin-tabs">
        <button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}>
          Товары
        </button>
        <button className={tab === "import" ? "active" : ""} onClick={() => setTab("import")}>
          Импорт Excel
        </button>
        <button className={tab === "suppliers" ? "active" : ""} onClick={() => setTab("suppliers")}>
          Поставщики
        </button>
        <button
          className={tab === "questions" ? "active" : ""}
          onClick={() => {
            setTab("questions");
            loadQuestions();
          }}
        >
          Вопросы
        </button>
      </nav>

      {error ? <p className="admin-message error-text">{error}</p> : null}
      {notice ? <p className="admin-message admin-notice success-text">{notice}</p> : null}

      {tab === "products" ? (
        <section className="admin-products">
          <aside className="product-list">
            <div className="panel-head">
              <h2>Товары</h2>
              <button type="button" onClick={startNewProduct}>
                Новый
              </button>
            </div>
            <div className="product-list-scroll">
              {products.map((product) => (
                <button
                  key={product.id_products}
                  type="button"
                  className={product.id_products === selectedId ? "product-row active" : "product-row"}
                  onClick={() => selectProduct(product)}
                >
                  <span>{product.name}</span>
                  <small>{product.brand || "Без бренда"}</small>
                </button>
              ))}
              {!products.length && !loading ? <p className="muted">Товары не найдены</p> : null}
            </div>
          </aside>

          <section className="editor-panel">
            <form className="admin-form" onSubmit={saveProduct}>
              <div className="panel-head">
                <h2>{selectedProduct ? "Карточка товара" : "Новый товар"}</h2>
                {selectedProduct ? (
                  <button type="button" className="danger" onClick={removeSelectedProduct}>
                    Удалить
                  </button>
                ) : null}
              </div>
              <div className="form-grid">
                <label>
                  Название
                  <input
                    value={productForm.name}
                    onChange={(event) => setProductForm({ ...productForm, name: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Производитель
                  <input
                    value={productForm.brand}
                    onChange={(event) => setProductForm({ ...productForm, brand: event.target.value })}
                  />
                </label>
                <label>
                  Раздел
                  <select
                    value={productForm.category}
                    onChange={(event) => setProductForm({ ...productForm, category: event.target.value })}
                  >
                    <option value="">Не выбран</option>
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Тип продукта
                  <input
                    value={productForm.type}
                    onChange={(event) => setProductForm({ ...productForm, type: event.target.value })}
                  />
                </label>
                <label>
                  Поставщик
                  <select
                    value={productForm.supplier_id}
                    onChange={(event) => setProductForm({ ...productForm, supplier_id: event.target.value })}
                  >
                    <option value="">Не выбран</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id_s} value={supplier.id_s}>
                        {formatSupplierName(supplier)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="wide">
                  Описание
                  <textarea
                    rows={3}
                    value={productForm.discription}
                    onChange={(event) => setProductForm({ ...productForm, discription: event.target.value })}
                  />
                </label>
              </div>
              <button type="submit" disabled={loading || !productForm.name.trim()}>
                {loading ? "Сохранение..." : "Сохранить товар"}
              </button>
            </form>

            <section className="photos-panel">
              <div className="panel-head">
                <h2>Фото товара</h2>
                <span className="muted">URL или путь к изображению</span>
              </div>
              {selectedProduct ? (
                <>
                  <div className="photo-list">
                    {selectedProduct.photos?.map((photo) => (
                      <PhotoRow
                        key={photo.id_photo}
                        photo={photo}
                        onSave={savePhoto}
                        onDelete={removePhoto}
                        disabled={loading}
                      />
                    ))}
                    {!selectedProduct.photos?.length ? (
                      <p className="muted">Фото пока не добавлены.</p>
                    ) : null}
                  </div>
                  <form className="photo-add-form" onSubmit={addPhoto}>
                    <input
                      placeholder="https://site.ru/photo.jpg"
                      value={photoUrl}
                      onChange={(event) => setPhotoUrl(event.target.value)}
                      required
                    />
                    <button type="submit" disabled={loading || !photoUrl.trim()}>
                      Добавить фото
                    </button>
                  </form>
                </>
              ) : (
                <p className="muted photo-empty">Сначала выберите или создайте товар.</p>
              )}
            </section>

            <section className="variant-panel">
              <div className="panel-head">
                <h2>Варианты</h2>
                <span className="muted">Материал редактируется здесь</span>
              </div>
              {selectedProduct ? (
                <>
                  <div className="variant-table">
                    {selectedProduct.variants?.map((variant) => (
                      <VariantRow
                        key={variant.id_pv}
                        token={token}
                        variant={variant}
                        onSaved={loadData}
                        onError={setError}
                      />
                    ))}
                  </div>
                  <form className="variant-add-form" onSubmit={addVariant}>
                    <input
                      placeholder="Артикул"
                      value={variantForm.article}
                      onChange={(event) => setVariantForm({ ...variantForm, article: event.target.value })}
                      required
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Цена"
                      value={variantForm.price}
                      onChange={(event) => setVariantForm({ ...variantForm, price: event.target.value })}
                      required
                    />
                    <input
                      placeholder="Цвет"
                      value={variantForm.color}
                      onChange={(event) => setVariantForm({ ...variantForm, color: event.target.value })}
                    />
                    <input
                      placeholder="Размер"
                      value={variantForm.size}
                      onChange={(event) => setVariantForm({ ...variantForm, size: event.target.value })}
                    />
                    <input
                      placeholder="Материал"
                      value={variantForm.material}
                      onChange={(event) => setVariantForm({ ...variantForm, material: event.target.value })}
                    />
                    <input
                      placeholder="Страна"
                      value={variantForm.country}
                      onChange={(event) => setVariantForm({ ...variantForm, country: event.target.value })}
                    />
                    <button type="submit" disabled={loading}>
                      Добавить вариант
                    </button>
                  </form>
                </>
              ) : (
                <p className="muted">Сначала выберите или создайте товар.</p>
              )}
            </section>
          </section>
        </section>
      ) : null}

      {tab === "import" ? (
        <section className="single-panel">
          <form className="admin-form" onSubmit={handleImport}>
            <h2>Импорт Excel</h2>
            <label>
              Файл
              <input
                type="file"
                accept=".xlsx,.xlsm,.xltx,.xltm"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                required
              />
            </label>
            <label>
              Поставщик
              <select
                value={supplierId}
                onChange={(event) => setSupplierId(event.target.value)}
              >
                <option value="">Не выбран</option>
                {suppliers.map((supplier) => {
                  const name = formatSupplierName(supplier);
                  return (
                    <option key={supplier.id_s} value={supplier.id_s}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </label>
            <button type="submit" disabled={loading}>
              {loading ? "Импорт..." : "Загрузить"}
            </button>
          </form>
          {importReport ? (
            <div className="import-report">
              <p>Всего строк: {importReport.total_rows}</p>
              <p>Добавлено: {importReport.inserted}</p>
              <p>Обновлено: {importReport.updated}</p>
              <p>Пропущено: {importReport.skipped}</p>
              <p>Не добавлено без фото: {importReport.without_photos || 0}</p>
              <p>Фото добавлено: {importReport.photos_inserted || 0}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "suppliers" ? (
        <section className="single-panel suppliers-panel">
          <form className="admin-form" onSubmit={saveSupplier}>
            <h2>{editingSupplierId ? "Редактировать поставщика" : "Новый поставщик"}</h2>
            <label>
              Название
              <input
                value={supplierForm.first_name}
                onChange={(event) => setSupplierForm({ ...supplierForm, first_name: event.target.value })}
                required
              />
            </label>
            <label>
              Доп. название
              <input
                value={supplierForm.last_name}
                onChange={(event) => setSupplierForm({ ...supplierForm, last_name: event.target.value })}
              />
            </label>
            <button type="submit" disabled={loading}>
              Сохранить
            </button>
          </form>
          <div className="supplier-list">
            {suppliers.map((supplier) => (
              <div key={supplier.id_s} className="supplier-row">
                <span>{formatSupplierName(supplier)}</span>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSupplierId(supplier.id_s);
                      setSupplierForm({
                        first_name: supplier.first_name || "",
                        last_name: supplier.last_name || ""
                      });
                    }}
                  >
                    Изменить
                  </button>
                  <button type="button" className="danger" onClick={() => removeSupplier(supplier.id_s)}>
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "questions" ? (
        <section className="single-panel questions-panel">
          <div className="panel-head">
            <h2>Вопросы</h2>
            <button type="button" onClick={() => loadQuestions()} disabled={loading}>
              Обновить
            </button>
          </div>
          <div className="questions-list">
            {questions.map((question) => (
              <article key={question.id} className="question-card">
                <div className="question-card-head">
                  <div>
                    <strong>{question.name}</strong>
                    <a href={`mailto:${question.email}`}>{question.email}</a>
                  </div>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => removeQuestion(question.id)}
                    disabled={loading}
                  >
                    Удалить
                  </button>
                </div>
                <p>{question.question}</p>
              </article>
            ))}
            {!questions.length ? <p className="muted">Вопросов пока нет.</p> : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function PhotoRow({ photo, onSave, onDelete, disabled }) {
  const [file, setFile] = useState(photo.file || "");

  useEffect(() => {
    setFile(photo.file || "");
  }, [photo.file]);

  return (
    <div className="photo-row">
      <input
        value={file}
        onChange={(event) => setFile(event.target.value)}
        placeholder="URL фото"
      />
      <button
        type="button"
        onClick={() => onSave(photo.id_photo, file)}
        disabled={disabled || !file.trim()}
      >
        Сохранить
      </button>
      <button
        type="button"
        className="danger"
        onClick={() => onDelete(photo.id_photo)}
        disabled={disabled}
      >
        Удалить
      </button>
    </div>
  );
}

function VariantRow({ token, variant, onSaved, onError }) {
  const [form, setForm] = useState({
    article: variant.article || "",
    price: variant.price || "",
    color: variant.color || "",
    size: variant.size || "",
    material: variant.material || "",
    country: variant.country || "",
    collection: variant.collection || ""
  });
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    onError("");
    try {
      await updateVariant(token, variant.id_pv, buildVariantPayload(form));
      await onSaved();
    } catch (err) {
      onError(String(err.message || err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Удалить вариант?")) return;
    setBusy(true);
    onError("");
    try {
      await deleteVariant(token, variant.id_pv);
      await onSaved();
    } catch (err) {
      onError(String(err.message || err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="variant-row">
      <input value={form.article} onChange={(event) => setForm({ ...form, article: event.target.value })} />
      <input
        type="number"
        min="0"
        step="0.01"
        value={form.price}
        onChange={(event) => setForm({ ...form, price: event.target.value })}
      />
      <input value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} />
      <input value={form.size} onChange={(event) => setForm({ ...form, size: event.target.value })} />
      <input value={form.material} onChange={(event) => setForm({ ...form, material: event.target.value })} />
      <input value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} />
      <button type="button" onClick={save} disabled={busy}>
        OK
      </button>
      <button type="button" className="danger" onClick={remove} disabled={busy}>
        X
      </button>
    </div>
  );
}
