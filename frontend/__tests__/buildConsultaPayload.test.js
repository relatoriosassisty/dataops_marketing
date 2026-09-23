import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

let server;
after(async () => { await server?.close(); });

async function loadBuilder() {
  server ??= await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const { buildConsultaPayload } = await server.ssrLoadModule('/src/utils/buildConsultaPayload.js');
  const { chaveBairro } = await server.ssrLoadModule('/src/utils/bairroChave.js');
  return { buildConsultaPayload, chaveBairro };
}

const BASE = {
  ufs: [], cidades: [], bairros: [], altaRenda: false,
  genero: '', idadeMin: 18, idadeMax: 70, email: 'nao_filtrar',
  tipoTelefone: 'ambos', ddds: [], quantidade: 5000, profissoes: [],
  distribuicaoUfs: {}, distribuicaoCidades: {}, distribuicaoBairros: {},
  generoExato: false, generoDistribuicao: { M: 50, F: 50 }, exclusaoCpfs: null,
};

test('lista complexa: muitos estados, cidades e bairros com nomes repetidos entre cidades', async () => {
  const { buildConsultaPayload, chaveBairro } = await loadBuilder();
  const cidades = ['SAO PAULO', 'SALVADOR', 'FORTALEZA', 'RECIFE', 'PORTO ALEGRE'];
  // "CENTRO" existe em todas — cada seleção deve ficar isolada por cidade.
  const bairros = cidades.flatMap((c) => [chaveBairro(c, 'CENTRO'), chaveBairro(c, 'JARDIM')]);
  const filtros = {
    ...BASE,
    ufs: ['SP', 'BA', 'CE', 'PE', 'RS'],
    cidades,
    bairros,
    quantidade: 5000,
    distribuicaoBairros: Object.fromEntries(bairros.map((b) => [b, 500])),
  };

  const payload = buildConsultaPayload(filtros);

  // Não deve mais mandar o campo `bairros` do topo (evita o limite de 100
  // que travava seleções grandes de vários estados/cidades).
  assert.equal(payload.bairros, undefined);

  assert.equal(payload.distribuicao.length, 10); // 5 cidades x 2 bairros
  const porCidade = {};
  payload.distribuicao.forEach((item) => {
    porCidade[item.cidade] ??= [];
    porCidade[item.cidade].push(item.bairros[0]);
  });
  cidades.forEach((c) => {
    assert.deepEqual(new Set(porCidade[c]), new Set(['CENTRO', 'JARDIM']),
      `cidade ${c} deveria ter CENTRO e JARDIM, sem misturar com outras cidades`);
  });
});

test('cidade sem bairro selecionado vira item só por cidade dentro de uma seleção maior', async () => {
  const { buildConsultaPayload, chaveBairro } = await loadBuilder();
  const filtros = {
    ...BASE,
    ufs: ['SP', 'BA', 'CE'],
    cidades: ['SAO PAULO', 'SALVADOR', 'FORTALEZA'],
    bairros: [chaveBairro('SAO PAULO', 'MOEMA'), chaveBairro('SALVADOR', 'PITUBA')],
    distribuicaoCidades: { FORTALEZA: 1000 },
    distribuicaoBairros: { [chaveBairro('SAO PAULO', 'MOEMA')]: 2000, [chaveBairro('SALVADOR', 'PITUBA')]: 2000 },
  };

  const payload = buildConsultaPayload(filtros);
  const porCidade = Object.fromEntries(payload.distribuicao.map((i) => [i.cidade, i]));

  assert.deepEqual(porCidade['SAO PAULO'].bairros, ['MOEMA']);
  assert.deepEqual(porCidade['SALVADOR'].bairros, ['PITUBA']);
  assert.equal(porCidade['FORTALEZA'].bairros, undefined);
  assert.equal(porCidade['FORTALEZA'].quantidade, 1000);
});

test('várias cidades com um único bairro no total não descarta o bairro', async () => {
  // Bug: temBairro exigia >1 bairro; com só 1 selecionado junto de várias
  // cidades, o bairro sumia (nem ia pro distribuicao nem pro topo).
  const { buildConsultaPayload, chaveBairro } = await loadBuilder();
  const filtros = {
    ...BASE,
    ufs: ['SP', 'BA'],
    cidades: ['SAO PAULO', 'SALVADOR'],
    bairros: [chaveBairro('SAO PAULO', 'MOEMA')],
    distribuicaoCidades: { SALVADOR: 3000 },
    distribuicaoBairros: { [chaveBairro('SAO PAULO', 'MOEMA')]: 2000 },
  };

  const payload = buildConsultaPayload(filtros);
  assert.ok(payload.distribuicao, 'deveria gerar distribuicao');
  const sp = payload.distribuicao.find((i) => i.cidade === 'SAO PAULO');
  assert.deepEqual(sp.bairros, ['MOEMA']);
  assert.equal(sp.quantidade, 2000);
});

