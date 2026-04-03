import { Router } from "express";
import { pool } from "../db/index.js";
import { authenticateToken, requireRole, hashPassword, verifyPassword } from "../middlewares/auth.js";
import jwt from 'jsonwebtoken';

const router = Router();

// LISTAR
router.get("/", authenticateToken, requireRole('admin'), async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const search = req.query.search || "";

  try {
    let query = "SELECT * FROM clientes";
    let countQuery = "SELECT COUNT(*) as total FROM clientes";
    let params = [];
    
    if (search) {
        query += " WHERE nome LIKE $1 OR telefone LIKE $1";
        countQuery += " WHERE nome LIKE $1 OR telefone LIKE $1";
        params.push(`%${search}%`);
    }

    query += " ORDER BY nome ASC LIMIT $" + (params.length + 1) + " OFFSET $" + (params.length + 2);
    
    const countRes = await pool.query(countQuery, params);
    const result = await pool.query(query, [...params, limit, offset]);
    
    res.json({
      data: result.rows,
      total: Number(countRes.rows[0].total),
      page,
      limit
    });
  } catch (error) {
    console.error("Erro ao listar clientes:", error);
    res.status(500).json({ error: "Erro ao listar clientes", details: error.message });
  }
});

// ITENS MAIS COMPRADOS
router.get("/:id/mais-comprados", authenticateToken, async (req, res) => {
  const { id } = req.params;
  if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
    return res.status(403).json({ error: "Permissão negada" });
  }
  try {
    const result = await pool.query(`
      SELECT p.id, p.nome, p.preco_venda, p.preco_revenda, p.eh_destaque, p.desconto_destaque, p.estoque, SUM(ip.quantidade) as total_comprado,
             (SELECT imagem FROM produto_imagens WHERE produto_id = p.id ORDER BY eh_capa DESC LIMIT 1) as imagem
      FROM itens_pedido ip
      JOIN pedidos ped ON ip.pedido_id = ped.id
      JOIN produtos p ON ip.produto_id = p.id
      WHERE ped.cliente_id = $1
      GROUP BY p.id, p.nome, p.preco_venda, p.preco_revenda, p.eh_destaque, p.desconto_destaque, p.estoque
      ORDER BY total_comprado DESC
      LIMIT 5
    `, [id]);
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao buscar mais comprados:", error);
    res.status(500).json({ error: "Erro ao buscar itens mais comprados", details: error.message });
  }
});

// CRIAR
router.post("/", async (req, res) => {
  const { nome, telefone, endereco, numero, complemento, bairro, cidade, login, senha, is_revendedor } = req.body;
  console.log("Criando cliente:", nome, "Login:", login);
  try {
    const hashedSenha = senha && senha.trim() ? await hashPassword(senha) : null;
    await pool.query(
      "INSERT INTO clientes (nome, telefone, endereco, numero, complemento, bairro, cidade, login, senha, is_revendedor, role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
      [
        nome, 
        telefone || null,
        endereco || null,
        numero || null,
        complemento || null,
        bairro || null,
        cidade || null,
        (login && login.trim()) ? login : null,
        hashedSenha,
        is_revendedor || false,
        'cliente'
      ]
    );
    res.status(201).json({ message: "Cliente criado!" });
  } catch (error) {
    console.error("Erro ao criar cliente:", error);
    if (error.code === 'ER_DUP_ENTRY' || (error.message && error.message.includes('Duplicate entry'))) {
      return res.status(409).json({ error: "Este login já está em uso. Escolha outro." });
    }
    res.status(500).json({ error: "Erro ao criar cliente", details: error.message });
  }
});

