const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

async function request(path, options = {}) {
  const { token, body, formData, ...rest } = options;
  const headers = new Headers(rest.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let payload = undefined;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers.set("Content-Type", "application/json");
    payload = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    body: payload
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const detail = isJson ? data?.detail || JSON.stringify(data) : data;
    throw new Error(detail || `HTTP ${response.status}`);
  }
  return data;
}

export async function fetchProducts() {
  return request("/products?limit=1000");
}

export async function loginAdmin(login, password) {
  return request("/auth/login", {
    method: "POST",
    body: { login, password }
  });
}

export async function fetchMe(token) {
  return request("/auth/me", {
    method: "GET",
    token
  });
}

export async function fetchSuppliers(token) {
  return request("/admin/suppliers", {
    method: "GET",
    token
  });
}

export async function importExcel(token, file, supplierName) {
  const formData = new FormData();
  formData.append("file", file);
  if (supplierName && supplierName.trim()) {
    formData.append("supplier_name", supplierName.trim());
  }
  return request("/admin/import/excel", {
    method: "POST",
    token,
    formData
  });
}
