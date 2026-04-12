// Versão do sistema — atualizar a cada release antes do merge para main
export const APP_VERSION = "1.00.01";

// Histórico de versões
export const CHANGELOG = [
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
