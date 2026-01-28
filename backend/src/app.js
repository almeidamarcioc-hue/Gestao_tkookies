import express from "express";
import cors from "cors";
import { pool } from "./db/index.js";
import { initDatabase } from "./db/init.js";
import ingredientRoutes from "./routes/ingredients.js";
import productRoutes from "./routes/products.js";
import clientsRouter from "./routes/clients.js";
import ordersRouter from "./routes/orders.js";
import productionRouter from "./routes/production.js";
import combosRouter from "./routes/combos.js";
import inventoryRouter from "./routes/inventory.js";
import settingsRouter from "./routes/settings.js";
import financialRouter from "./routes/financial.js";

const app = express();

// Configuração CORS simplificada e robusta
app.use(cors({
  origin: "*", // Em produção, idealmente troque "*" pela URL do seu frontend (https://tkookies.vercel.app)
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
})); 
// Habilita Pre-Flight para todas as rotas explicitamente
app.options('*', cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware de Log para Debug
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Middleware de CSP para evitar erros de bloqueio no navegador
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; style-src 'self' 'unsafe-inline' https://www.gstatic.com https://fonts.googleapis.com; script-src 'self' 'unsafe-inline' https://www.gstatic.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: http:; connect-src 'self' https: http:;"
  );
  next();
});

// Rota para ignorar favicon requests e evitar poluir logs com 404
app.get('/favicon.ico', (req, res) => res.status(204).send());
app.get('/favicon.png', (req, res) => res.status(204).send());

// Health Check
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({ status: "error", database: "disconnected", error: error.message });
  }
});

// Rota raiz para verificar se a API está online
app.get("/", (req, res) => {
  console.log("Health check route hit via Vercel/Local");
  res.json({ message: "Backend Cookie ERP Online", timestamp: new Date() });
});

app.use("/ingredientes", ingredientRoutes);
app.use("/produtos", productRoutes);
app.use("/clientes", clientsRouter);
app.use("/pedidos", ordersRouter);
app.use("/producao", productionRouter);
app.use("/combos", combosRouter);
app.use("/estoque", inventoryRouter);
app.use("/configuracoes", settingsRouter);
app.use("/financeiro", financialRouter);

// Rota especial para criar tabelas na Vercel (Executar uma vez após deploy)
app.get("/api/migrate", async (req, res) => {
  try {
    console.log("Iniciando migração de banco de dados via HTTP...");
    await initDatabase();
    res.json({ status: "success", message: "Banco de dados inicializado/migrado com sucesso!" });
  } catch (error) {
    console.error("Falha na migração:", error);
    res.status(500).json({ error: "Falha na migração", details: error.message });
  }
});

// Middleware de Tratamento de Erros Global
app.use((err, req, res, next) => {
  console.error("Erro interno:", err);
  res.status(500).json({ error: "Erro interno do servidor", details: err.message });
});

// Handler para rotas não encontradas (404)
// Isso garante que se a rota não existir, o frontend receba um JSON com headers CORS
// ao invés de uma página HTML da Vercel que causaria erro de CORS.
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint não encontrado", path: req.path });
});

export default app;