// LOGIN CLIENTE
router.post("/login", async (req, res) => {
  const { login, senha } = req.body;
  try {
    const result = await pool.query("SELECT * FROM clientes WHERE login = $1", [login]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const isBcrypt = user.senha && (user.senha.startsWith('$2b$') || user.senha.startsWith('$2a$'));
      let isValid = false;
      if (isBcrypt) {
        isValid = await verifyPassword(senha, user.senha);
      } else {
        // Senha em texto plano (legado) — compara diretamente e re-hasheia
        isValid = user.senha === senha;
        if (isValid) {
          const novaHash = await hashPassword(senha);
          await pool.query("UPDATE clientes SET senha = $1 WHERE id = $2", [novaHash, user.id]);
        }
      }
      if (isValid) {
        const token = jwt.sign({ id: user.id, role: user.role || 'cliente' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ ...user, token });
        return;
      }
    } else {
      // Se não achou em clientes, tenta em revendedores
      const resRev = await pool.query("SELECT * FROM revendedores WHERE login = $1", [login]);

      if (resRev.rows.length > 0) {
        const rev = resRev.rows[0];
        const isBcryptRev = rev.senha && (rev.senha.startsWith('$2b$') || rev.senha.startsWith('$2a$'));
        let isValid = false;
        if (isBcryptRev) {
          isValid = await verifyPassword(senha, rev.senha);
        } else {
          isValid = rev.senha === senha;
          if (isValid) {
            const novaHash = await hashPassword(senha);
            await pool.query("UPDATE revendedores SET senha = $1 WHERE id = $2", [novaHash, rev.id]);
          }
        }
        if (isValid) {
          const token = jwt.sign({ id: rev.id, role: 'revendedor' }, process.env.JWT_SECRET, { expiresIn: '1h' });
          // Retorna um objeto compatível com o frontend, forçando is_revendedor = true
          res.json({
            id: rev.id,
            nome: rev.razao_social, // Mapeia Razão Social para Nome
            telefone: rev.telefone,
            endereco: `CEP: ${rev.cep}`, // Endereço genérico
            cidade: rev.cidade,
            login: rev.login,
            is_revendedor: true, // Garante acesso à área de parceiro
            tipo_usuario: 'revendedor',
            token
          });
          return;
        }
      }
    }
    res.status(401).json({ error: "Credenciais inválidas" });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ error: "Erro no login", details: error.message });
  }
});

// LOGIN ADMIN
router.post("/admin/login", async (req, res) => {
  const { login, senha } = req.body;
  if (!process.env.ADMIN_LOGIN || !process.env.ADMIN_SENHA) {
    return res.status(500).json({ error: 'Configuração de admin ausente no servidor' });
  }
  if (login === process.env.ADMIN_LOGIN && senha === process.env.ADMIN_SENHA) {
    const token = jwt.sign({ id: 0, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, role: 'admin' });
  } else {
    res.status(401).json({ error: "Credenciais inválidas" });
  }
});

// PEDIDOS DO CLIENTE
router.get("/:id/pedidos", authenticateToken, async (req, res) => {
  const { id } = req.params;
  if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
    return res.status(403).json({ error: "Permissão negada" });
  }
  try {
    const result = await pool.query("SELECT * FROM pedidos WHERE cliente_id = $1 ORDER BY created_at DESC", [id]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar pedidos do cliente", details: error.message });
  }
});

// ATUALIZAR
router.put("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
    return res.status(403).json({ error: "Permissão negada" });
  }
  const { nome, telefone, endereco, numero, complemento, bairro, cidade, senha, senha_atual, is_revendedor } = req.body;
  console.log("Atualizando cliente:", id);
  try {
    if (senha && senha.trim() !== "") {
      // Validar senha atual
      if (!senha_atual) {
          return res.status(400).json({ error: "Senha atual é obrigatória para alterar a senha." });
      }
      const userRes = await pool.query("SELECT senha FROM clientes WHERE id = $1", [id]);
      if (userRes.rows.length === 0) return res.status(404).json({ error: "Cliente não encontrado" });
      
      const isValid = await verifyPassword(senha_atual, userRes.rows[0].senha);
      if (!isValid) {
          return res.status(401).json({ error: "Senha atual incorreta." });
      }

      const hashedSenha = await hashPassword(senha);
      await pool.query(
        "UPDATE clientes SET nome = $1, telefone = $2, endereco = $3, numero = $4, complemento = $5, bairro = $6, cidade = $7, senha = $8, is_revendedor = $9 WHERE id = $10",
        [nome, telefone, endereco, numero, complemento, bairro, cidade, hashedSenha, is_revendedor || false, id]
      );
    } else {
      await pool.query(
        "UPDATE clientes SET nome = $1, telefone = $2, endereco = $3, numero = $4, complemento = $5, bairro = $6, cidade = $7, is_revendedor = $8 WHERE id = $9",
        [nome, telefone, endereco, numero, complemento, bairro, cidade, is_revendedor || false, id]
      );
    }
    res.json({ message: "Cliente atualizado!" });
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error);
    res.status(500).json({ error: "Erro ao atualizar cliente", details: error.message });
  }
});

// DELETAR
router.delete("/:id", authenticateToken, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM clientes WHERE id = $1", [id]);
    res.json({ message: "Cliente removido!" });
  } catch (error) {
    console.error("Erro ao remover cliente:", error);
    res.status(500).json({ error: "Erro ao remover cliente", details: error.message });
  }
});

export default router;