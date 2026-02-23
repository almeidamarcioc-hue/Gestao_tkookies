import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, ShoppingCart, Package, ArrowRight, Users, BarChart3 } from 'lucide-react';

// Dados de exemplo que viriam da sua API
const dashboardData = {
  dailySales: 485.50,
  pendingOrders: 8,
  lowStockItems: 3,
  topProduct: "Cookie de Chocolate Belga",
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
    },
  },
};

const GlassCard = ({ children, className = '' }) => (
  <motion.div
    variants={itemVariants}
    className={`bg-surface backdrop-blur-xl border border-border-color rounded-xl shadow-soft ${className}`}
  >
    {children}
  </motion.div>
);

const StatCard = ({ icon, title, value, className = '' }) => (
  <GlassCard className={`p-6 flex flex-col justify-between ${className}`}>
    <div className="flex justify-between items-center">
      <h3 className="font-display text-secondary text-lg">{title}</h3>
      {icon}
    </div>
    <p className="font-display text-primary text-4xl font-bold mt-4">{value}</p>
  </GlassCard>
);

const HomePage = () => {
  return (
    <div className="min-h-screen bg-background text-primary p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="font-display text-4xl md:text-5xl font-extrabold text-primary">
          Dashboard
        </h1>
        <p className="text-secondary text-lg mt-1">Bem-vindo ao seu centro de controle, TKookies!</p>
      </header>

      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {/* Card de Boas-vindas - Ocupa 2 colunas no desktop */}
        <GlassCard className="md:col-span-2 p-8 flex flex-col justify-center">
          <h2 className="font-display text-3xl font-bold text-primary">
            Um ótimo dia para vender <span className="text-accent">cookies</span>!
          </h2>
          <p className="text-secondary mt-2 max-w-md">
            Aqui está um resumo rápido do seu negócio. Use os atalhos para gerenciar suas operações.
          </p>
          <button className="mt-6 bg-accent text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 w-fit hover:opacity-90 transition-opacity">
            Novo Pedido <ArrowRight size={20} />
          </button>
        </GlassCard>

        {/* Card de Vendas Diárias */}
        <StatCard
          icon={<DollarSign className="text-accent" size={28} />}
          title="Vendas Hoje"
          value={`R$ ${dashboardData.dailySales.toFixed(2).replace('.', ',')}`}
        />

        {/* Card de Pedidos Pendentes */}
        <StatCard
          icon={<ShoppingCart className="text-accent" size={28} />}
          title="Pedidos Pendentes"
          value={dashboardData.pendingOrders}
        />

        {/* Card de Estoque Baixo */}
        <StatCard
          icon={<Package className="text-accent" size={28} />}
          title="Estoque Baixo"
          value={dashboardData.lowStockItems}
        />

        {/* Card de Produto Destaque */}
        <GlassCard className="p-6">
          <h3 className="font-display text-secondary text-lg">Produto Mais Vendido</h3>
          <p className="font-display text-primary text-2xl font-bold mt-2">
            {dashboardData.topProduct}
          </p>
          <div className="mt-4 h-2 bg-accent/20 rounded-full">
            <div className="h-2 bg-accent rounded-full w-3/4"></div>
          </div>
        </GlassCard>

        {/* Card de Atalhos - Ocupa 2 colunas */}
        <GlassCard className="md:col-span-2 p-6">
          <h3 className="font-display text-secondary text-lg mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg hover:bg-white/20 transition-colors cursor-pointer">
              <Package size={24} className="mx-auto text-primary" />
              <span className="text-sm mt-2 block text-secondary font-medium">Produtos</span>
            </div>
            <div className="text-center p-4 rounded-lg hover:bg-white/20 transition-colors cursor-pointer">
              <Users size={24} className="mx-auto text-primary" />
              <span className="text-sm mt-2 block text-secondary font-medium">Clientes</span>
            </div>
            <div className="text-center p-4 rounded-lg hover:bg-white/20 transition-colors cursor-pointer">
              <BarChart3 size={24} className="mx-auto text-primary" />
              <span className="text-sm mt-2 block text-secondary font-medium">Relatórios</span>
            </div>
          </div>
        </GlassCard>

      </motion.main>

      <footer className="text-center mt-12 text-secondary">
        <p>&copy; {new Date().getFullYear()} Cookie ERP. Jeová Jireh.</p>
      </footer>
    </div>
  );
};

export default HomePage;

```

### Resultado Final

Com essas alterações, a página principal do seu ERP terá um visual limpo, luxuoso e moderno. O Bento Grid organiza as informações de forma clara, o efeito de vidro adiciona profundidade e as animações sutis tornam a experiência do usuário mais fluida e agradável.

Este é um excelente ponto de partida. A partir daqui, você pode conectar os dados do dashboard com sua API e criar as páginas para as "Ações Rápidas".

Espero que goste do novo design! Estou à disposição para quaisquer ajustes ou próximas etapas.

<!--
[PROMPT_SUGGESTION]Como posso conectar os dados da API do backend aos cards do novo dashboard?[/PROMPT_SUGGESTION]
[PROMPT_SUGGESTION]Crie um componente de formulário com o mesmo estilo de glassmorphism para adicionar um novo produto.[/PROMPT_SUGGESTION]
-->