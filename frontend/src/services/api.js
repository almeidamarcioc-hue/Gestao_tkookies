import axios from "axios";

let baseURL = import.meta.env.VITE_API_URL || "http://localhost:3333";

if (baseURL && !baseURL.startsWith("http") && !baseURL.startsWith("//")) {
  baseURL = `https://${baseURL}`;
}

const api = axios.create({
  baseURL,
});

export default api;
