import app from "./app.js";

// Inicia o servidor diretamente (Mais leve para Vercel/TiDB Quota)
const port = process.env.PORT || 3333;
app.listen(port, () => {
  console.log(`🚀 Backend rodando na porta ${port}`);
});