import express from "express";
import cors from "cors";
import { initDatabase } from "./db/init.js";
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

// Inicia o banco de dados antes de subir o servidor
initDatabase().then(() => {
  app.use("/ingredientes", ingredientRoutes);
  app.use("/produtos", productRoutes);
  app.use("/clientes", clientsRouter);
  app.use("/pedidos", ordersRouter);
  app.use("/producao", productionRouter);
  app.use("/combos", combosRouter);
  app.use("/estoque", inventoryRouter);

  app.listen(3333, () => {
    console.log("🚀 Backend rodando em http://localhost:3333");
  });
}).catch(err => {
  console.error("Falha ao iniciar o servidor:", err);
});