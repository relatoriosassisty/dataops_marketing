/**
 * components/results/ResultPanel.jsx
 * Painel de resultado: mostra contagem ou botão de download.
 */

import Spinner from '../ui/Spinner';
import ProgressoConsulta from '../ui/ProgressoConsulta';

export default function ResultPanel({ estado, dados, onDownload, onLimpar, contagemEmAndamento, progresso, inicio }) {
  if (estado === 'idle') return null;

  if (estado === 'carregando') {
    return (
      <div className="card-padrao mt-4">
        {contagemEmAndamento
          ? <ProgressoConsulta progresso={progresso} inicio={inicio} />
          : <Spinner mensagem="Consultando o banco de dados..." />}
      </div>
    );
  }

  if (estado === 'erro') {
    return (
      <div className="card-padrao mt-4" style={{ borderColor: 'var(--erro)' }}>
        <div className="d-flex align-items-center gap-2" style={{ color: 'var(--erro)' }}>
          <i className="bi bi-x-circle-fill fs-5" />
          <strong>Erro na consulta</strong>
        </div>
        <p className="mt-2 mb-0" style={{ color: 'var(--texto-secundario)', fontSize: 'var(--font-size-sm)' }}>
          {dados?.mensagem || 'Tente novamente ou verifique os filtros.'}
        </p>
        <button className="btn btn-sm btn-outline-secondary mt-3" onClick={onLimpar}>
          Limpar
        </button>
      </div>
    );
  }

  if (estado === 'contagem') {
    return (
      <div className="card-padrao mt-4">
        <h3 className="section-header">
          <i className="bi bi-bar-chart-fill" style={{ color: 'var(--laranja-primario)' }} />
          Resultado do Levantamento
        </h3>

        {dados?.suficiente ? (
          /* ── Suficiente ── */
          <div
            className="d-flex align-items-center gap-3 p-3 rounded mt-2"
            style={{ background: '#e8f5e9', border: '1px solid var(--sucesso)' }}
          >
            <i className="bi bi-check-circle-fill" style={{ color: 'var(--sucesso)', fontSize: '2rem', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--sucesso)', fontSize: '1.1rem' }}>
                Quantidade disponível
              </div>
              <div style={{ color: 'var(--texto-secundario)', fontSize: '0.88rem', marginTop: 2 }}>
                <strong>{(dados.total_disponivel ?? 0).toLocaleString('pt-BR')}</strong> registros
                encontrados após limpeza — você pediu{' '}
                <strong>{(dados.quantidade_pedida ?? 0).toLocaleString('pt-BR')}</strong>.
              </div>
            </div>
          </div>
        ) : (
          /* ── Insuficiente ── */
          <div className="mt-2">
            <div className="row g-3">
              {[
                {
                  label: 'Disponível',
                  valor: dados?.total_disponivel ?? 0,
                  cor: 'var(--aviso)',
                  icone: 'bi-person-check',
                  bg: '#fff8e1',
                  borda: 'var(--aviso)',
                },
                {
                  label: 'Pedido',
                  valor: dados?.quantidade_pedida ?? 0,
                  cor: 'var(--roxo-primario)',
                  icone: 'bi-list-ol',
                  bg: 'var(--fundo-secundario)',
                  borda: 'var(--borda)',
                },
                {
                  label: 'Faltam',
                  valor: Math.max(0, (dados?.quantidade_pedida ?? 0) - (dados?.total_disponivel ?? 0)),
                  cor: 'var(--erro, #c62828)',
                  icone: 'bi-exclamation-triangle-fill',
                  bg: '#fdecea',
                  borda: 'var(--erro, #c62828)',
                },
              ].map(({ label, valor, cor, icone, bg, borda }) => (
                <div key={label} className="col-sm-4">
                  <div className="text-center p-3 rounded" style={{ background: bg, border: `1px solid ${borda}` }}>
                    <i className={`bi ${icone} d-block mb-1`} style={{ color: cor, fontSize: '1.3rem' }} />
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: cor }}>
                      {valor.toLocaleString('pt-BR')}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--texto-terciario)' }}>
                      {label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div
              className="mt-3 d-flex align-items-start gap-2 p-2 rounded"
              style={{ background: '#fff8e1', border: '1px solid var(--aviso)', fontSize: '0.83rem', color: '#795548' }}
            >
              <i className="bi bi-info-circle-fill mt-1" style={{ color: 'var(--aviso)', flexShrink: 0 }} />
              <span>
                A lista será gerada com os <strong>{(dados?.total_disponivel ?? 0).toLocaleString('pt-BR')}</strong> registros
                disponíveis. Considere ampliar os filtros ou reduzir a quantidade pedida.
              </span>
            </div>
          </div>
        )}
        {/* Breakdown por cidade/bairro quando distribuição está ativa */}
        {dados?.por_item?.length > 0 && (() => {
          const chave = dados.por_item[0].cidade ? 'cidade' : 'bairro';
          const labelCap = chave === 'cidade' ? 'Cidade' : 'Bairro';
          const temInsuficiente = dados.por_item.some((it) => !it.suficiente);
          return (
            <div className="mt-3">
              <div className="fw-semibold mb-2" style={{ fontSize: '0.9rem', color: 'var(--roxo-escuro)' }}>
                Disponibilidade por {chave}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table table-sm mb-2" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--fundo-secundario)' }}>
                      <th style={{ paddingLeft: '0.5rem' }}>{labelCap}</th>
                      <th style={{ width: 120, textAlign: 'right' }}>Solicitado</th>
                      <th style={{ width: 120, textAlign: 'right' }}>Disponível</th>
                      <th style={{ width: 56, textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.por_item.map((item) => (
                      <tr key={item[chave]}>
                        <td className="align-middle" style={{ paddingLeft: '0.5rem' }}>{item[chave]}</td>
                        <td className="align-middle text-end" style={{ color: 'var(--texto-secundario)' }}>
                          {item.solicitado.toLocaleString('pt-BR')}
                        </td>
                        <td
                          className="align-middle text-end fw-semibold"
                          style={{ color: item.suficiente ? 'var(--sucesso)' : 'var(--erro, #c62828)' }}
                        >
                          {item.disponivel.toLocaleString('pt-BR')}
                        </td>
                        <td className="align-middle text-center">
                          {item.suficiente
                            ? <i className="bi bi-check-circle-fill" style={{ color: 'var(--sucesso)' }} />
                            : <i className="bi bi-exclamation-triangle-fill" style={{ color: 'var(--aviso)' }} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {temInsuficiente && (
                <div
                  className="d-flex align-items-start gap-2 p-2 rounded mb-2"
                  style={{ background: '#fff8e1', border: '1px solid var(--aviso)', fontSize: '0.82rem', color: '#795548' }}
                >
                  <i className="bi bi-info-circle-fill mt-1" style={{ color: 'var(--aviso)', flexShrink: 0 }} />
                  <span>
                    Alguns itens têm disponibilidade abaixo do solicitado (marcados em vermelho).
                    A lista será gerada com o <strong>máximo disponível</strong> por item.
                    Ajuste as quantidades na distribuição e faça um novo levantamento se necessário.
                  </span>
                </div>
              )}
            </div>
          );
        })()}
        <button className="btn btn-sm btn-outline-secondary mt-2" onClick={onLimpar}>
          Nova consulta
        </button>
      </div>
    );
  }

  if (estado === 'pronto') {
    return (
      <div className="card-padrao mt-4" style={{ borderColor: 'var(--sucesso)' }}>
        <h3 className="section-header" style={{ borderBottomColor: 'var(--sucesso)' }}>
          <i className="bi bi-check-circle-fill" style={{ color: 'var(--sucesso)' }} />
          Lista gerada com sucesso
        </h3>
        <p style={{ color: 'var(--texto-secundario)' }}>
          O download do arquivo <strong>.xlsx</strong> foi iniciado automaticamente.
        </p>
        <button className="btn btn-outline-secondary" onClick={onLimpar}>
          Nova lista
        </button>
      </div>
    );
  }

  return null;
}
