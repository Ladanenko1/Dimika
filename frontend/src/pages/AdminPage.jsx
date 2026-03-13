import { useMemo, useState } from "react";

import {
  createProduct,
  createSupplier,
  deleteProduct,
  deleteSupplier,
  updateProduct,
  updateSupplier
} from "../api";
import { formatSupplierName } from "../utils/product";

const TABS = [
  { id: "import", label: "Импорт Excel" },
  { id: "suppliers", label: "Поставщики" },
  { id: "products", label: "Товары" }
];

const EMPTY_SUPPLIER = { first_name: "", last_name: "" };
const EMPTY_PRODUCT = {
  name: "",
  discription: "",
  brand: "",
  type: "",
  category: "",
  supplier_id: ""
};

export default function AdminPage({
  token,
  me,
  suppliers,
  products,
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
  onImport,
  onSuppliersChange,
  onProductsChange
}) {
  const [tab, setTab] = useState("import");

  if (!token) {
    return (
      <section className="section admin-section">
        <div className="section-head">
          <h1>Админ-панель</h1>
        </div>
        <form className="stack admin-form" onSubmit={onSignIn}>
          <label>
            Логин
            <input type="text" value={login} onChange={onLoginChange} required autoComplete="username" />
          </label>
          <label>
            Пароль
            <input
              type="password"
              value={password}
              onChange={onPasswordChange}
              required
              autoComplete="current-password"
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={authLoading}>
            {authLoading ? "Вход..." : "Войти"}
          </button>
          {authError ? <p className="error">{authError}</p> : null}
        </form>
      </section>
    );
  }

  return (
    <section className="section admin-section">
      <div className="section-head">
        <h1>Админ-панель</h1>
        <div className="admin-head-actions">
          <p className="muted">
            {me?.login || "admin"}
          </p>
          <button type="button" className="btn btn-outline" onClick={onLogout}>
            Выйти
          </button>
        </div>
      </div>

      <div className="admin-tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? "active" : ""}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "import" ? (
        <ImportTab
          file={file}
          supplierName={supplierName}
          suppliers={suppliers}
          importLoading={importLoading}
          importError={importError}
          importReport={importReport}
          onFileChange={onFileChange}
          onSupplierNameChange={onSupplierNameChange}
          onImport={onImport}
        />
      ) : null}

      {tab === "suppliers" ? (
        <SuppliersTab token={token} suppliers={suppliers} onChange={onSuppliersChange} />
      ) : null}

      {tab === "products" ? (
        <ProductsTab
          token={token}
          products={products}
          suppliers={suppliers}
          onChange={onProductsChange}
        />
      ) : null}
    </section>
  );
}

