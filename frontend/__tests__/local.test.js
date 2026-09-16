import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let server;
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
});
after(async () => { await server?.close(); });

test('a página principal renderiza sem sessão e sem controles comerciais', async () => {
  const { default: HomePage } = await server.ssrLoadModule('/src/pages/HomePage.jsx');
  const html = renderToStaticMarkup(createElement(HomePage));
  assert.match(html, /Montar lista/);
  assert.match(html, /Enriquecimento/);
  assert.match(html, /versão local/);
  assert.doesNotMatch(html, /Alterar senha|Sair|Nome do Cliente|Valor da Lista|Parcelado|Dados Financeiros/);
});

test('a api envia consultas sem credenciais ou redirecionamento de login', async () => {
  const { default: api } = await server.ssrLoadModule('/src/services/api.js');
  const oldAdapter = api.defaults.adapter;
  api.defaults.adapter = async (config) => {
    assert.equal(config.headers.get('Authorization'), undefined);
    assert.equal(config.headers.get('X-API-Key'), undefined);
    return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
  };
  try {
    const response = await api.post('/api/v1/consulta/contagem', { ufs: ['SP'] });
    assert.equal(response.data.ok, true);
    assert.equal(api.interceptors.response.handlers.length, 0);
  } finally { api.defaults.adapter = oldAdapter; }
});

test('enriquecimento envia arquivo multipart e interpreta o download', async () => {
  const { default: api } = await server.ssrLoadModule('/src/services/api.js');
  const { enriquecerLista } = await server.ssrLoadModule('/src/services/enriquecimentoService.js');
  const oldAdapter = api.defaults.adapter;
  let clicked = false;
  globalThis.document = {
    createElement: () => ({ click() { clicked = true; }, remove() {} }),
    body: { appendChild() {} },
  };
  api.defaults.adapter = async (config) => {
    assert.ok(config.data instanceof FormData);
    assert.deepEqual([...config.data.keys()], ['tipo', 'arquivo']);
    assert.equal(await config.data.get('arquivo').text(), '00000000000');
    return { data: new Blob(['PK']), headers: { 'x-enviados': '1', 'x-encontrados': '1' },
      status: 200, statusText: 'OK', config };
  };
  try {
    const result = await enriquecerLista('cpf', ['00000000000']);
    assert.equal(clicked, true);
    assert.deepEqual(result, { total_enviado: 1, total_encontrado: 1, download_iniciado: true });
  } finally { api.defaults.adapter = oldAdapter; delete globalThis.document; }
});
