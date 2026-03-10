import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import SiteLayout from "./components/layout/SiteLayout";
import {
  fetchAdminProducts,
  fetchBrands,
  fetchMe,
  fetchProducts,
  fetchSuppliers,
  importExcel,
  loginAdmin
} from "./api";
import AboutPage from "./pages/AboutPage";
import AdminPage from "./pages/AdminPage";
import CatalogPage from "./pages/CatalogPage";
import ContactsPage from "./pages/ContactsPage";
import HomePage from "./pages/HomePage";
import ProductPage from "./pages/ProductPage";

const TOKEN_KEY = "db_magaz_admin_token";

export default function App() {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState("");

  const [adminProducts, setAdminProducts] = useState([]);
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
      const data = await fetchProducts({ limit: 1000 });
      setProducts(data);
    } catch (error) {
      setProductsError(String(error.message || error));
    } finally {
      setLoadingProducts(false);
    }
  }

  async function loadBrands() {
    try {
      const data = await fetchBrands();
      setBrands(data);
    } catch {
      setBrands([]);
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

  async function loadAdminProducts(currentToken) {
    if (!currentToken) {
      setAdminProducts([]);
      return;
    }
    try {
      const data = await fetchAdminProducts(currentToken);
      setAdminProducts(data);
    } catch {
      setAdminProducts([]);
    }
  }

  useEffect(() => {
    loadProducts();
    loadBrands();
  }, []);

  useEffect(() => {
    if (!token) {
      setMe(null);
      setSuppliers([]);
      setAdminProducts([]);
      return;
    }
    fetchMe(token)
      .then((user) => {
        setMe(user);
        loadSuppliers(token);
        loadAdminProducts(token);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken("");
        setMe(null);
        setSuppliers([]);
        setAdminProducts([]);
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
      await loadAdminProducts(token);
    } catch (error) {
      setImportError(String(error.message || error));
    } finally {
      setImportLoading(false);
    }
  }

  async function refreshSuppliers() {
    await loadSuppliers(token);
  }

  async function refreshAdminProducts() {
    await loadAdminProducts(token);
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SiteLayout />}>
            <Route path="/" element={<HomePage products={products} brands={brands} />} />
          <Route
            path="/catalog"
            element={
              <CatalogPage products={products} loading={loadingProducts} error={productsError} />
            }
          />
          <Route path="/catalog/:productId" element={<ProductPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route
            path="/admin"
            element={
              <AdminPage
                token={token}
                me={me}
                suppliers={suppliers}
                products={adminProducts}
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
                onSuppliersChange={refreshSuppliers}
                onProductsChange={refreshAdminProducts}
              />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
