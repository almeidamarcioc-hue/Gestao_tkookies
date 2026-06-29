import { Router } from "express";
import { pool } from "../db/index.js";
import { authenticateToken, requireRole } from "../middlewares/auth.js";

const router = Router();

// GET /cupons — lista todos (admin)
router.get("/", authenticateToken, requireRole("admin"), async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM cupons ORDER BY created_at DESC"
  );
  res.json(rows);
});

// POST /cupons — cria cupom (admin)
router.post("/", authenticateToken, requireRole("admin"), async (req, res) => {
  const { codigo, tipo, valor, ativo = true, validade, valor_minimo = 0, uso_maximo } = req.body;
  if (!codigo || !tipo || valor == null)
    return res.status(400).json({ error: "codigo, tipo e valor são obrigatórios." });

  const { rows } = await pool.query(
    `INSERT INTO cupons (codigo, tipo, valor, ativo, validade, valor_minimo, uso_maximo)
     VALUES (UPPER($1), $2, $3, $4, $5, $6, $7) RETURNING *`,
    [codigo.trim(), tipo, Number(valor), ativo, validade || null, Number(valor_minimo) || 0, uso_maximo || null]
  );
  res.status(201).json(rows[0]);
});

// PUT /cupons/:id — atualiza (admin)
router.put("/:id", authenticateToken, requireRole("admin"), async (req, res) => {
  const { codigo, tipo, valor, ativo, validade, valor_minimo, uso_maximo } = req.body;
  const { rows } = await pool.query(
    `UPDATE cupons SET codigo=UPPER($1), tipo=$2, valor=$3, ativo=$4, validade=$5, valor_minimo=$6, uso_maximo=$7
     WHERE id=$8 RETURNING *`,
    [codigo.trim(), tipo, Number(valor), ativo, validade || null, Number(valor_minimo) || 0, uso_maximo || null, req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: "Cupom não encontrado." });
  res.json(rows[0]);
});

// DELETE /cupons/:id — remove (admin)
router.delete("/:id", authenticateToken, requireRole("admin"), async (req, res) => {
  await pool.query("DELETE FROM cupons WHERE id=$1", [req.params.id]);
  res.json({ message: "Cupom removido." });
});

// POST /cupons/validar — valida e retorna desconto (público para clientes logados)
router.post("/validar", authenticateToken, async (req, res) => {
  const { codigo, total } = req.body;
  if (!codigo) return res.status(400).json({ error: "Informe o código do cupom." });

  const { rows } = await pool.query(
    "SELECT * FROM cupons WHERE codigo=UPPER($1)",
    [codigo.trim()]
  );
  if (rows.length === 0) return res.status(404).json({ error: "Cupom não encontrado." });

  const cupom = rows[0];
  if (!cupom.ativo) return res.status(400).json({ error: "Este cupom não está ativo." });

  if (cupom.validade && new Date(cupom.validade) < new Date(new Date().toDateString()))
    return res.status(400).json({ error: "Este cupom está expirado." });

  if (cupom.uso_maximo != null && cupom.usos_realizados >= cupom.uso_maximo)
    return res.status(400).json({ error: "Este cupom atingiu o limite de usos." });

  const totalNum = Number(total) || 0;
  if (cupom.valor_minimo > 0 && totalNum < Number(cupom.valor_minimo))
    return res.status(400).json({
      error: `Pedido mínimo de R$ ${Number(cupom.valor_minimo).toFixed(2)} para usar este cupom.`
    });

  const desconto =
    cupom.tipo === "percentual"
      ? parseFloat((totalNum * Number(cupom.valor) / 100).toFixed(2))
      : Math.min(parseFloat(Number(cupom.valor).toFixed(2)), totalNum);

  res.json({ cupom, desconto });
});

export default router;
