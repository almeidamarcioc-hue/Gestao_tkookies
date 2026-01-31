import { Router } from "express";
import { pool } from "../db/index.js";

const router = Router();

// LISTAR REVENDEDORES
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM revendedores ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar revendedores" });
  }
});

// CADASTRAR REVENDEDOR
router.post("/", async (req, res) => {
  const { razao_social, cpf_cnpj, nome_contato, telefone, cep, cidade, estado } = req.body;
  
  try {
    await pool.query(
      "INSERT INTO revendedores (razao_social, cpf_cnpj, nome_contato, telefone, cep, cidade, estado) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [razao_social, cpf_cnpj, nome_contato, telefone, cep, cidade, estado]
    );
    res.status(201).json({ message: "Solicitação enviada com sucesso!" });
  } catch (error) {
    console.error("Erro ao cadastrar revendedor:", error);
    res.status(500).json({ error: "Erro ao processar solicitação." });
  }
});

export default router;