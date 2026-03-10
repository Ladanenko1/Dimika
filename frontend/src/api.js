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

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers,
      body: payload
    });
  } catch (error) {
    throw new Error("Не удалось подключиться к API. Проверьте, что backend запущен на http://127.0.0.1:8000");
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status >= 500) {
      throw new Error("Ошибка API. Проверьте backend и подключение к базе данных.");
    }
    const detail = isJson ? data?.detail || JSON.stringify(data) : data;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }

  return data;
}

export async function fetchProducts(params = {}) {
  const search = new URLSearchParams();
  if (params.category) search.set("category", params.category);
  if (params.product_type) search.set("product_type", params.product_type);
  if (params.brand) search.set("brand", params.brand);
  if (params.search) search.set("search", params.search);
  if (params.limit) search.set("limit", String(params.limit));
  if (params.offset) search.set("offset", String(params.offset));
  const query = search.toString();
  return request(`/products${query ? `?${query}` : ""}`);
}

export async function fetchBrands() {
  return request("/products/brands");
}

export async function fetchProduct(productId) {
  return request(`/products/${productId}`);
}

export async function submitFeedback(body) {
  return request("/feedback", {
    method: "POST",
    body
  });
}

export async function fetchQuestions(token) {
  return request("/admin/questions", { method: "GET", token });
}

export async function deleteQuestion(token, questionId) {
  return request(`/admin/questions/${questionId}`, {
    method: "DELETE",
    token
  });
}

export async function loginAdmin(login, password) {
  return request("/auth/login", {
    method: "POST",
    body: { login, password }
  });
}

export async function fetchMe(token) {
  return request("/auth/me", { method: "GET", token });
}

export async function fetchSuppliers(token) {
  return request("/admin/suppliers", { method: "GET", token });
}

export async function createSupplier(token, body) {
  return request("/admin/suppliers", { method: "POST", token, body });
}

export async function updateSupplier(token, supplierId, body) {
  return request(`/admin/suppliers/${supplierId}`, {
    method: "PUT",
    token,
    body
  });
}

export async function deleteSupplier(token, supplierId) {
  return request(`/admin/suppliers/${supplierId}`, {
    method: "DELETE",
    token
  });
}

export async function fetchAdminProducts(token) {
  return request("/admin/products", { method: "GET", token });
}

export async function createProduct(token, body) {
  return request("/admin/products", { method: "POST", token, body });
}

export async function updateProduct(token, productId, body) {
  return request(`/admin/products/${productId}`, {
    method: "PUT",
    token,
    body
  });
}

export async function deleteProduct(token, productId) {
  return request(`/admin/products/${productId}`, {
    method: "DELETE",
    token
  });
}

export async function createPhoto(token, productId, body) {
  return request(`/admin/products/${productId}/photos`, {
    method: "POST",
    token,
    body
  });
}

export async function updatePhoto(token, photoId, body) {
  return request(`/admin/photos/${photoId}`, {
    method: "PUT",
    token,
    body
  });
}

export async function deletePhoto(token, photoId) {
  return request(`/admin/photos/${photoId}`, {
    method: "DELETE",
    token
  });
}

export async function createVariant(token, productId, body) {
  return request(`/admin/products/${productId}/variants`, {
    method: "POST",
    token,
    body
  });
}

export async function updateVariant(token, variantId, body) {
  return request(`/admin/variants/${variantId}`, {
    method: "PUT",
    token,
    body
  });
}

export async function deleteVariant(token, variantId) {
  return request(`/admin/variants/${variantId}`, {
    method: "DELETE",
    token
  });
}

export async function importExcel(token, file, supplier = "") {
  const formData = new FormData();
  formData.append("file", file);
  if (typeof supplier === "object" && supplier !== null) {
    if (supplier.supplierId) {
      formData.append("supplier_id", String(supplier.supplierId));
    } else if (supplier.supplierName && supplier.supplierName.trim()) {
      formData.append("supplier_name", supplier.supplierName.trim());
    }
  } else if (supplier && String(supplier).trim()) {
    formData.append("supplier_name", String(supplier).trim());
  }
  return request("/admin/import/excel", {
    method: "POST",
    token,
    formData
  });
}
