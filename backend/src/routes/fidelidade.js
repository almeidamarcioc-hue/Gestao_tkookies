import { Router } from "express";
import { pool } from "../db/index.js";
import { authenticateToken } from "../middlewares/auth.js";

const router = Router();

// GET /fidelidade/:clienteId — saldo e histórico
router.get("/:clienteId", authenticateToken, async (req, res) => {
  const { clienteId } = req.params;
  if (req.user.role !== 'admin' && req.user.id !== parseInt(clienteId)) {
    return res.status(403).json({ error: "Permissão negada" });
  }
  try {
    const result = await pool.query(
      "SELECT * FROM pontos_fidelidade WHERE cliente_id = $1 ORDER BY created_at DESC",
      [clienteId]
    );
    const saldo = result.rows.reduce((acc, r) => {
      return r.tipo === 'credito' ? acc + r.pontos : acc - r.pontos;
    }, 0);
    res.json({ saldo: Math.max(0, saldo), historico: result.rows });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar pontos", details: error.message });
  }
});

// POST /fidelidade/resgatar — debita pontos e retorna valor de desconto
router.post("/resgatar", authenticateToken, async (req, res) => {
  const { cliente_id, pontos } = req.body;
  if (req.user.role !== 'admin' && req.user.id !== parseInt(cliente_id)) {
    return res.status(403).json({ error: "Permissão negada" });
  }
  try {
    // Calcula saldo atual
    const result = await pool.query(
      "SELECT tipo, pontos FROM pontos_fidelidade WHERE cliente_id = $1",
      [cliente_id]
    );
    const saldo = result.rows.reduce((acc, r) => {
      return r.tipo === 'credito' ? acc + r.pontos : acc - r.pontos;
    }, 0);

    if (saldo < pontos) {
      return res.status(400).json({ error: "Pontos insuficientes" });
    }

    // Busca configuração de conversão (100 pontos = R$1 por padrão)
    const cfgRes = await pool.query(
      "SELECT valor FROM configuracoes WHERE chave = 'pontos_para_desconto'"
    );
    const pontosPorReal = cfgRes.rows[0] ? Number(cfgRes.rows[0].valor) : 100;
    const desconto = pontos / pontosPorReal;

    await pool.query(
      "INSERT INTO pontos_fidelidade (cliente_id, pontos, tipo, descricao) VALUES ($1, $2, 'debito', 'Resgate de pontos')",
      [cliente_id, pontos]
    );

    res.json({ desconto: parseFloat(desconto.toFixed(2)), pontos_usados: pontos });
  } catch (error) {
    res.status(500).json({ error: "Erro ao resgatar pontos", details: error.message });
  }
});

export default router;
