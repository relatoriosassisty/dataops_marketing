/**
 * components/ui/ProgressoConsulta.jsx
 * Barra de progresso do levantamento: mostra quantos registros já foram coletados
 * do banco. Sem total definido (itens "sem meta"), a barra fica indeterminada.
 */

import { useEffect, useState } from 'react';
import { calcularPercentual, formatarDuracao } from '../../utils/progresso';

const fmt = (n) => (n ?? 0).toLocaleString('pt-BR');

export default function ProgressoConsulta({ progresso, inicio }) {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const percentual = calcularPercentual(progresso);
  const determinada = percentual !== null;
  const coletados = progresso?.coletados ?? 0;
  const decorrido = inicio ? (agora - inicio) / 1000 : 0;

  return (
    <div className="py-3">
      <div className="d-flex justify-content-between align-items-baseline mb-2">
        <span style={{ fontWeight: 600, color: 'var(--roxo-escuro)' }}>
          Consultando o banco de dados...
        </span>
        <span style={{ color: 'var(--texto-terciario)', fontSize: 'var(--font-size-sm)' }}>
          {formatarDuracao(decorrido)}
        </span>
      </div>

      <div
        className="progress"
        style={{ height: '1.1rem' }}
        role="progressbar"
        aria-label="Progresso do levantamento"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={determinada ? percentual : undefined}
      >
        <div
          className="progress-bar progress-bar-striped progress-bar-animated"
          style={{
            width: determinada ? `${Math.max(percentual, 2)}%` : '100%',
            background: 'var(--laranja-primario)',
            transition: 'width 0.4s ease',
          }}
        >
          {determinada && percentual >= 8 ? `${percentual}%` : ''}
        </div>
      </div>

      <div className="mt-2" style={{ color: 'var(--texto-secundario)', fontSize: '0.88rem' }}>
        {!progresso
          ? 'Iniciando a busca...'
          : determinada
            ? <><strong>{fmt(coletados)}</strong> de <strong>{fmt(progresso.meta)}</strong> registros ({percentual}%)</>
            : <><strong>{fmt(coletados)}</strong> registros coletados até agora</>}
      </div>

      <div className="mt-1" style={{ color: 'var(--texto-terciario)', fontSize: '0.78rem' }}>
        Se a base tiver menos registros que o pedido, a busca termina antes de chegar a 100%.
      </div>
    </div>
  );
}
