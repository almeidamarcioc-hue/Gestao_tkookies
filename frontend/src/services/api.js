import axios from "axios";

// Obtém a URL da API das variáveis de ambiente (Vercel/Vite)
// No Vercel, defina VITE_API_URL nas configurações do projeto Frontend
let baseURL = import.meta.env.VITE_API_URL;

if (!baseURL) {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    baseURL = "http://localhost:3333";
  } else {
    baseURL = "/api";
  }
}

// Garante que a URL tenha protocolo apenas se não for relativa
if (baseURL && !baseURL.startsWith("/") && !baseURL.startsWith("http") && !baseURL.startsWith("//")) {
  baseURL = `https://${baseURL}`;
}

// Remove barra no final se existir para evitar duplicações (ex: .com/ + /produtos)
if (baseURL.endsWith("/")) {
  baseURL = baseURL.slice(0, -1);
}

console.log("🔌 API Base URL:", baseURL);

const api = axios.create({
  baseURL,
  timeout: 20000, // Timeout aumentado para suportar cold starts do serverless
});

// Interceptor para adicionar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("cookie_erp_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para tratar erros de forma global
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // Sessão expirada ou token inválido — solicita novo login
    if (status === 401) {
      const isLoginRoute = error.config?.url?.includes('/login');
      if (!isLoginRoute) {
        localStorage.removeItem("cookie_erp_token");
        localStorage.removeItem("cookie_erp_admin");
        localStorage.removeItem("cookie_erp_client");
        window.dispatchEvent(new CustomEvent('session-expired'));
      }
    }

    if (error.code === 'ECONNABORTED' || status >= 500) {
      console.error("Erro de API detectado:", error.message);
      if (error.response?.data) {
        console.error("🔥 Detalhes do erro no Backend:", error.response.data);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
