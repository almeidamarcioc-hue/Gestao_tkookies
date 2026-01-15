export function calcularCustoUnitario(custo, estoque) {
  if (!estoque || estoque === 0) return "—";
  return (custo / estoque).toFixed(4);
}

export function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export function formatarNumero(valor, casasDecimais = 2) {
  return Number(valor).toFixed(casasDecimais);
}
