import { Router } from "express";
import { pool } from "../db/index.js";

const router = Router();

// LISTAR ESTOQUE DE PRODUTOS
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, nome, estoque, preco_venda FROM produtos ORDER BY nome ASC");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao listar estoque" });
  }
});

// RESERVAR ESTOQUE (Ao adicionar ao carrinho)
router.post("/reservar", async (req, res) => {
  const { produto_id, quantidade } = req.body;
  try {
    // Executa o update apenas se houver estoque disponível (operação atômica)
    const result = await pool.query(
      "UPDATE produtos SET estoque = estoque - $1 WHERE id = $2 AND estoque >= $1",
      [Number(quantidade), produto_id]
    );
    if (result.rowCount === 0) {
      return res.status(400).json({ error: "Estoque insuficiente para este produto." });
    }
    res.json({ message: "Estoque reservado com sucesso." });
  } catch (error) {
    res.status(500).json({ error: "Erro ao reservar estoque", details: error.message });
  }
});

// LIBERAR ESTOQUE (Ao remover do carrinho ou limpar)
router.post("/liberar", async (req, res) => {
  const { produto_id, quantidade } = req.body;
  try {
    await pool.query("UPDATE produtos SET estoque = estoque + $1 WHERE id = $2", [Number(quantidade), produto_id]);
    res.json({ message: "Estoque liberado." });
  } catch (error) {
    res.status(500).json({ error: "Erro ao liberar estoque", details: error.message });
  }
});

// LANÇAR ESTOQUE (SOMAR AO ATUAL)
router.post("/lancar", async (req, res) => {
  const { produto_id, quantidade } = req.body;
  
  if (!produto_id || !quantidade) {
    return res.status(400).json({ error: "Produto e quantidade são obrigatórios" });
  }

  try {
    await pool.query(
      "UPDATE produtos SET estoque = estoque + $1 WHERE id = $2",
      [Number(quantidade), produto_id]
    );
    res.json({ message: "Estoque atualizado com sucesso!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar estoque" });
  }
});

// REGISTRAR PRODUÇÃO (Baixa ingredientes e sobe estoque do produto)
router.post("/produzir", async (req, res) => {
  const { produto_id, quantidade } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Buscar dados do produto para cálculo
    const resProd = await client.query("SELECT rendimento, nome FROM produtos WHERE id = $1", [produto_id]);
    if (resProd.rows.length === 0) throw new Error("Produto não encontrado");
    const { rendimento, nome } = resProd.rows[0];
    const rendimentoBase = Number(rendimento) || 1;

    // 2. Buscar ingredientes da receita
    const resIng = await client.query("SELECT ingrediente_id, quantidade FROM produto_ingredientes WHERE produto_id = $1", [produto_id]);
    
    // 3. Baixar estoque dos ingredientes proporcionalmente
    for (const item of resIng.rows) {
      const qtdNecessaria = (Number(item.quantidade) / rendimentoBase) * Number(quantidade);
      await client.query("UPDATE ingredientes SET estoque_atual = estoque_atual - $1 WHERE id = $2", [qtdNecessaria, item.ingrediente_id]);
    }

    // 4. Subir estoque do produto final
    await client.query("UPDATE produtos SET estoque = estoque + $1 WHERE id = $2", [Number(quantidade), produto_id]);

    await client.query("COMMIT");
    res.json({ message: `Produção de ${quantidade} un. de ${nome} registrada com sucesso!` });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro na produção:", error);
    res.status(500).json({ error: "Erro ao registrar produção." });
  } finally {
    client.release();
  }
});

export default router;