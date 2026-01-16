import { Router } from "express";
import { pool } from "../db/index.js";

const router = Router();

// LISTAR
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM clientes ORDER BY nome ASC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar clientes" });
  }
});

// CRIAR
router.post("/", async (req, res) => {
  const { nome, telefone, endereco, numero, complemento, bairro, cidade, login, senha } = req.body;
  console.log("Criando cliente:", nome);
  try {
    await pool.query(
      "INSERT INTO clientes (nome, telefone, endereco, numero, complemento, bairro, cidade, login, senha) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [nome, telefone, endereco, numero, complemento, bairro, cidade, login || null, senha || null]
    );
    res.status(201).json({ message: "Cliente criado!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar cliente" });
  }
});

// LOGIN CLIENTE
router.post("/login", async (req, res) => {
  const { login, senha } = req.body;
  try {
    const result = await pool.query("SELECT * FROM clientes WHERE login = $1 AND senha = $2", [login, senha]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(401).json({ error: "Credenciais inválidas" });
    }
  } catch (error) {
    res.status(500).json({ error: "Erro no login" });
  }
});

// PEDIDOS DO CLIENTE
router.get("/:id/pedidos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM pedidos WHERE cliente_id = $1 ORDER BY created_at DESC", [req.params.id]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar cliente" });
  }
});

// ATUALIZAR
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, telefone, endereco, numero, complemento, bairro, cidade, senha } = req.body;
  console.log("Atualizando cliente:", id);
  try {
    if (senha && senha.trim() !== "") {
      await pool.query(
        "UPDATE clientes SET nome = $1, telefone = $2, endereco = $3, numero = $4, complemento = $5, bairro = $6, cidade = $7, senha = $8 WHERE id = $9",
        [nome, telefone, endereco, numero, complemento, bairro, cidade, senha, id]
      );
    } else {
      await pool.query(
        "UPDATE clientes SET nome = $1, telefone = $2, endereco = $3, numero = $4, complemento = $5, bairro = $6, cidade = $7 WHERE id = $8",
        [nome, telefone, endereco, numero, complemento, bairro, cidade, id]
      );
    }
    res.json({ message: "Cliente atualizado!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar cliente" });
  }
});

// DELETAR
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM clientes WHERE id = $1", [id]);
    res.json({ message: "Cliente removido!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao remover cliente" });
  }
});

export default router;