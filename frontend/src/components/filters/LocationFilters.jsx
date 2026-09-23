/**
 * components/filters/LocationFilters.jsx
 * Filtros: UF, Cidade, Bairro
 *
 * Suporta múltiplos UFs → busca cidades para cada UF em paralelo.
 * Suporta múltiplas cidades → busca bairros para cada cidade em paralelo.
 * Distribuição de quantidade por cidade/bairro é tratada em FilterForm
 * via DistribuicaoQuantidade (aparece automaticamente).
 */

import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { IS_MOCK, MOCK_CIDADES, MOCK_BAIRROS } from '../../services/mockData';
import { chaveBairro } from '../../utils/bairroChave';

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA',
  'MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN',
  'RO','RR','RS','SC','SE','SP','TO',
];

/* ── Componente de lista com busca ─────────────────────────────────────── */
/* itens aceita strings simples ou { value, label } — usado quando o valor
   interno (ex: "CIDADE::BAIRRO", para não confundir bairros de mesmo nome
   em cidades diferentes) precisa de um rótulo mais legível na tela. */
function ListaComBusca({ itens, selecionados, onChange, placeholder, carregando, desabilitado, msgVazia }) {
  const [busca, setBusca] = useState('');
  const inputRef = useRef(null);

  const normalizados = itens.map((i) => (typeof i === 'string' ? { value: i, label: i } : i));
  const labelPorValor = Object.fromEntries(normalizados.map((i) => [i.value, i.label]));
  const rotulo = (valor) => labelPorValor[valor] ?? valor;

  const filtrados = busca.trim()
    ? normalizados.filter((i) => i.label.toLowerCase().includes(busca.trim().toLowerCase()))
    : normalizados;

  const toggle = (valor) => {
    const novo = selecionados.includes(valor)
      ? selecionados.filter((s) => s !== valor)
      : [...selecionados, valor];
    onChange(novo);
  };

  const remover = (valor) => onChange(selecionados.filter((s) => s !== valor));

  return (
    <div>
      {/* Chips dos selecionados */}
      {selecionados.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.5rem' }}>
          {selecionados.map((s) => (
            <span
              key={s}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                background: 'var(--roxo-primario)',
                color: '#fff',
                borderRadius: '999px',
                padding: '0.15rem 0.55rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                maxWidth: '100%',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                {rotulo(s)}
              </span>
              <button
                type="button"
                onClick={() => remover(s)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.85)',
                  cursor: 'pointer',
                  padding: 0,
                  lineHeight: 1,
                  fontSize: '0.85rem',
                  flexShrink: 0,
                }}
                aria-label={`Remover ${s}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Campo de busca */}
      <div className="input-group input-group-sm mb-1">
        <span className="input-group-text" style={{ background: 'var(--fundo-secundario)', border: '1px solid var(--borda)' }}>
          {carregando
            ? <span className="spinner-border spinner-border-sm" />
            : <i className="bi bi-search" style={{ color: 'var(--texto-terciario)' }} />}
        </span>
        <input
          ref={inputRef}
          type="text"
          className="form-control form-control-sm"
          placeholder={desabilitado ? (msgVazia || placeholder) : placeholder}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          disabled={desabilitado}
          style={{ borderLeft: 'none' }}
        />
        {busca && (
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => { setBusca(''); inputRef.current?.focus(); }}
            style={{ borderColor: 'var(--borda)' }}
          >
            <i className="bi bi-x" />
          </button>
        )}
      </div>

      {/* Lista filtrada */}
      {!desabilitado && itens.length > 0 && (
        <div
          style={{
            maxHeight: 180,
            overflowY: 'auto',
            border: '1px solid var(--borda)',
            borderRadius: 'var(--radius-sm)',
            background: '#fff',
          }}
        >
          {filtrados.length === 0 ? (
            <div style={{ padding: '0.5rem 0.75rem', color: 'var(--texto-terciario)', fontSize: '0.82rem' }}>
              Nenhum resultado para "{busca}"
            </div>
          ) : (
            filtrados.map(({ value, label }) => {
              const sel = selecionados.includes(value);
              return (
                <label
                  key={value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.3rem 0.65rem',
                    cursor: 'pointer',
                    background: sel ? 'var(--roxo-fundo, #f3f0ff)' : 'transparent',
                    borderBottom: '1px solid var(--borda)',
                    fontSize: '0.84rem',
                    color: sel ? 'var(--roxo-escuro)' : 'var(--texto-primario)',
                    fontWeight: sel ? 600 : 400,
                    transition: 'background 0.1s',
                    userSelect: 'none',
                  }}
                  onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = 'var(--fundo-secundario)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = sel ? 'var(--roxo-fundo, #f3f0ff)' : 'transparent'; }}
                >
                  <input
                    type="checkbox"
                    checked={sel}
                    onChange={() => toggle(value)}
                    style={{ accentColor: 'var(--roxo-primario)', flexShrink: 0 }}
                  />
                  {label}
                </label>
              );
            })
          )}
        </div>
      )}

      {/* Contagem */}
      {!desabilitado && itens.length > 0 && (
        <small style={{ color: 'var(--texto-terciario)' }}>
          {filtrados.length !== itens.length
            ? `${filtrados.length} de ${itens.length}`
            : `${itens.length}`} {itens.length === 1 ? 'opção' : 'opções'}
          {selecionados.length > 0 && ` · ${selecionados.length} selecionada${selecionados.length > 1 ? 's' : ''}`}
        </small>
      )}
    </div>
  );
}

/* ── Componente principal ──────────────────────────────────────────────── */
export default function LocationFilters({ valores, onChange }) {
  const [cidades, setCidades] = useState([]);
  const [bairros, setBairros] = useState([]);
  const [carregandoCidades, setCarregandoCidades] = useState(false);
  const [carregandoBairros, setCarregandoBairros] = useState(false);
  const [altaRendaInfo, setAltaRendaInfo] = useState(null);
  const [carregandoAR, setCarregandoAR] = useState(false);
  const [erroCidades, setErroCidades] = useState(false);
  const [erroBairros, setErroBairros] = useState(false);

  // Mapa cidade → UF, atualizado quando as cidades são carregadas.
  // Usado na busca de bairros para saber qual UF chamar por cidade.
  const cidadeUfMapRef = useRef({});

  /* Carrega cidades para todos os UFs selecionados em paralelo.
     Espera um instante após a última mudança (debounce) para não disparar
     um lote novo de requisições a cada estado marcado em sequência. */
  useEffect(() => {
    setCidades([]);
    setErroCidades(false);
    cidadeUfMapRef.current = {};

    if (!valores.ufs?.length) {
      return;
    }

    setCarregandoCidades(true);

    if (IS_MOCK) {
      const t = setTimeout(() => {
        const novoMap = {};
        const todas = [];
        valores.ufs.forEach((uf) => {
          const c = MOCK_CIDADES[uf] || [];
          c.forEach((cidade) => { novoMap[cidade] = uf; todas.push(cidade); });
        });
        cidadeUfMapRef.current = novoMap;
        setCidades([...new Set(todas)].sort());
        setCarregandoCidades(false);
      }, 300);
      return () => clearTimeout(t);
    }

    let cancelled = false;
    const controllers = valores.ufs.map(() => new AbortController());

    const debounce = setTimeout(() => {
      Promise.all(
        valores.ufs.map((uf, i) =>
          api
            .get(`/api/v1/localidades/cidades?uf=${uf}`, { signal: controllers[i].signal })
            .then(({ data }) => ({ uf, cidades: data.cidades || [], falhou: false }))
            .catch((err) => {
              if (err.name === 'CanceledError' || err.name === 'AbortError') throw err;
              return { uf, cidades: [], falhou: true };
            })
        )
      )
        .then((results) => {
          if (cancelled) return;
          const novoMap = {};
          const todas = [];
          results.forEach(({ uf, cidades: lista }) => {
            lista.forEach((cidade) => { novoMap[cidade] = uf; todas.push(cidade); });
          });
          cidadeUfMapRef.current = novoMap;
          setCidades([...new Set(todas)].sort());
          setErroCidades(results.some((r) => r.falhou));
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setCarregandoCidades(false); });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(debounce);
      controllers.forEach((c) => c.abort());
    };
  }, [valores.ufs?.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Carrega bairros para todas as cidades selecionadas em paralelo (com debounce) */
  useEffect(() => {
    setBairros([]);
    setErroBairros(false);

    if (!valores.cidades?.length) return;

    setCarregandoBairros(true);

    const multiplasCidades = valores.cidades.length > 1;

    if (IS_MOCK) {
      const t = setTimeout(() => {
        const vistos = new Set();
        const itensBairros = [];
        valores.cidades.forEach((cidade) => {
          (MOCK_BAIRROS[cidade] || []).forEach((b) => {
            const valor = chaveBairro(cidade, b);
            if (vistos.has(valor)) return;
            vistos.add(valor);
            itensBairros.push({ value: valor, label: multiplasCidades ? `${b} — ${cidade}` : b });
          });
        });
        itensBairros.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
        setBairros(itensBairros);
        setCarregandoBairros(false);
      }, 300);
      return () => clearTimeout(t);
    }

    let cancelled = false;
    const controllers = valores.cidades.map(() => new AbortController());

    const debounce = setTimeout(() => {
      Promise.all(
        valores.cidades.map((cidade, i) => {
          const uf = cidadeUfMapRef.current[cidade] || valores.ufs?.[0];
          if (!uf) return Promise.resolve({ cidade, bairros: [], falhou: false });
          return api
            .get(`/api/v1/localidades/bairros?uf=${uf}&cidade=${encodeURIComponent(cidade)}`, {
              signal: controllers[i].signal,
            })
            .then(({ data }) => ({ cidade, bairros: data.bairros || [], falhou: false }))
            .catch((err) => {
              if (err.name === 'CanceledError' || err.name === 'AbortError') throw err;
              return { cidade, bairros: [], falhou: true };
            });
        })
      )
        .then((results) => {
          if (cancelled) return;
          // Cada bairro fica identificado por cidade+nome — bairros com o
          // mesmo nome em cidades diferentes (ex: "CENTRO") não se confundem.
          const vistos = new Set();
          const itensBairros = [];
          results.forEach(({ cidade, bairros: lista }) => {
            lista.forEach((b) => {
              const valor = chaveBairro(cidade, b);
              if (vistos.has(valor)) return;
              vistos.add(valor);
              itensBairros.push({ value: valor, label: multiplasCidades ? `${b} — ${cidade}` : b });
            });
          });
          itensBairros.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
          setBairros(itensBairros);
          setErroBairros(results.some((r) => r.falhou));
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setCarregandoBairros(false); });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(debounce);
      controllers.forEach((c) => c.abort());
    };
  }, [valores.cidades?.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Busca bairros de alta renda para todas as cidades selecionadas em paralelo */
  useEffect(() => {
    if (!valores.altaRenda || !valores.cidades?.length || !valores.ufs?.length) {
      setAltaRendaInfo(null);
      return;
    }
    setCarregandoAR(true);
    Promise.all(
      valores.cidades.map((cidade) => {
        const uf = cidadeUfMapRef.current[cidade] || valores.ufs[0];
        return api
          .get(`/api/v1/localidades/alta-renda?uf=${uf}&cidade=${encodeURIComponent(cidade)}`)
          .then(({ data }) => ({ cidade, bairros: data.bairros || [], mapeada: !!data.mapeada }))
          .catch(() => ({ cidade, bairros: [], mapeada: false }));
      })
    )
      .then((results) => setAltaRendaInfo(results))
      .catch(() => setAltaRendaInfo([]))
      .finally(() => setCarregandoAR(false));
  }, [valores.altaRenda, valores.cidades?.join(','), valores.ufs?.join(',')]);

  return (
    <div>
      <h2 className="section-header">
        <i className="bi bi-geo-alt-fill" style={{ color: 'var(--roxo-primario)' }} />
        Localização
      </h2>

      {/* UF */}
      <div className="mb-3">
        <label className="form-label fw-semibold" style={{ color: 'var(--roxo-escuro)' }}>
          Estado (UF) <span className="text-danger">*</span>
          {valores.ufs?.length > 1 && valores.cidades?.length <= 1 && (
            <span style={{ marginLeft: '0.5rem', fontWeight: 400, fontSize: '0.78rem', color: 'var(--texto-terciario)' }}>
              · distribuição disponível abaixo
            </span>
          )}
        </label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(9, 1fr)',
            gap: '0.35rem',
          }}
        >
          {UFS.map((uf) => {
            const ativo = valores.ufs?.includes(uf);
            return (
              <button
                key={uf}
                type="button"
                onClick={() => {
                  const atual = valores.ufs || [];
                  const novo = atual.includes(uf)
                    ? atual.filter((v) => v !== uf)
                    : [...atual, uf];
                  onChange({ ufs: novo, cidades: [], bairros: [] });
                }}
                className="btn btn-sm"
                style={{
                  padding: '0.3rem 0',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  width: '100%',
                  background: ativo ? 'var(--roxo-primario)' : 'var(--fundo-secundario)',
                  color: ativo ? '#fff' : 'var(--roxo-escuro)',
                  border: `1px solid ${ativo ? 'var(--roxo-primario)' : 'var(--borda)'}`,
                  transition: 'all 0.15s',
                }}
              >
                {uf}
              </button>
            );
          })}
        </div>
        {valores.ufs?.length > 0 && (
          <small style={{ color: 'var(--texto-terciario)' }}>
            {valores.ufs.length} estado(s) selecionado(s)
          </small>
        )}
      </div>

      {/* Cidade */}
      <div className="mb-3">
        <label className="form-label fw-semibold" style={{ color: 'var(--roxo-escuro)' }}>
          Cidade
          {valores.cidades?.length > 1 && (
            <span style={{ marginLeft: '0.5rem', fontWeight: 400, fontSize: '0.78rem', color: 'var(--texto-terciario)' }}>
              · distribuição disponível abaixo
            </span>
          )}
        </label>
        <ListaComBusca
          itens={cidades}
          selecionados={valores.cidades || []}
          onChange={(novo) => onChange({ cidades: novo, bairros: [] })}
          placeholder="Buscar cidade..."
          carregando={carregandoCidades}
          desabilitado={!cidades.length && !carregandoCidades}
          msgVazia={
            !valores.ufs?.length
              ? 'Selecione um estado primeiro'
              : carregandoCidades
              ? 'Carregando...'
              : 'Nenhuma cidade encontrada'
          }
        />
        {erroCidades && !carregandoCidades && (
          <small className="d-block mt-1" style={{ color: 'var(--aviso, #b8860b)' }}>
            <i className="bi bi-exclamation-triangle-fill me-1" />
            Algumas cidades não carregaram. Desmarque e marque o estado de novo para tentar outra vez.
          </small>
        )}
      </div>

      {/* Bairro */}
      <div className="mb-1">
        <label className="form-label fw-semibold" style={{ color: 'var(--roxo-escuro)' }}>
          Bairro
          {valores.bairros?.length > 1 && (
            <span style={{ marginLeft: '0.5rem', fontWeight: 400, fontSize: '0.78rem', color: 'var(--texto-terciario)' }}>
              · distribuição disponível abaixo
            </span>
          )}
        </label>
        <ListaComBusca
          itens={bairros}
          selecionados={valores.bairros || []}
          onChange={(novo) => onChange({ bairros: novo })}
          placeholder="Buscar bairro..."
          carregando={carregandoBairros}
          desabilitado={!bairros.length && !carregandoBairros}
          msgVazia={
            !valores.cidades?.length
              ? 'Selecione uma cidade primeiro'
              : carregandoBairros
              ? 'Carregando...'
              : 'Nenhum bairro encontrado'
          }
        />
        {erroBairros && !carregandoBairros && (
          <small className="d-block mt-1" style={{ color: 'var(--aviso, #b8860b)' }}>
            <i className="bi bi-exclamation-triangle-fill me-1" />
            Alguns bairros não carregaram. Desmarque e marque a cidade de novo para tentar outra vez.
          </small>
        )}
      </div>

      {/* Alta Renda */}
      <div className="mt-3">
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem',
            cursor: 'pointer',
            padding: '0.75rem 1rem',
            borderRadius: altaRendaInfo ? 'var(--radius-sm) var(--radius-sm) 0 0' : 'var(--radius-sm)',
            border: `1.5px solid ${valores.altaRenda ? 'var(--laranja-primario)' : 'var(--borda)'}`,
            borderBottom: altaRendaInfo ? 'none' : undefined,
            background: valores.altaRenda ? '#fff8e1' : 'var(--fundo-secundario)',
            transition: 'all 0.2s',
          }}
        >
          <input
            type="checkbox"
            checked={!!valores.altaRenda}
            onChange={(e) => onChange({ altaRenda: e.target.checked })}
            style={{ accentColor: 'var(--laranja-primario)', marginTop: '2px', width: '16px', height: '16px', flexShrink: 0 }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: valores.altaRenda ? 'var(--laranja-hover)' : 'var(--roxo-escuro)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <i className="bi bi-stars" />
              Alta renda
              {carregandoAR && <span className="spinner-border spinner-border-sm ms-1" />}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--texto-terciario)', marginTop: '0.15rem', lineHeight: 1.4 }}>
              Filtra por bairros com perfil socioeconômico elevado mapeados para cada cidade selecionada.
            </div>
          </div>
        </label>

        {/* Resultado da busca de alta renda — uma entrada por cidade */}
        {altaRendaInfo && altaRendaInfo.length > 0 && (
          <div
            style={{
              border: '1.5px solid var(--laranja-primario)',
              borderTop: 'none',
              borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
              background: '#fffdf5',
              padding: '0.65rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
            }}
          >
            {altaRendaInfo.map(({ cidade, bairros: bAR, mapeada }) => (
              <div key={cidade}>
                {altaRendaInfo.length > 1 && (
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--roxo-escuro)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {cidade}
                  </div>
                )}
                {mapeada ? (
                  <>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--laranja-hover)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <i className="bi bi-check-circle-fill" />
                      {bAR.length} bairro{bAR.length !== 1 ? 's' : ''} mapeado{bAR.length !== 1 ? 's' : ''}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {bAR.map((b) => (
                        <span
                          key={b}
                          style={{
                            background: '#fef3c7',
                            color: '#92400e',
                            border: '1px solid #fcd34d',
                            borderRadius: '999px',
                            padding: '0.1rem 0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.82rem', color: '#92400e' }}>
                    <i className="bi bi-exclamation-triangle-fill" style={{ color: '#f59e0b', marginTop: '1px', flexShrink: 0 }} />
                    <span>
                      <strong>Nenhum bairro de alta renda mapeado</strong> para esta cidade.
                      {' '}Selecione os bairros manualmente no campo acima.
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Aviso quando alta renda está ativo sem cidade selecionada */}
        {valores.altaRenda && !altaRendaInfo && !carregandoAR && (
          <div
            style={{
              border: '1.5px solid var(--borda)',
              borderTop: 'none',
              borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
              background: 'var(--fundo-secundario)',
              padding: '0.5rem 1rem',
              fontSize: '0.8rem',
              color: 'var(--texto-terciario)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <i className="bi bi-info-circle" />
            Selecione pelo menos uma cidade para verificar os bairros mapeados.
          </div>
        )}
      </div>
    </div>
  );
}
