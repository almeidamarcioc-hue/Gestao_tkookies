import { Router } from "express";
import { pool } from "../db/index.js";

const router = Router();

// RELATÓRIO DE DÍZIMO (Vendas - Custos = Lucro -> 10%)
router.get("/dizimo", async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: "Data inicial e final são obrigatórias" });
  }

  try {
    // Busca itens vendidos no período (excluindo cancelados)
    // Calcula o custo unitário atual baseado nos ingredientes do produto
    
    // Verifica se já existe pagamento registrado para este período
    const descricaoDizimo = `Dízimo Período: ${startDate} a ${endDate}`;
    const checkPagamento = await pool.query(
      "SELECT id FROM lancamentos_financeiros WHERE descricao = $1 AND tipo = 'Saída'",
      [descricaoDizimo]
    );
    const isPago = checkPagamento.rows.length > 0;

    const query = `
      SELECT 
        p.id,
        p.nome,
        p.rendimento,
        ped.tipo_cliente,
        SUM(ip.quantidade) as qtd_vendida,
        SUM(ip.valor_total) as total_venda,
        -- Custo da receita para consumidor final (não inclui ingredientes 'apenas_revenda')
        COALESCE((
          SELECT SUM(pi.quantidade * (i.custo / NULLIF(i.estoque, 0)))
          FROM produto_ingredientes pi
          JOIN ingredientes i ON pi.ingrediente_id = i.id
          WHERE pi.produto_id = p.id AND pi.apenas_revenda = FALSE
        ), 0) as custo_receita_consumidor,
        -- Custo da receita para revendedor (considera ingredientes de revenda)
        COALESCE((
          SELECT SUM(pi.quantidade * (i.custo / NULLIF(i.estoque, 0)))
          FROM produto_ingredientes pi
          JOIN ingredientes i ON pi.ingrediente_id = i.id
          WHERE pi.produto_id = p.id AND (i.usado_para_revenda = TRUE OR pi.apenas_revenda = TRUE)
        ), 0) as custo_receita_revendedor
      FROM itens_pedido ip
      JOIN pedidos ped ON ip.pedido_id = ped.id
      JOIN produtos p ON ip.produto_id = p.id
      WHERE ped.status != 'Cancelado'
        AND DATE(ped.data_pedido) BETWEEN DATE($1) AND DATE($2)
      GROUP BY p.id, p.nome, p.rendimento, ped.tipo_cliente
      ORDER BY p.nome, ped.tipo_cliente
    `;

    const result = await pool.query(query, [startDate, endDate]);

    let totalVendas = 0;
    let totalCusto = 0;

    const itensCalculados = result.rows.map(item => {
      const venda = Number(item.total_venda);
      const rendimento = Number(item.rendimento) || 1;
      
      let custoReceita;
      if (item.tipo_cliente === 'revendedor') {
        custoReceita = Number(item.custo_receita_revendedor);
      } else { // 'consumidor' ou nulo
        custoReceita = Number(item.custo_receita_consumidor);
      }
      
      // Custo unitário = Custo da Receita / Rendimento
      const custoUnit = custoReceita / rendimento;
      const qtd = Number(item.qtd_vendida);
      const custoTotal = custoUnit * qtd;
      const lucro = venda - custoTotal;

      totalVendas += venda;
      totalCusto += custoTotal;

      return {
        ...item,
        nome_display: `${item.nome} (${item.tipo_cliente || 'consumidor'})`,
        total_venda: venda,
        custo_total: custoTotal,
        lucro: lucro
      };
    });

    const lucroTotal = totalVendas - totalCusto;
    const dizimo = lucroTotal > 0 ? lucroTotal * 0.10 : 0;

    res.json({
      periodo: { start: startDate, end: endDate },
      resumo: {
        total_vendas: totalVendas,
        total_custo: totalCusto,
        lucro_operacional: lucroTotal,
        valor_dizimo: dizimo
      },
      pago: isPago,
      detalhes: itensCalculados
    });

  } catch (error) {
    console.error("Erro no relatório de dízimo:", error);
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
});

// REGISTRAR PAGAMENTO DÍZIMO
router.post("/dizimo/pagar", async (req, res) => {
  const { startDate, endDate, valor } = req.body;
  
  if (!startDate || !endDate || !valor) {
    return res.status(400).json({ error: "Dados incompletos" });
  }

  const descricao = `Dízimo Período: ${startDate} a ${endDate}`;

  try {
    // Verifica duplicidade antes de inserir
    const check = await pool.query("SELECT id FROM lancamentos_financeiros WHERE descricao = $1", [descricao]);
    if (check.rows.length > 0) {
       return res.status(400).json({ error: "Pagamento já registrado para este período." });
    }

    await pool.query(
      "INSERT INTO lancamentos_financeiros (tipo, descricao, valor, data_vencimento, status) VALUES ($1, $2, $3, CURRENT_DATE, $4)",
      ['Saída', descricao, valor, 'Pago']
    );

    res.json({ message: "Pagamento registrado no financeiro!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao registrar pagamento" });
  }
});

