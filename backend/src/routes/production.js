import { Router } from "express";
import { pool } from "../db/index.js";

const router = Router();

// Rota básica para produção (placeholder)
router.get("/", async (req, res) => {
  try {
    res.json({ message: "Módulo de produção ativo" });
  } catch (error) {
    res.status(500).json({ error: "Erro no módulo de produção" });
  }
});

export default router;