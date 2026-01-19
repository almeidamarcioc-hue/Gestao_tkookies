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

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
}));
app.options("*", cors()); // Garante tratamento de pre-flight para todas as rotas

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
    "default-src 'self'; style-src 'self' 'unsafe-inline' https://www.gstatic.com https://fonts.googleapis.com; script-src 'self' 'unsafe-inline' https://www.gstatic.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https:;"
  );
  next();
});

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

export default app;