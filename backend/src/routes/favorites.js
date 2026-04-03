import { Router } from "express";
import { pool } from "../db/index.js";

const router = Router();

// LISTAR FAVORITOS DO CLIENTE
router.get("/:clienteId", async (req, res) => {
  const { clienteId } = req.params;
  // Usuário só pode ver seus próprios favoritos (admin pode ver qualquer um)
  if (req.user.role !== 'admin' && req.user.id !== parseInt(clienteId)) {
    return res.status(403).json({ error: "Permissão negada" });
  }
  try {
    const result = await pool.query(`
      SELECT p.*, p.id as id, f.created_at as favoritado_em,
             pim.id as img_id,
             pim.imagem as img_conteudo,
             pim.eh_capa as img_eh_capa
      FROM favoritos f
      JOIN produtos p ON f.produto_id = p.id
      LEFT JOIN produto_imagens pim ON p.id = pim.produto_id
      WHERE f.cliente_id = $1
      ORDER BY f.created_at DESC
    `, [clienteId]);

    const favoritesMap = new Map();

    result.rows.forEach(row => {
      if (!favoritesMap.has(row.id)) {
        // Separa os dados da imagem dos dados do produto para limpar o objeto final
        const { img_id, img_conteudo, img_eh_capa, ...productData } = row;
        favoritesMap.set(row.id, {
          ...productData,
          imagens: []
        });
      }

      if (row.img_id) {
        favoritesMap.get(row.id).imagens.push({
          id: row.img_id,
          imagem: row.img_conteudo,
          eh_capa: row.img_eh_capa === 1 || row.img_eh_capa === true
        });
      }
    });

    res.json(Array.from(favoritesMap.values()));
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar favoritos" });
  }
});

// ADICIONAR FAVORITO
router.post("/", async (req, res) => {
  const { cliente_id, produto_id } = req.body;
  // Usuário só pode adicionar favoritos à sua própria lista
  if (req.user.role !== 'admin' && req.user.id !== parseInt(cliente_id)) {
    return res.status(403).json({ error: "Permissão negada" });
  }
  try {
    // Verifica se já existe antes de inserir (garante unicidade e evita erros)
    const check = await pool.query("SELECT id FROM favoritos WHERE cliente_id = $1 AND produto_id = $2", [cliente_id, produto_id]);

    if (check.rows.length === 0) {
      await pool.query("INSERT INTO favoritos (cliente_id, produto_id) VALUES ($1, $2)", [cliente_id, produto_id]);
    }
    res.json({ message: "Adicionado aos favoritos" });
  } catch (error) {
    console.error("Erro ao adicionar favorito:", error);
    res.status(500).json({ error: "Erro ao adicionar favorito" });
  }
});

// REMOVER FAVORITO
router.delete("/:clienteId/:produtoId", async (req, res) => {
  const { clienteId, produtoId } = req.params;
  // Usuário só pode remover favoritos da sua própria lista
  if (req.user.role !== 'admin' && req.user.id !== parseInt(clienteId)) {
    return res.status(403).json({ error: "Permissão negada" });
  }
  try {
    await pool.query("DELETE FROM favoritos WHERE cliente_id = $1 AND produto_id = $2", [clienteId, produtoId]);
    res.json({ message: "Removido dos favoritos" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao remover favorito" });
  }
});

export default router;
