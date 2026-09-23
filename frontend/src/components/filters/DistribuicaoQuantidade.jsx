/**
 * components/filters/DistribuicaoQuantidade.jsx
 *
 * Renderizado automaticamente quando há múltiplas cidades ou múltiplos bairros
 * selecionados. Permite definir a quantidade (absoluta) e a proporção (%) de
 * cada item, ou marcar "sem meta" para pegar tudo que estiver disponível
 * naquele item (sem número fixo). A soma dos itens com meta deve bater com
 * o campo `quantidade` global; itens "sem meta" ficam fora dessa conta.
 */

import { useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

const SEM_META = null; // valor sentinela: "pegar tudo disponível", sem número fixo

function equalizar(itens, total, valores = {}) {
  // Preserva itens marcados "sem meta" — só redistribui os com meta fixa.
  const comMeta = itens.filter((item) => valores[item] !== SEM_META);
  const base = comMeta.length ? Math.floor(total / comMeta.length) : 0;
  const resto = total - base * comMeta.length;
  const novos = {};
  itens.forEach((item) => {
    novos[item] = valores[item] === SEM_META ? SEM_META : 0;
  });
  comMeta.forEach((item, i) => {
    novos[item] = base + (i < resto ? 1 : 0);
  });
  return novos;
}

// ─────────────────────────────────────────────────────────────────────────────
// componente
// ─────────────────────────────────────────────────────────────────────────────

export default function DistribuicaoQuantidade({ itens, total, valores, onChange, label, semTitulo = false, rotulos = {} }) {
  // Quando a lista de itens muda → iguala proporcionalmente, preservando
  // valores já existentes para itens que continuam na seleção.
  useEffect(() => {
    if (!itens.length) return;

    const keysAntes = Object.keys(valores).sort().join(',');
    const keysDepois = [...itens].sort().join(',');

    if (keysAntes === keysDepois) return; // nada mudou

    // Redistribuir: manter valores existentes para itens que continuam,
    // atribuir cota proporcional para novos itens.
    const somaExistentes = itens.reduce((acc, item) => acc + (valores[item] ?? 0), 0);
    const novosItens = itens.filter((item) => !(item in valores));

    if (novosItens.length === 0) {
      // Só removeu itens: re-equaliza tudo (preservando os "sem meta")
      onChange(equalizar(itens, total, valores));
      return;
    }

    const disponivelParaNovos = Math.max(0, total - somaExistentes);
    const porNovo = Math.floor(disponivelParaNovos / novosItens.length);
    const restoNovos = disponivelParaNovos - porNovo * novosItens.length;

    const novos = {};
    itens.forEach((item) => {
      if (item in valores) {
        novos[item] = valores[item];
      } else {
        const idx = novosItens.indexOf(item);
        novos[item] = porNovo + (idx < restoNovos ? 1 : 0);
      }
    });
    onChange(novos);
  }, [itens.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const itensSemMeta = itens.filter((item) => valores[item] === SEM_META);
  const soma = itens.reduce((acc, item) => acc + (Number(valores[item]) || 0), 0);
  const diff = total - soma;
  // Com algum item "sem meta", a soma dos demais pode ficar abaixo do total
  // de propósito (o restante vem de quem não tem meta fixa) — só cobra o
  // total exato quando todos os itens têm meta definida.
  const ok = itensSemMeta.length > 0 ? diff >= 0 : diff === 0;

  const handleEqualizar = () => onChange(equalizar(itens, total, valores));

  const handleChange = (item, raw) => {
    const v = Math.max(0, parseInt(raw, 10) || 0);
    onChange({ ...valores, [item]: v });
  };

  const toggleSemMeta = (item) => {
    onChange({ ...valores, [item]: valores[item] === SEM_META ? 0 : SEM_META });
  };

  if (!itens.length) return null;

  const labelCap = label === 'uf' ? 'Estado' : label === 'cidade' ? 'Cidade' : 'Bairro';

  return (
    <div>
      {/* Cabeçalho */}
      <div className="d-flex align-items-center justify-content-between mb-2">
        {!semTitulo && (
          <h2 className="section-header mb-0" style={{ fontSize: '0.95rem' }}>
            <i className="bi bi-sliders me-2" style={{ color: 'var(--roxo-primario)' }} />
            Distribuição por {label === 'uf' ? 'estado' : label}
          </h2>
        )}
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary ms-auto"
          onClick={handleEqualizar}
          title="Dividir igualmente entre todos"
        >
          <i className="bi bi-distribute-vertical me-1" />
          Equalizar
        </button>
      </div>

      {/* Tabela */}
      <div style={{ overflowX: 'auto' }}>
        <table
          className="table table-sm mb-1"
          style={{ fontSize: '0.85rem', borderCollapse: 'separate', borderSpacing: 0 }}
        >
          <thead>
            <tr style={{ background: 'var(--fundo-secundario)' }}>
              <th style={{ color: 'var(--roxo-escuro)', fontWeight: 600, paddingLeft: '0.5rem' }}>
                {labelCap}
              </th>
              <th style={{ width: 130, color: 'var(--roxo-escuro)', fontWeight: 600 }}>
                Quantidade
              </th>
              <th style={{ width: 70, textAlign: 'center', color: 'var(--roxo-escuro)', fontWeight: 600 }}>
                %
              </th>
              <th style={{ width: 90, textAlign: 'center', color: 'var(--roxo-escuro)', fontWeight: 600 }}>
                Sem meta
              </th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => {
              const semMeta = valores[item] === SEM_META;
              const qty = Number(valores[item]) || 0;
              const pct = total > 0 ? ((qty / total) * 100).toFixed(1) : '0.0';
              return (
                <tr key={item}>
                  <td
                    className="align-middle"
                    style={{ paddingLeft: '0.5rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={rotulos[item] ?? item}
                  >
                    {rotulos[item] ?? item}
                  </td>
                  <td>
                    {semMeta ? (
                      <span style={{ fontSize: '0.8rem', color: 'var(--texto-terciario)', fontStyle: 'italic' }}>
                        Disponível
                      </span>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        max={total}
                        step={1}
                        value={qty}
                        onChange={(e) => handleChange(item, e.target.value)}
                        className="form-control form-control-sm"
                        style={{ fontSize: '0.85rem' }}
                      />
                    )}
                  </td>
                  <td className="align-middle text-center">
                    {!semMeta && (
                      <span
                        style={{
                          display: 'inline-block',
                          minWidth: 40,
                          padding: '0.15rem 0.35rem',
                          borderRadius: 4,
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          background: qty > 0 ? 'var(--roxo-claro, #ede7f6)' : 'var(--fundo-secundario)',
                          color: qty > 0 ? 'var(--roxo-primario)' : 'var(--texto-terciario)',
                        }}
                      >
                        {pct}%
                      </span>
                    )}
                  </td>
                  <td className="align-middle text-center">
                    <input
                      type="checkbox"
                      checked={semMeta}
                      onChange={() => toggleSemMeta(item)}
                      style={{ accentColor: 'var(--roxo-primario)' }}
                      title="Pegar tudo que estiver disponível, sem número fixo"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--borda)', background: 'var(--fundo-secundario)' }}>
              <td style={{ paddingLeft: '0.5rem', fontWeight: 700, color: 'var(--roxo-escuro)' }}>
                Total
              </td>
              <td style={{ fontWeight: 700, color: ok ? 'var(--sucesso, #2e7d32)' : 'var(--erro, #c62828)' }}>
                {soma.toLocaleString('pt-BR')}
                <span style={{ fontWeight: 400, color: 'var(--texto-terciario)', marginLeft: 4 }}>
                  / {total.toLocaleString('pt-BR')}
                </span>
              </td>
              <td className="align-middle text-center">
                {ok ? (
                  <i className="bi bi-check-circle-fill" style={{ color: 'var(--sucesso, #2e7d32)', fontSize: '0.9rem' }} />
                ) : (
                  <i className="bi bi-exclamation-circle-fill" style={{ color: 'var(--erro, #c62828)', fontSize: '0.9rem' }} />
                )}
              </td>
              <td className="align-middle text-center" style={{ fontSize: '0.75rem', color: 'var(--texto-terciario)' }}>
                {itensSemMeta.length > 0 && `${itensSemMeta.length} sem meta`}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Nota informativa: itens sem meta cobrem o restante */}
      {ok && itensSemMeta.length > 0 && diff > 0 && (
        <div
          className="d-flex align-items-center gap-2 p-2 rounded"
          style={{ background: 'var(--fundo-secundario)', border: '1px solid var(--borda)', fontSize: '0.8rem', color: 'var(--texto-secundario)' }}
        >
          <i className="bi bi-info-circle-fill" style={{ color: 'var(--roxo-primario)' }} />
          {`${diff.toLocaleString('pt-BR')} registros ficam livres para quem está marcado "sem meta" (pegam o que houver disponível).`}
        </div>
      )}

      {/* Alerta de divergência */}
      {!ok && (
        <div
          className="d-flex align-items-center gap-2 p-2 rounded"
          style={{
            background: diff > 0 ? '#fff8e1' : '#ffebee',
            border: `1px solid ${diff > 0 ? 'var(--aviso)' : 'var(--erro, #e53935)'}`,
            fontSize: '0.8rem',
            color: diff > 0 ? '#795548' : '#b71c1c',
          }}
        >
          <i
            className={`bi bi-${diff > 0 ? 'exclamation-triangle-fill' : 'x-circle-fill'}`}
            style={{ color: diff > 0 ? 'var(--aviso)' : 'var(--erro, #e53935)' }}
          />
          {diff > 0
            ? `Faltam ${diff.toLocaleString('pt-BR')} registros a distribuir. Clique em "Equalizar" para redistribuir.`
            : `Excesso de ${Math.abs(diff).toLocaleString('pt-BR')} registros. Reduza alguns valores ou clique em "Equalizar".`}
        </div>
      )}
    </div>
  );
}
