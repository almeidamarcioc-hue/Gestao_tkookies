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
    res.status(500).json({ error: "Erro ao processar solicitação.", details: error.message });
  }
});

// ATUALIZAR REVENDEDOR
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { razao_social, cpf_cnpj, nome_contato, telefone, cep, cidade, estado, login, senha } = req.body;
  
  try {
    await pool.query(
      "UPDATE revendedores SET razao_social=?, cpf_cnpj=?, nome_contato=?, telefone=?, cep=?, cidade=?, estado=?, login=?, senha=? WHERE id=?",
      [razao_social, cpf_cnpj, nome_contato, telefone, cep, cidade, estado, login, senha, id]
    );
    res.json({ message: "Revendedor atualizado com sucesso!" });
  } catch (error) {
    console.error("Erro ao atualizar revendedor:", error);
    res.status(500).json({ error: "Erro ao atualizar revendedor", details: error.message });
  }
});

// DELETAR REVENDEDOR
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM revendedores WHERE id = ?", [id]);
    res.json({ message: "Revendedor removido!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao remover revendedor" });
  }
});

export default router;