/**
 * components/filters/PhoneFilters.jsx
 * Filtros: Tipo de telefone, DDD/Região, Quantidade
 */

import { useRef, useState } from 'react';

// Mapeamento completo de todos os DDDs brasileiros com sua região
const TODOS_DDDS = [
  { ddd: '11', regiao: 'SP — São Paulo (capital)' },
  { ddd: '12', regiao: 'SP — São José dos Campos' },
  { ddd: '13', regiao: 'SP — Santos' },
  { ddd: '14', regiao: 'SP — Bauru' },
  { ddd: '15', regiao: 'SP — Sorocaba' },
  { ddd: '16', regiao: 'SP — Ribeirão Preto' },
  { ddd: '17', regiao: 'SP — São José do Rio Preto' },
  { ddd: '18', regiao: 'SP — Presidente Prudente' },
  { ddd: '19', regiao: 'SP — Campinas' },
  { ddd: '21', regiao: 'RJ — Rio de Janeiro' },
  { ddd: '22', regiao: 'RJ — Campos dos Goytacazes' },
  { ddd: '24', regiao: 'RJ — Volta Redonda' },
  { ddd: '27', regiao: 'ES — Vitória' },
  { ddd: '28', regiao: 'ES — Cachoeiro de Itapemirim' },
  { ddd: '31', regiao: 'MG — Belo Horizonte' },
  { ddd: '32', regiao: 'MG — Juiz de Fora' },
  { ddd: '33', regiao: 'MG — Governador Valadares' },
  { ddd: '34', regiao: 'MG — Uberlândia' },
  { ddd: '35', regiao: 'MG — Poços de Caldas' },
  { ddd: '37', regiao: 'MG — Divinópolis' },
  { ddd: '38', regiao: 'MG — Montes Claros' },
  { ddd: '41', regiao: 'PR — Curitiba' },
  { ddd: '42', regiao: 'PR — Ponta Grossa' },
  { ddd: '43', regiao: 'PR — Londrina' },
  { ddd: '44', regiao: 'PR — Maringá' },
  { ddd: '45', regiao: 'PR — Cascavel' },
  { ddd: '46', regiao: 'PR — Francisco Beltrão' },
  { ddd: '47', regiao: 'SC — Joinville' },
  { ddd: '48', regiao: 'SC — Florianópolis' },
  { ddd: '49', regiao: 'SC — Chapecó' },
  { ddd: '51', regiao: 'RS — Porto Alegre' },
  { ddd: '53', regiao: 'RS — Pelotas' },
  { ddd: '54', regiao: 'RS — Caxias do Sul' },
  { ddd: '55', regiao: 'RS — Santa Maria' },
  { ddd: '61', regiao: 'DF — Brasília' },
  { ddd: '62', regiao: 'GO — Goiânia' },
  { ddd: '63', regiao: 'TO — Palmas' },
  { ddd: '64', regiao: 'GO — Rio Verde' },
  { ddd: '65', regiao: 'MT — Cuiabá' },
  { ddd: '66', regiao: 'MT — Rondonópolis' },
  { ddd: '67', regiao: 'MS — Campo Grande' },
  { ddd: '68', regiao: 'AC — Rio Branco' },
  { ddd: '69', regiao: 'RO — Porto Velho' },
  { ddd: '71', regiao: 'BA — Salvador' },
  { ddd: '73', regiao: 'BA — Ilhéus' },
  { ddd: '74', regiao: 'BA — Juazeiro' },
  { ddd: '75', regiao: 'BA — Feira de Santana' },
  { ddd: '77', regiao: 'BA — Vitória da Conquista' },
  { ddd: '79', regiao: 'SE — Aracaju' },
  { ddd: '81', regiao: 'PE — Recife' },
  { ddd: '82', regiao: 'AL — Maceió' },
  { ddd: '83', regiao: 'PB — João Pessoa' },
  { ddd: '84', regiao: 'RN — Natal' },
  { ddd: '85', regiao: 'CE — Fortaleza' },
  { ddd: '86', regiao: 'PI — Teresina' },
  { ddd: '87', regiao: 'PE — Petrolina' },
  { ddd: '88', regiao: 'CE — Juazeiro do Norte' },
  { ddd: '89', regiao: 'PI — Picos' },
  { ddd: '91', regiao: 'PA — Belém' },
  { ddd: '92', regiao: 'AM — Manaus' },
  { ddd: '93', regiao: 'PA — Santarém' },
  { ddd: '94', regiao: 'PA — Marabá' },
  { ddd: '95', regiao: 'RR — Boa Vista' },
  { ddd: '96', regiao: 'AP — Macapá' },
  { ddd: '97', regiao: 'AM — Coari' },
  { ddd: '98', regiao: 'MA — São Luís' },
  { ddd: '99', regiao: 'MA — Imperatriz' },
];

