/**
 * utils/buildConsultaPayload.js
 * Monta o payload de /consulta a partir do estado de filtros do FilterForm.
 * Extraído como função pura (sem React) para poder ser testado diretamente.
 */
import { nomeBairro, partesBairro } from './bairroChave';

// null na tabela de distribuição = "sem meta" (pegar tudo disponível).
// Precisa virar `undefined` no payload (item sem `quantidade`), nunca 0 —
// Number(null) é 0, que significaria "não trazer nada".
function quantidadeItem(valor) {
  return valor === null || valor === undefined ? undefined : Number(valor) || 0;
}

export function buildConsultaPayload(filtros) {
  // distribuicao: calculada primeiro porque, quando presente, o backend
  // ignora o campo `bairros` do topo — e não faz sentido mandar esse campo,
  // já que ele soma bairros de todas as cidades e esbarra num limite (100)
  // pensado só para o modo sem distribuição, travando seleções grandes de
  // vários estados/cidades.
  const temCidade = filtros.cidades.length > 1;
  const temBairro = filtros.bairros.length > 1;
  // Distribuição por estado só entra em jogo quando não há distribuição por
  // cidade (cidade é mais específica e assume a cota) — mesma prioridade
  // usada na tela (ver FilterForm.jsx).
  const temUf = !temCidade && filtros.ufs.length > 1;

  const distribuicao = (() => {
    if (!temCidade && !temBairro && !temUf) return undefined;

    if (temCidade) {
      // Agrupar bairros por cidade (a cidade já está embutida na chave
      // "CIDADE::BAIRRO") e explodir em itens {cidade, bairros:[b], quantidade}.
      // Roda mesmo com 0 ou 1 bairro selecionado no total (não exige
      // temBairro) — cada cidade sem bairro próprio vira um item só por
      // cidade; senão um único bairro escolhido junto de várias cidades
      // era descartado silenciosamente (nem ia pro `distribuicao` nem pro
      // `bairros` do topo, que fica undefined quando há distribuicao).
      const grupos = {};
      filtros.cidades.forEach((c) => { grupos[c] = []; });
      filtros.bairros.forEach((chave) => {
        const { cidade: c } = partesBairro(chave);
        if (c && grupos[c]) grupos[c].push(chave);
      });
      const itens = [];
      filtros.cidades.forEach((cidade) => {
        const bairrosDaCidade = grupos[cidade] || [];
        if (bairrosDaCidade.length === 0) {
          // Cidade sem bairros selecionados: item só por cidade
          itens.push({ cidade, quantidade: quantidadeItem(filtros.distribuicaoCidades[cidade]) });
        } else {
          bairrosDaCidade.forEach((chave) => {
            itens.push({ cidade, bairros: [nomeBairro(chave)], quantidade: quantidadeItem(filtros.distribuicaoBairros[chave]) });
          });
        }
      });
      return itens.length ? itens : undefined;
    }

    if (temBairro) {
      // Só bairros (única cidade ou sem cidade selecionada), mais de um bairro
      return filtros.bairros.map((chave) => ({ bairro: nomeBairro(chave), quantidade: quantidadeItem(filtros.distribuicaoBairros[chave]) }));
    }

    // Só estados (sem distribuição de cidade nem de bairro ativa)
    return filtros.ufs.map((uf) => ({ uf, quantidade: quantidadeItem(filtros.distribuicaoUfs[uf]) }));
  })();

  return {
    ufs: filtros.ufs,
    cidades: filtros.cidades,
    bairros: distribuicao ? undefined : filtros.bairros.map(nomeBairro),
    alta_renda: filtros.altaRenda || undefined,
    genero: filtros.genero || undefined,
    idade_min: filtros.idadeMin,
    idade_max: filtros.idadeMax,
    email: filtros.email === 'obrigatorio' ? 'obrigatorio' : undefined,
    tipo_telefone: filtros.tipoTelefone !== 'ambos' ? filtros.tipoTelefone : undefined,
    ddds: filtros.ddds.length > 0 ? filtros.ddds : undefined,
    quantidade: filtros.quantidade,
    cbos: filtros.profissoes.length > 0 ? filtros.profissoes : undefined,
    exclusao_token: filtros.exclusaoCpfs?.token || undefined,
    // proporção de gênero: só envia quando o usuário pediu "distribuição
    // exata" explicitamente (por padrão pega o que houver de cada gênero)
    genero_distribuicao: (filtros.genero === '' && filtros.generoExato)
      ? filtros.generoDistribuicao : undefined,
    distribuicao,
  };
}
