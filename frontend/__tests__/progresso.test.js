import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

let server;
after(async () => { await server?.close(); });

async function load() {
  server ??= await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  return server.ssrLoadModule('/src/utils/progresso.js');
}

const semEspera = () => Promise.resolve();

test('acompanha o job até concluir, repassando cada progresso e devolvendo o resultado', async () => {
  const { aguardarJob } = await load();
  const respostas = [
    { status: 'processando', progresso: null },
    { status: 'processando', progresso: { coletados: 100, meta: 1000 } },
    { status: 'processando', progresso: { coletados: 600, meta: 1000 } },
    { status: 'concluido', progresso: { coletados: 900, meta: 1000 }, resultado: { total_disponivel: 900 } },
  ];
  const vistos = [];
  const resultado = await aguardarJob({
    iniciar: async () => 'job1',
    consultar: async (id) => { assert.equal(id, 'job1'); return respostas.shift(); },
    onProgresso: (p) => vistos.push(p.coletados),
    espera: semEspera,
  });
  assert.deepEqual(resultado, { total_disponivel: 900 });
  assert.deepEqual(vistos, [100, 600, 900]);
});

test('job com erro lança no formato do axios (err.response.data.erro)', async () => {
  const { aguardarJob } = await load();
  await assert.rejects(
    aguardarJob({
      iniciar: async () => 'j',
      consultar: async () => ({ status: 'erro', erro: 'Erro interno ao processar o levantamento.' }),
      espera: semEspera,
    }),
    (err) => err.response.data.erro === 'Erro interno ao processar o levantamento.',
  );
});

test('tolera falhas de rede pontuais e continua acompanhando', async () => {
  const { aguardarJob } = await load();
  let chamadas = 0;
  const resultado = await aguardarJob({
    iniciar: async () => 'j',
    consultar: async () => {
      chamadas += 1;
      if (chamadas <= 2) throw new Error('Network Error');
      return { status: 'concluido', resultado: { ok: true } };
    },
    espera: semEspera,
  });
  assert.deepEqual(resultado, { ok: true });
});

test('desiste após falhas de rede seguidas demais', async () => {
  const { aguardarJob } = await load();
  let chamadas = 0;
  await assert.rejects(aguardarJob({
    iniciar: async () => 'j',
    consultar: async () => { chamadas += 1; throw new Error('Network Error'); },
    falhasSeguidasMax: 3,
    espera: semEspera,
  }));
  assert.equal(chamadas, 3);
});

test('job inexistente (404) não fica insistindo', async () => {
  const { aguardarJob } = await load();
  let chamadas = 0;
  await assert.rejects(aguardarJob({
    iniciar: async () => 'j',
    consultar: async () => { chamadas += 1; const e = new Error('nf'); e.response = { status: 404 }; throw e; },
    espera: semEspera,
  }));
  assert.equal(chamadas, 1);
});

test('percentual: proporcional, limitado a 0-100 e nulo sem meta', async () => {
  const { calcularPercentual } = await load();
  assert.equal(calcularPercentual({ coletados: 250, meta: 1000 }), 25);
  assert.equal(calcularPercentual({ coletados: 5000, meta: 1000 }), 100);
  assert.equal(calcularPercentual({ coletados: 0, meta: 1000 }), 0);
  assert.equal(calcularPercentual({ coletados: 10, meta: null }), null);
  assert.equal(calcularPercentual(null), null);
});

test('formata a duração', async () => {
  const { formatarDuracao } = await load();
  assert.equal(formatarDuracao(5), '5s');
  assert.equal(formatarDuracao(75), '1m 15s');
  assert.equal(formatarDuracao(3700), '1h 1m');
  assert.equal(formatarDuracao(-3), '0s');
});