// TOP 10 CLIENTES QUE MAIS COMPRAM
router.get("/top-clientes", async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: "Datas obrigatórias" });
  try {
    const result = await pool.query(`
      SELECT id, nome, telefone, tipo, total_pedidos, total_gasto FROM (
        SELECT c.id, c.nome, c.telefone, 'Consumidor' as tipo,
          COUNT(p.id)::int AS total_pedidos,
          COALESCE(SUM(p.valor_total), 0) AS total_gasto
        FROM clientes c
        JOIN pedidos p ON p.cliente_id = c.id
          AND (p.tipo_cliente IS NULL OR p.tipo_cliente != 'revendedor')
          AND p.status != 'Cancelado'
          AND DATE(p.data_pedido) BETWEEN DATE($1) AND DATE($2)
        GROUP BY c.id, c.nome, c.telefone
        UNION ALL
        SELECT r.id, COALESCE(r.razao_social, r.nome_contato) as nome, r.telefone, 'Revendedor' as tipo,
          COUNT(p.id)::int AS total_pedidos,
          COALESCE(SUM(p.valor_total), 0) AS total_gasto
        FROM revendedores r
        JOIN pedidos p ON p.cliente_id = r.id
          AND p.tipo_cliente = 'revendedor'
          AND p.status != 'Cancelado'
          AND DATE(p.data_pedido) BETWEEN DATE($1) AND DATE($2)
        GROUP BY r.id, r.razao_social, r.nome_contato, r.telefone
      ) combined
      ORDER BY total_gasto DESC
      LIMIT 10
    `, [startDate, endDate]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao gerar relatório de top clientes" });
  }
});

// CLIENTES QUE MENOS COMPRAM
router.get("/clientes-inativos", async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: "Datas obrigatórias" });
  try {
    const result = await pool.query(`
      SELECT id, nome, telefone, tipo, total_pedidos, total_gasto, ultima_compra FROM (
        SELECT c.id, c.nome, c.telefone, 'Consumidor' as tipo,
          COUNT(p.id)::int AS total_pedidos,
          COALESCE(SUM(p.valor_total), 0) AS total_gasto,
          (SELECT MAX(pp.data_pedido) FROM pedidos pp
           WHERE pp.cliente_id = c.id AND pp.status != 'Cancelado'
           AND (pp.tipo_cliente IS NULL OR pp.tipo_cliente != 'revendedor')) as ultima_compra
        FROM clientes c
        LEFT JOIN pedidos p ON p.cliente_id = c.id
          AND (p.tipo_cliente IS NULL OR p.tipo_cliente != 'revendedor')
          AND p.status != 'Cancelado'
          AND DATE(p.data_pedido) BETWEEN DATE($1) AND DATE($2)
        GROUP BY c.id, c.nome, c.telefone
        UNION ALL
        SELECT r.id, COALESCE(r.razao_social, r.nome_contato) as nome, r.telefone, 'Revendedor' as tipo,
          COUNT(p.id)::int AS total_pedidos,
          COALESCE(SUM(p.valor_total), 0) AS total_gasto,
          (SELECT MAX(pp.data_pedido) FROM pedidos pp
           WHERE pp.cliente_id = r.id AND pp.status != 'Cancelado'
           AND pp.tipo_cliente = 'revendedor') as ultima_compra
        FROM revendedores r
        LEFT JOIN pedidos p ON p.cliente_id = r.id
          AND p.tipo_cliente = 'revendedor'
          AND p.status != 'Cancelado'
          AND DATE(p.data_pedido) BETWEEN DATE($1) AND DATE($2)
        GROUP BY r.id, r.razao_social, r.nome_contato, r.telefone
      ) combined
      ORDER BY total_pedidos ASC, total_gasto ASC
      LIMIT 10
    `, [startDate, endDate]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao gerar relatório de clientes inativos" });
  }
});

// PRODUTOS QUE MENOS SAEM
router.get("/produtos-parados", async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: "Datas obrigatórias" });
  try {
    const result = await pool.query(`
      SELECT
        p.id, p.nome,
        COALESCE(v.total_vendido, 0)::int AS total_vendido,
        COALESCE(v.receita_total, 0) AS receita_total,
        p.estoque AS estoque_atual,
        (SELECT MAX(ped2.data_pedido) FROM itens_pedido ip2
         JOIN pedidos ped2 ON ip2.pedido_id = ped2.id
         WHERE ip2.produto_id = p.id AND ped2.status != 'Cancelado') as ultima_venda
      FROM produtos p
      LEFT JOIN (
        SELECT ip.produto_id,
          SUM(ip.quantidade) AS total_vendido,
          SUM(ip.valor_total) AS receita_total
        FROM itens_pedido ip
        JOIN pedidos ped ON ip.pedido_id = ped.id
          AND ped.status != 'Cancelado'
          AND DATE(ped.data_pedido) BETWEEN DATE($1) AND DATE($2)
        GROUP BY ip.produto_id
      ) v ON p.id = v.produto_id
      WHERE p.ativo = TRUE
      ORDER BY total_vendido ASC
      LIMIT 10
    `, [startDate, endDate]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao gerar relatório de produtos parados" });
  }
});

// RELATÓRIO DE PRODUTOS MAIS VENDIDOS
router.get("/top-produtos", async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: "Data inicial e final são obrigatórias" });
  }

  try {
    const query = `
      SELECT
        p.id, p.nome,
        COALESCE(v.total_vendido, 0)::int as total_vendido,
        COALESCE(v.receita_total, 0) as receita_total,
        p.estoque as estoque_atual,
        p.preco_venda
      FROM produtos p
      LEFT JOIN (
        SELECT ip.produto_id,
          SUM(ip.quantidade) AS total_vendido,
          SUM(ip.valor_total) AS receita_total
        FROM itens_pedido ip
        JOIN pedidos ped ON ip.pedido_id = ped.id
          AND ped.status != 'Cancelado'
          AND DATE(ped.data_pedido) BETWEEN DATE($1) AND DATE($2)
        GROUP BY ip.produto_id
      ) v ON p.id = v.produto_id
      WHERE p.ativo = TRUE
      ORDER BY total_vendido DESC
    `;

    const result = await pool.query(query, [startDate, endDate]);
    res.json(result.rows);
  } catch (error) {
    console.error("Erro no relatório de top produtos:", error);
    res.status(500).json({ error: "Erro ao gerar relatório de produtos" });
  }
});

export default router;