test('só bairros (uma cidade), muitos bairros: soma correta e sem campo `bairros` redundante junto de distribuicao', async () => {
  const { buildConsultaPayload, chaveBairro } = await loadBuilder();
  const nomes = Array.from({ length: 30 }, (_, i) => `BAIRRO_${i}`);
  const bairros = nomes.map((b) => chaveBairro('CURITIBA', b));
  const filtros = {
    ...BASE,
    ufs: ['PR'],
    cidades: ['CURITIBA'],
    bairros,
    quantidade: 3000,
    distribuicaoBairros: Object.fromEntries(bairros.map((b) => [b, 100])),
  };

  const payload = buildConsultaPayload(filtros);
  assert.equal(payload.cidades.length, 1);
  assert.equal(payload.bairros, undefined);
  assert.equal(payload.distribuicao.length, 30);
  assert.ok(payload.distribuicao.every((i) => i.bairro && !i.bairro.includes('::')));
  const soma = payload.distribuicao.reduce((acc, i) => acc + i.quantidade, 0);
  assert.equal(soma, 3000);
});

test('muitos estados sem nenhum bairro selecionado: distribuicao só por cidade, sem erro', async () => {
  const { buildConsultaPayload } = await loadBuilder();
  const ufs = ['SP', 'RJ', 'MG', 'BA', 'PR', 'RS', 'SC', 'CE', 'PE', 'DF'];
  const cidades = ['SAO PAULO', 'RIO DE JANEIRO', 'BELO HORIZONTE', 'SALVADOR', 'CURITIBA',
    'PORTO ALEGRE', 'FLORIANOPOLIS', 'FORTALEZA', 'RECIFE', 'BRASILIA'];
  const filtros = {
    ...BASE,
    ufs,
    cidades,
    quantidade: 10000,
    distribuicaoCidades: Object.fromEntries(cidades.map((c) => [c, 1000])),
  };

  const payload = buildConsultaPayload(filtros);
  assert.equal(payload.bairros, undefined);
  assert.equal(payload.distribuicao.length, 10);
  assert.equal(payload.distribuicao.reduce((acc, i) => acc + i.quantidade, 0), 10000);
});

test('sem distribuicao (1 cidade, poucos bairros): campo `bairros` do topo continua sendo enviado', async () => {
  const { buildConsultaPayload, chaveBairro } = await loadBuilder();
  const filtros = {
    ...BASE,
    ufs: ['SP'],
    cidades: ['SAO PAULO'],
    bairros: [chaveBairro('SAO PAULO', 'MOEMA')],
  };

  const payload = buildConsultaPayload(filtros);
  assert.equal(payload.distribuicao, undefined);
  assert.deepEqual(payload.bairros, ['MOEMA']);
});

test('item "sem meta" (cidade) vira quantidade ausente no payload, não zero', async () => {
  const { buildConsultaPayload } = await loadBuilder();
  const filtros = {
    ...BASE,
    ufs: ['SP', 'BA'],
    cidades: ['SAO PAULO', 'SALVADOR'],
    distribuicaoCidades: { 'SAO PAULO': 2000, SALVADOR: null }, // "sem meta"
  };

  const payload = buildConsultaPayload(filtros);
  const porCidade = Object.fromEntries(payload.distribuicao.map((i) => [i.cidade, i]));
  assert.equal(porCidade['SAO PAULO'].quantidade, 2000);
  assert.equal(porCidade['SALVADOR'].quantidade, undefined, 'sem meta deve virar ausente, não 0');
  assert.notEqual(porCidade['SALVADOR'].quantidade, 0);
});

