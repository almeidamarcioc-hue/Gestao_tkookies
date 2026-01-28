import express from "express";
import cors from "cors";
import { pool } from "./db/index.js";
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

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "X-CSRF-Token"]
}));

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

// Middleware de Tratamento de Erros Global
app.use((err, req, res, next) => {
  console.error("Erro interno:", err);
  res.status(500).json({ error: "Erro interno do servidor", details: err.message });
});

export default app;