function ImportTab({
  file,
  supplierName,
  suppliers,
  importLoading,
  importError,
  importReport,
  onFileChange,
  onSupplierNameChange,
  onImport
}) {
  const supplierNames = useMemo(
    () => suppliers.map(formatSupplierName).filter(Boolean),
    [suppliers]
  );

  return (
    <div className="stack admin-panel">
      <p className="muted">
        Загрузите Excel-прайс поставщика. Варианты и фото создаются автоматически при импорте.
      </p>
      <form className="stack" onSubmit={onImport}>
        <label>
          Excel файл
          <input
            type="file"
            accept=".xlsx,.xlsm,.xltx,.xltm"
            onChange={onFileChange}
            required
          />
        </label>
        <label>
          Поставщик (по названию)
          <select
            value={supplierName}
            onChange={onSupplierNameChange}
          >
            <option value="">Не выбран</option>
            {supplierNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={importLoading}>
          {importLoading ? "Импорт..." : "Загрузить в БД"}
        </button>
      </form>
      {importError ? <p className="error">{importError}</p> : null}
      {importReport ? <ImportReport report={importReport} /> : null}
      {!file ? <p className="muted">Выберите файл .xlsx для загрузки.</p> : null}
    </div>
  );
}

function ImportReport({ report }) {
  return (
    <div className="report">
      <h3>Результат импорта</h3>
      {report.supplier_name ? (
        <p>
          Поставщик: {report.supplier_name} (id: {report.supplier_id})
        </p>
      ) : null}
      <p>Всего строк: {report.total_rows}</p>
      <p>Добавлено: {report.inserted}</p>
      <p>Обновлено: {report.updated}</p>
      <p>Пропущено: {report.skipped}</p>
      <p>Не добавлено без фото: {report.without_photos || 0}</p>
      <p>Фото добавлено: {report.photos_inserted || 0}</p>
      {report.parse_errors?.length ? (
        <details>
          <summary>Ошибки разбора ({report.parse_errors.length})</summary>
          <ul>
            {report.parse_errors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      ) : null}
      {report.import_errors?.length ? (
        <details>
          <summary>Ошибки импорта ({report.import_errors.length})</summary>
          <ul>
            {report.import_errors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function SuppliersTab({ token, suppliers, onChange }) {
  const [form, setForm] = useState(EMPTY_SUPPLIER);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function startEdit(supplier) {
    setEditingId(supplier.id_s);
    setForm({ first_name: supplier.first_name, last_name: supplier.last_name || "" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_SUPPLIER);
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (editingId) {
        await updateSupplier(token, editingId, form);
      } else {
        await createSupplier(token, form);
      }
      await onChange();
      resetForm();
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(supplierId) {
    if (!window.confirm("Внимание! При удалении поставщика удалятся все его товары. Продолжить?")) return;
    setError("");
    try {
      await deleteSupplier(token, supplierId);
      await onChange();
      if (editingId === supplierId) resetForm();
    } catch (err) {
      setError(String(err.message || err));
    }
  }

  return (
    <div className="admin-panel admin-split">
      <form className="stack admin-form" onSubmit={handleSubmit}>
        <h2>{editingId ? "Редактировать поставщика" : "Новый поставщик"}</h2>
        <label>
          Имя / название
          <input
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            required
          />
        </label>
        <label>
          Фамилия / доп. название
          <input
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          />
        </label>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Сохранение..." : editingId ? "Сохранить" : "Добавить"}
          </button>
          {editingId ? (
            <button type="button" className="btn btn-outline" onClick={resetForm}>
              Отмена
            </button>
          ) : null}
        </div>
        {error ? <p className="error">{error}</p> : null}
      </form>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Название</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier) => (
              <tr key={supplier.id_s}>
                <td>{supplier.id_s}</td>
                <td>{formatSupplierName(supplier)}</td>
                <td className="table-actions">
                  <button type="button" className="btn-link" onClick={() => startEdit(supplier)}>
                    Изменить
                  </button>
                  <button
                    type="button"
                    className="btn-link danger"
                    onClick={() => handleDelete(supplier.id_s)}
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductsTab({ token, products, suppliers, onChange }) {
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function startEdit(product) {
    setEditingId(product.id_products);
    setForm({
      name: product.name || "",
      discription: product.discription || "",
      brand: product.brand || "",
      type: product.type || "",
      category: product.category || "",
      supplier_id: product.supplier_id ? String(product.supplier_id) : ""
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_PRODUCT);
    setError("");
  }

  function buildPayload() {
    const payload = {
      name: form.name.trim(),
      discription: form.discription.trim() || null,
      brand: form.brand.trim() || null,
      type: form.type.trim() || null,
      category: form.category.trim() || null,
      supplier_id: form.supplier_id ? Number(form.supplier_id) : null
    };
    if (!editingId) {
      payload.variants = [];
    }
    return payload;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (editingId) {
        await updateProduct(token, editingId, buildPayload());
      } else {
        await createProduct(token, buildPayload());
      }
      await onChange();
      resetForm();
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(productId) {
    if (!window.confirm("Удалить товар и все его варианты?")) return;
    setError("");
    try {
      await deleteProduct(token, productId);
      await onChange();
      if (editingId === productId) resetForm();
    } catch (err) {
      setError(String(err.message || err));
    }
  }

  return (
    <div className="admin-panel admin-split">
      <form className="stack admin-form" onSubmit={handleSubmit}>
        <h2>{editingId ? "Редактировать товар" : "Новый товар"}</h2>
        <p className="muted small">
          Варианты добавляются через импорт Excel. Здесь редактируются только поля карточки.
        </p>
        <label>
          Название
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label>
          Описание
          <textarea
            rows={3}
            value={form.discription}
            onChange={(e) => setForm({ ...form, discription: e.target.value })}
          />
        </label>
        <label>
          Бренд
          <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
        </label>
        <label>
          Категория
          <input
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
        </label>
        <label>
          Тип
          <input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
        </label>
        <label>
          Поставщик
          <select
            value={form.supplier_id}
            onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
          >
            <option value="">Не выбран</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id_s} value={supplier.id_s}>
                {formatSupplierName(supplier)}
              </option>
            ))}
          </select>
        </label>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Сохранение..." : editingId ? "Сохранить" : "Добавить"}
          </button>
          {editingId ? (
            <button type="button" className="btn btn-outline" onClick={resetForm}>
              Отмена
            </button>
          ) : null}
        </div>
        {error ? <p className="error">{error}</p> : null}
      </form>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Название</th>
              <th>Бренд</th>
              <th>Категория</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id_products}>
                <td>{product.id_products}</td>
                <td>{product.name}</td>
                <td>{product.brand || "—"}</td>
                <td>{product.category || "—"}</td>
                <td className="table-actions">
                  <button type="button" className="btn-link" onClick={() => startEdit(product)}>
                    Изменить
                  </button>
                  <button
                    type="button"
                    className="btn-link danger"
                    onClick={() => handleDelete(product.id_products)}
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
