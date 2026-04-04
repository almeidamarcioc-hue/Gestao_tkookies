import { Router } from "express";
import { pool } from "../db/index.js";
import { authenticateToken, requireRole } from "../middlewares/auth.js";

const router = Router();

/**
 * @route GET /api/relatorios/usuarios
 * @desc Retorna lista de usuários cadastrados para o relatório administrativo
 */
router.get("/usuarios", authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    // Busca dados de acesso. Note que 'password' nunca deve ser retornado no SELECT.
    const result = await pool.query("SELECT id, nome, email, role, created_at FROM usuarios ORDER BY nome ASC");
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao buscar relatório de usuários:", error);
    res.status(500).json({ error: "Erro ao carregar dados dos usuários" });
  }
});

export default router;