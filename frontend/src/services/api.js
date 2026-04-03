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
  // Se a resposta for bem-sucedida, apenas a retorna
  (response) => response,
  // Se ocorrer um erro...
  (error) => {
    // Verifica se o erro foi um timeout do cliente (a requisição demorou mais de 10s)
    // OU se foi um erro interno do servidor (status 500, 502, 503, etc.)
    const isTimeout = error.code === 'ECONNABORTED';
    const isServerError = error.response && error.response.status >= 500;

    if (isTimeout || isServerError) {
      console.error("Erro de API detectado:", error.message);

      // Log detalhado para debug na Vercel
      if (error.response && error.response.data) {
        console.error("🔥 Detalhes do erro no Backend:", error.response.data);
      }

      // REMOVIDO: Não forçar logout em erro 500 (erro de servidor/banco)
      // Isso permite que o usuário veja o erro e tente novamente sem perder a sessão
      // window.dispatchEvent(new CustomEvent('force-logout'));
    }

    // Rejeita a promise para que o erro possa ser tratado localmente se necessário
    return Promise.reject(error);
  }
);

export default api;
