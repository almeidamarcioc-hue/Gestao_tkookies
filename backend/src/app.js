import express from "express";
import cors from "cors";
import ingredientRoutes from "./routes/ingredients.js";
import productRoutes from "./routes/products.js";
import clientsRouter from "./routes/clients.js";
import ordersRouter from "./routes/orders.js";
import productionRouter from "./routes/production.js";
import combosRouter from "./routes/combos.js";
import inventoryRouter from "./routes/inventory.js";

const app = express();

app.use(cors());
app.use(express.json());

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

app.use("/ingredientes", ingredientRoutes);
app.use("/produtos", productRoutes);
app.use("/clientes", clientsRouter);
app.use("/pedidos", ordersRouter);
app.use("/producao", productionRouter);
app.use("/combos", combosRouter);
app.use("/estoque", inventoryRouter);

export default app;