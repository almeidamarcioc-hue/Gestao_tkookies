import app from "./app.js";
import { initDatabase } from "./db/init.js";

// Inicia o banco de dados antes de subir o servidor
initDatabase().then(() => {
  const port = process.env.PORT || 3333;
  app.listen(port, () => {
    console.log(`🚀 Backend rodando na porta ${port}`);
  });
}).catch(err => {
  console.error("Falha ao iniciar o servidor:", err);
});