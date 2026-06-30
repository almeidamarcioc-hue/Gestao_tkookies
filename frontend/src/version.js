// Versão do sistema — atualizar a cada release antes do merge para main

export const APP_VERSION = "1.00.07";

// Histórico de versões
export const CHANGELOG = [
  {
    version: "1.00.07",
    data: "2026-06-29",
    descricao: "Cupons de desconto, badge nos destaques e correções de impressão e fidelidade",
    itens: [
      "Configurações: nova seção Cupons de Desconto — criar cupons por percentual ou valor fixo, com pedido mínimo, validade e limite de usos",
      "Carrinho: cliente aplica código de cupom e vê o desconto aplicado (combinável com pontos de fidelidade)",
      "Home: badge 'X% off' agora também aparece sobre a imagem dos produtos em destaque",
      "Impressão e detalhes do pedido: distingue 'Desc. Cupom' (com o código) de 'Desc. Fidelidade', mostrando ambas quando usadas juntas",
      "Correção: desconto de cupom não debita mais pontos de fidelidade do cliente — apenas a parcela de pontos consome saldo",
      "Correção: página definida como pt-BR e sem tradução automática, evitando o travamento do app causado pelo Google Translate",
    ],
  },
  {
    version: "1.00.06",
    data: "2026-06-24",
    descricao: "Promoções em lote, prospecção via Receita Federal e correções na inteligência de vendas",
    itens: [
      "Configurações: nova seção Promoções — aplicar/remover desconto em lote com preview de preço riscado e badge X% off",
      "Desconto independente do status Destaque — badge aparece para qualquer produto com desconto_destaque > 0",
      "Inteligência de vendas: cálculo de receitas corrigido (CEIL aplicado ao total semanal, não por dia)",
      "Inteligência de vendas: coluna Domingo adicionada ao cabeçalho do Passo 1",
      "Prospecção de revendedores: fonte trocada de OpenStreetMap para Receita Federal (open.cnpja.com) — traz CNPJ, cidade e telefone reais",
      "Prospecção: cache de 6h no banco para evitar bloqueios de rate limit",
    ],
  },
  {
    version: "1.00.05",
    data: "2026-06-14",
    descricao: "Correções de UI, ordenação de pedidos e melhorias na inteligência de vendas",
    itens: [
      "Header: slim bar e navbar agrupados em wrapper sticky — logo não é mais cortada ao rolar",
      "Pedidos: ordenação por data do pedido (descendente) ao invés de ID",
      "Inteligência de vendas: navegação por blocos com sugestão de preços promocionais",
      "Inteligência de vendas: janela de análise corrigida para 90 dias",
    ],
  },
  {
    version: "1.00.04",
    data: "2026-04-18",
    descricao: "Melhorias na home e login mobile",
    itens: [
      "Home: remove opção 'Todos' da seção Presenteie com Amor",
      "Mobile: login abre diretamente ao tocar em Perfil ou Favoritos",
      "Mobile: drawer de login com z-index e largura responsiva corrigidos",
    ],
  },
  {
    version: "1.00.03",
    data: "2026-04-18",
    descricao: "Produção de combos, desconto de kit no carrinho e melhorias na tela de kit",
    itens: [
      "Combos: campo 'Quantidade a produzir' com preview de consumo de estoque",
      "Combos: criação/edição debita estoque dos produtos e define estoque do combo",
      "Kit: seção sempre visível quando há produtos com estoque disponível",
      "Kit: quantidade disponível exibida em cada card de produto",
      "Kit: desconto aplicado corretamente no carrinho (preço riscado + label 'Desconto Kit')",
    ],
  },
  {
    version: "1.00.02",
    data: "2026-04-15",
    descricao: "Redesign da home, correção de horários de atendimento e melhorias de performance",
    itens: [
      "Home: layout full-width com grid de 3 colunas (inspirado em Crumbl/Levain)",
      "Home: barra de status da loja (aberto/fechado) visível em todos os dispositivos",
      "Configurações: correção do salvamento de horários de atendimento por dia",
      "Configurações: grade de horários sempre exibe os 7 dias da semana",
      "Carrinho: correção do temporizador de 30min de reserva de estoque",
      "Performance: índices criados no banco para reduzir consumo de recursos",
      "Performance: cache de 10min na inteligência de vendas",
      "Backend: remoção do cache em memória de configurações (incompatível com serverless)",
    ],
  },
  {
    version: "1.00.01",
    data: "2026-04-12",
    descricao: "Brindes por quantidade, pontos de fidelidade corrigidos, melhorias no painel de cozinha e perfil do cliente",
    itens: [
      "Sistema de brindes por quantidade (por unidade ou por pedido)",
      "Ícone de brinde e estoque nos cards de ocasião",
      "Desconto de fidelidade exibido na impressão do pedido",
      "Painel de cozinha: visualizar e imprimir pedido",
      "Perfil do cliente: estoque visível em Comprar Novamente, brindes não repetidos",
      "Débito de pontos ao usar desconto de fidelidade no pedido",
      "Correção CORS e setup do ambiente de homologação dedicado",
    ],
  },
  {
    version: "1.00.00",
    data: "2026-04-01",
    descricao: "Versão inicial em produção",
    itens: [
      "Gestão de produtos, ingredientes e combos",
      "Pedidos com carrinho e temporizador de 30min",
      "Painel de cozinha (KDS)",
      "Clientes e revendedores",
      "Financeiro e relatórios",
      "Programa de fidelidade",
      "Analytics com GA4",
    ],
  },
];
