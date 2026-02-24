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
      detalhes: itensCalculados
    });

  } catch (error) {
    console.error("Erro no relatório de dízimo:", error);
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
});

export default router;