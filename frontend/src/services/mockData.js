/**
 * services/mockData.js
 * Dados falsos para validar a interface sem precisar da API.
 * Ativo quando VITE_MOCK_MODE=true no .env
 */

export const IS_MOCK = import.meta.env.VITE_MOCK_MODE === 'true';

/* ── Auth ──────────────────────────────────────────────────── */
export const MOCK_USUARIO = {
  username: '1',
  nome: 'Operador Teste',
  role: 'user',
};

/* ── Localidades ───────────────────────────────────────────── */
export const MOCK_CIDADES = {
  SP: ['SAO PAULO', 'CAMPINAS', 'SOROCABA', 'RIBEIRAO PRETO', 'SAO JOSE DOS CAMPOS', 'SANTOS'],
  RJ: ['RIO DE JANEIRO', 'NITEROI', 'NOVA IGUACU', 'DUQUE DE CAXIAS'],
  MG: ['BELO HORIZONTE', 'UBERLANDIA', 'CONTAGEM', 'JUIZ DE FORA'],
  RS: ['PORTO ALEGRE', 'CAXIAS DO SUL', 'PELOTAS', 'CANOAS'],
  PR: ['CURITIBA', 'LONDRINA', 'MARINGA', 'PONTA GROSSA'],
  SC: ['FLORIANOPOLIS', 'JOINVILLE', 'BLUMENAU', 'SAO JOSE'],
  BA: ['SALVADOR', 'FEIRA DE SANTANA', 'VITORIA DA CONQUISTA'],
  CE: ['FORTALEZA', 'CAUCAIA', 'JUAZEIRO DO NORTE'],
};

export const MOCK_BAIRROS = {
  'SAO PAULO': ['VILA OLIMPIA', 'ITAIM BIBI', 'MOEMA', 'JARDINS', 'PINHEIROS', 'BROOKLIN', 'CAMPO BELO'],
  'CAMPINAS': ['CAMBUÍ', 'TAQUARAL', 'NOVA CAMPINAS', 'CENTRO'],
  'RIO DE JANEIRO': ['COPACABANA', 'IPANEMA', 'LEBLON', 'BARRA DA TIJUCA', 'TIJUCA'],
  'BELO HORIZONTE': ['SAVASSI', 'FUNCIONARIOS', 'LOURDES', 'CENTRO', 'BURITIS'],
  'CURITIBA': ['BATEL', 'AGUA VERDE', 'BIGORRILHO', 'CENTRO CIVICO', 'CENTRO'],
};

/* ── Consulta ──────────────────────────────────────────────── */
export function mockContagem(filtros) {
  // Validação de dados financeiros
  if (filtros.tipo_lista === 'venda') {
    if (!filtros.nome_cliente || !filtros.valor_lista) {
      throw new Error('Dados financeiros incompletos: nome_cliente e valor_lista são obrigatórios para venda.');
    }
    if (filtros.parcelado && !filtros.num_parcelas) {
      throw new Error('Número de parcelas obrigatório quando parcelado é true.');
    }
  }

  const hasDistr = filtros.distribuicao?.length > 0;

  if (hasDistr) {
    const chave = filtros.distribuicao[0].cidade ? 'cidade' : 'bairro';
    // Fatores simulam cidades com disponibilidade variável (algumas abaixo do pedido)
    const fatores = [0.95, 1.10, 0.45, 0.82, 1.30, 0.60, 1.05, 0.70];
    const por_item = filtros.distribuicao.map((item, i) => {
      const nome = item[chave];
      const solicitado = item.quantidade;
      const disponivel = Math.round(solicitado * fatores[i % fatores.length]);
      return { [chave]: nome, solicitado, disponivel, suficiente: disponivel >= solicitado };
    });
    const total_disponivel = por_item.reduce((acc, it) => acc + it.disponivel, 0);
    const total_solicitado = por_item.reduce((acc, it) => acc + it.solicitado, 0);
    return {
      total_banco: Math.round(total_disponivel * 1.8),
      total_estimado: total_disponivel,
      total_final: Math.min(total_disponivel, total_solicitado),
      por_item,
      filtros_aplicados: filtros,
    };
  }

  const base = filtros.ufs?.length > 1 ? 180000 : 45000;
  const taxa = filtros.tipo_telefone === 'movel' ? 0.68 : filtros.tipo_telefone === 'fixo' ? 0.28 : 0.82;
  const total_disponivel = Math.round(base * taxa);
  const quantidade_pedida = filtros.quantidade ?? 5000;
  return {
    total_banco: base,
    total_disponivel,
    suficiente: total_disponivel >= quantidade_pedida,
    quantidade_pedida,
    resultado_token: `mock-${Date.now()}`,
    filtros_aplicados: filtros,
  };
}

export function mockGerarLista(_payload) {
  return { download_iniciado: true };
}
