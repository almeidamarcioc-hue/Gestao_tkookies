import axios from "axios";

// Obtém a URL da API das variáveis de ambiente (Vercel/Vite)
// No Vercel, defina VITE_API_URL nas configurações do projeto Frontend
let baseURL = import.meta.env.VITE_API_URL || "http://localhost:3333";

// Garante que a URL tenha protocolo (https por padrão se vier sem)
if (baseURL && !baseURL.startsWith("http") && !baseURL.startsWith("//")) {
  baseURL = `https://${baseURL}`;
}

// Remove barra no final se existir para evitar duplicações (ex: .com/ + /produtos)
if (baseURL.endsWith("/")) {
  baseURL = baseURL.slice(0, -1);
}

const api = axios.create({
  baseURL,
});

export default api;
