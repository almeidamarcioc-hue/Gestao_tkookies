import { Router } from "express";
import { pool } from "../db/index.js";
import { hashPassword, verifyPassword } from "../middlewares/auth.js";

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
  const { razao_social, cpf_cnpj, nome_contato, telefone, cep, cidade, estado, login, senha } = req.body;
  
  try {
    const hashedSenha = senha ? await hashPassword(senha) : null;
    await pool.query(
      "INSERT INTO revendedores (razao_social, cpf_cnpj, nome_contato, telefone, cep, cidade, estado, login, senha) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [razao_social, cpf_cnpj, nome_contato, telefone, cep, cidade, estado, login, hashedSenha]
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
    const hashedSenha = senha ? await hashPassword(senha) : null;
    await pool.query(
      "UPDATE revendedores SET razao_social=$1, cpf_cnpj=$2, nome_contato=$3, telefone=$4, cep=$5, cidade=$6, estado=$7, login=$8, senha=COALESCE($9, senha) WHERE id=$10",
      [razao_social, cpf_cnpj, nome_contato, telefone, cep, cidade, estado, login, hashedSenha, id]
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
    await pool.query("DELETE FROM revendedores WHERE id = $1", [id]);
    res.json({ message: "Revendedor removido!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao remover revendedor" });
  }
});

export default router;