export default function PhoneFilters({ valores, onChange }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const dropdownRef = useRef(null);

  const dddsAtivos = valores.ddds || [];

  const opcoesFiltradas = TODOS_DDDS.filter(
    ({ ddd, regiao }) =>
      busca === '' ||
      ddd.includes(busca) ||
      regiao.toLowerCase().includes(busca.toLowerCase())
  );

  const toggleDDD = (ddd) => {
    const novo = dddsAtivos.includes(ddd)
      ? dddsAtivos.filter((d) => d !== ddd)
      : [...dddsAtivos, ddd];
    onChange({ ddds: novo });
  };

  const removerDDD = (ddd) => onChange({ ddds: dddsAtivos.filter((d) => d !== ddd) });

  const limparDDDs = () => onChange({ ddds: [] });

  // Fecha ao clicar fora
  const handleBlur = (e) => {
    if (!dropdownRef.current?.contains(e.relatedTarget)) {
      setAberto(false);
      setBusca('');
    }
  };

  return (
    <div>
      <h2 className="section-header">
        <i className="bi bi-telephone-fill" style={{ color: 'var(--roxo-primario)' }} />
        Telefone
      </h2>

      {/* Tipo */}
      <div className="mb-3">
        <label className="form-label fw-semibold" style={{ color: 'var(--roxo-escuro)' }}>
          Tipo de Telefone
        </label>
        <div className="d-flex gap-2">
          {[
            { valor: 'ambos', label: 'Ambos',  icone: 'bi-telephone' },
            { valor: 'movel', label: 'Celular', icone: 'bi-phone' },
            { valor: 'fixo',  label: 'Fixo',    icone: 'bi-telephone-fill' },
          ].map(({ valor, label, icone }) => {
            const ativo = (valores.tipoTelefone || 'ambos') === valor;
            return (
              <button
                key={valor}
                type="button"
                onClick={() => onChange({ tipoTelefone: valor })}
                className="btn btn-sm flex-fill"
                style={{
                  background: ativo ? 'var(--roxo-primario)' : 'var(--fundo-secundario)',
                  color: ativo ? '#fff' : 'var(--roxo-escuro)',
                  border: `1px solid ${ativo ? 'var(--roxo-primario)' : 'var(--borda)'}`,
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                <i className={`bi ${icone} me-1`} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* DDD — dropdown com multi-seleção */}
      <div className="mb-3" ref={dropdownRef} onBlur={handleBlur}>
        <label className="form-label fw-semibold" style={{ color: 'var(--roxo-escuro)' }}>
          DDD
          {dddsAtivos.length > 0 && (
            <span className="badge-filtro ms-2">{dddsAtivos.length} selecionado(s)</span>
          )}
        </label>

        {/* Trigger do dropdown */}
        <div
          tabIndex={0}
          onClick={() => setAberto((v) => !v)}
          onKeyDown={(e) => e.key === 'Enter' && setAberto((v) => !v)}
          style={{
            border: `1.5px solid ${aberto ? 'var(--roxo-primario)' : 'var(--borda)'}`,
            borderRadius: 'var(--radius-sm)',
            padding: '0.45rem 0.75rem',
            cursor: 'pointer',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: '42px',
            flexWrap: 'wrap',
            gap: '0.3rem',
            boxShadow: aberto ? '0 0 0 0.2rem rgba(123,31,162,0.15)' : 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
        >
          {dddsAtivos.length === 0 ? (
            <span style={{ color: 'var(--texto-terciario)', fontSize: '0.9rem' }}>
              Todos os DDDs (sem filtro)
            </span>
          ) : (
            <div className="d-flex flex-wrap gap-1" style={{ flex: 1 }}>
              {dddsAtivos.map((ddd) => {
                const info = TODOS_DDDS.find((d) => d.ddd === ddd);
                return (
                  <span
                    key={ddd}
                    style={{
                      background: 'var(--roxo-primario)',
                      color: '#fff',
                      borderRadius: '4px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      padding: '0.1rem 0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    {ddd}
                    <span style={{ fontSize: '0.68rem', opacity: 0.85, fontWeight: 400 }}>
                      ({info?.regiao.split(' — ')[0]})
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removerDDD(ddd); }}
                      style={{ background: 'none', border: 'none', color: '#fff', padding: 0, cursor: 'pointer', lineHeight: 1 }}
                      aria-label={`Remover DDD ${ddd}`}
                    >
                      <i className="bi bi-x" style={{ fontSize: '0.9rem' }} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          <div className="d-flex align-items-center gap-2 ms-1">
            {dddsAtivos.length > 0 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); limparDDDs(); }}
                style={{ background: 'none', border: 'none', color: 'var(--texto-terciario)', padding: 0, cursor: 'pointer', fontSize: '0.85rem' }}
                aria-label="Limpar DDDs"
              >
                <i className="bi bi-x-circle" />
              </button>
            )}
            <i
              className={`bi bi-chevron-${aberto ? 'up' : 'down'}`}
              style={{ color: 'var(--texto-terciario)', fontSize: '0.8rem', flexShrink: 0 }}
            />
          </div>
        </div>

        {/* Painel do dropdown */}
        {aberto && (
          <div
            style={{
              position: 'absolute',
              zIndex: 100,
              background: '#fff',
              border: '1.5px solid var(--roxo-primario)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-hover)',
              width: '100%',
              maxWidth: '420px',
              marginTop: '4px',
            }}
          >
            {/* Busca */}
            <div style={{ padding: '0.5rem' }}>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Buscar DDD ou região..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Lista de opções */}
            <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
              {opcoesFiltradas.length === 0 ? (
                <div style={{ padding: '0.75rem 1rem', color: 'var(--texto-terciario)', fontSize: '0.85rem' }}>
                  Nenhum DDD encontrado
                </div>
              ) : (
                opcoesFiltradas.map(({ ddd, regiao }) => {
                  const ativo = dddsAtivos.includes(ddd);
                  return (
                    <div
                      key={ddd}
                      onClick={(e) => { e.stopPropagation(); toggleDDD(ddd); }}
                      style={{
                        padding: '0.5rem 0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        background: ativo ? 'var(--fundo-secundario)' : '#fff',
                        borderLeft: ativo ? '3px solid var(--roxo-primario)' : '3px solid transparent',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => { if (!ativo) e.currentTarget.style.background = '#fafafa'; }}
                      onMouseLeave={(e) => { if (!ativo) e.currentTarget.style.background = '#fff'; }}
                    >
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '3px',
                          border: `2px solid ${ativo ? 'var(--roxo-primario)' : 'var(--borda)'}`,
                          background: ativo ? 'var(--roxo-primario)' : '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {ativo && <i className="bi bi-check" style={{ color: '#fff', fontSize: '0.75rem' }} />}
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--roxo-escuro)', minWidth: '28px', fontSize: '0.9rem' }}>
                        {ddd}
                      </span>
                      <span style={{ color: 'var(--texto-secundario)', fontSize: '0.82rem' }}>
                        {regiao}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '0.4rem 0.9rem',
                borderTop: '1px solid var(--borda)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--texto-terciario)' }}>
                {dddsAtivos.length === 0 ? 'Nenhum selecionado' : `${dddsAtivos.length} de ${TODOS_DDDS.length} selecionados`}
              </span>
              {dddsAtivos.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); limparDDDs(); }}
                  style={{ background: 'none', border: 'none', color: 'var(--roxo-primario)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Limpar tudo
                </button>
              )}
            </div>
          </div>
        )}

        <small style={{ color: 'var(--texto-terciario)' }}>
          Sem seleção = todos os DDDs
        </small>
      </div>

      {/* Quantidade */}
      <div className="mb-1">
        <label className="form-label fw-semibold" style={{ color: 'var(--roxo-escuro)' }}>
          Quantidade máxima
          <span className="badge-filtro ms-2">máx. 500.000</span>
        </label>
        <input
          type="number"
          className="form-control"
          min={100}
          max={500000}
          step={100}
          value={valores.quantidade ?? 5000}
          onChange={(e) => onChange({ quantidade: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}
