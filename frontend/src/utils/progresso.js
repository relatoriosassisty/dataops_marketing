/**
 * utils/progresso.js
 * Lógica pura da barra de progresso do levantamento (sem React), testável direto.
 */

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Inicia um job no backend e consulta o andamento até ele terminar.
 * Devolve o resultado do job; se ele falhar, lança um erro no formato do axios
 * (`err.response.data.erro`) para o tratamento de erro da tela continuar igual.
 */
export async function aguardarJob({
  iniciar,
  consultar,
  onProgresso,
  intervaloMs = 1000,
  falhasSeguidasMax = 5,
  espera = esperar,
}) {
  const jobId = await iniciar();
  let falhasSeguidas = 0;

  for (;;) {
    await espera(intervaloMs);

    let estado;
    try {
      estado = await consultar(jobId);
      falhasSeguidas = 0;
    } catch (err) {
      // 400/404: o job não existe mais (servidor reiniciou ou expirou) — insistir não adianta.
      // Falhas de rede pontuais são toleradas: a consulta continua rodando no backend.
      const status = err?.response?.status;
      falhasSeguidas += 1;
      if (status === 400 || status === 404 || falhasSeguidas >= falhasSeguidasMax) throw err;
      continue;
    }

    if (estado.progresso) onProgresso?.(estado.progresso);

    if (estado.status === 'concluido') return estado.resultado;
    if (estado.status === 'erro') {
      const erro = new Error(estado.erro || 'Erro ao realizar levantamento.');
      erro.response = { data: { erro: estado.erro } };
      throw erro;
    }
  }
}

/** Percentual (0-100) ou null quando não há total definido (barra indeterminada). */
export function calcularPercentual(progresso) {
  if (!progresso?.meta) return null;
  return Math.min(100, Math.max(0, Math.floor((progresso.coletados / progresso.meta) * 100)));
}

/** 75 -> "1m 15s"; 5 -> "5s"; 3700 -> "1h 1m". */
export function formatarDuracao(segundos) {
  const total = Math.max(0, Math.floor(segundos));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