test('item "sem meta" (bairro, agrupado por cidade) vira quantidade ausente', async () => {
  const { buildConsultaPayload, chaveBairro } = await loadBuilder();
  const filtros = {
    ...BASE,
    ufs: ['SP', 'BA'],
    cidades: ['SAO PAULO', 'SALVADOR'],
    bairros: [chaveBairro('SAO PAULO', 'MOEMA'), chaveBairro('SALVADOR', 'PITUBA')],
    distribuicaoBairros: {
      [chaveBairro('SAO PAULO', 'MOEMA')]: 1500,
      [chaveBairro('SALVADOR', 'PITUBA')]: null, // "sem meta"
    },
  };

  const payload = buildConsultaPayload(filtros);
  const porCidade = Object.fromEntries(payload.distribuicao.map((i) => [i.cidade, i]));
  assert.equal(porCidade['SAO PAULO'].quantidade, 1500);
  assert.equal(porCidade['SALVADOR'].quantidade, undefined);
});

test('item "sem meta" (só bairros, uma cidade) vira quantidade ausente', async () => {
  const { buildConsultaPayload, chaveBairro } = await loadBuilder();
  const b1 = chaveBairro('CURITIBA', 'CENTRO');
  const b2 = chaveBairro('CURITIBA', 'BATEL');
  const filtros = {
    ...BASE,
    ufs: ['PR'],
    cidades: ['CURITIBA'],
    bairros: [b1, b2],
    distribuicaoBairros: { [b1]: 500, [b2]: null },
  };

  const payload = buildConsultaPayload(filtros);
  const porBairro = Object.fromEntries(payload.distribuicao.map((i) => [i.bairro, i]));
  assert.equal(porBairro['CENTRO'].quantidade, 500);
  assert.equal(porBairro['BATEL'].quantidade, undefined);
});

test('genero_distribuicao só é enviado quando generoExato está ativado', async () => {
  const { buildConsultaPayload } = await loadBuilder();
  const semExato = buildConsultaPayload({ ...BASE, ufs: ['SP'], generoExato: false, generoDistribuicao: { M: 70, F: 30 } });
  assert.equal(semExato.genero_distribuicao, undefined);

  const comExato = buildConsultaPayload({ ...BASE, ufs: ['SP'], generoExato: true, generoDistribuicao: { M: 70, F: 30 } });
  assert.deepEqual(comExato.genero_distribuicao, { M: 70, F: 30 });
});

test('genero_distribuicao não é enviado quando genero é M ou F (não faz sentido)', async () => {
  const { buildConsultaPayload } = await loadBuilder();
  const payload = buildConsultaPayload({ ...BASE, ufs: ['SP'], genero: 'M', generoExato: true, generoDistribuicao: { M: 70, F: 30 } });
  assert.equal(payload.genero_distribuicao, undefined);
});

test('distribuição por estado: vários UFs sem cidade selecionada', async () => {
  const { buildConsultaPayload } = await loadBuilder();
  const filtros = {
    ...BASE,
    ufs: ['SP', 'RJ', 'MG'],
    quantidade: 3000,
    distribuicaoUfs: { SP: 1500, RJ: 1000, MG: null }, // MG "sem meta"
  };

  const payload = buildConsultaPayload(filtros);
  assert.equal(payload.distribuicao.length, 3);
  const porUf = Object.fromEntries(payload.distribuicao.map((i) => [i.uf, i]));
  assert.equal(porUf.SP.quantidade, 1500);
  assert.equal(porUf.RJ.quantidade, 1000);
  assert.equal(porUf.MG.quantidade, undefined, 'sem meta vira ausente, não 0');
});

test('distribuição por estado não aparece quando há distribuição por cidade (cidade tem prioridade)', async () => {
  const { buildConsultaPayload } = await loadBuilder();
  const filtros = {
    ...BASE,
    ufs: ['SP', 'RJ'],
    cidades: ['SAO PAULO', 'RIO DE JANEIRO'],
    distribuicaoUfs: { SP: 1000, RJ: 1000 },
    distribuicaoCidades: { 'SAO PAULO': 1500, 'RIO DE JANEIRO': 1500 },
  };

  const payload = buildConsultaPayload(filtros);
  // itens vêm por cidade, não por uf
  assert.ok(payload.distribuicao.every((i) => 'cidade' in i));
  assert.ok(payload.distribuicao.every((i) => !('uf' in i)));
});

test('só 1 estado: não gera distribuição por estado', async () => {
  const { buildConsultaPayload } = await loadBuilder();
  const payload = buildConsultaPayload({ ...BASE, ufs: ['SP'] });
  assert.equal(payload.distribuicao, undefined);
});
