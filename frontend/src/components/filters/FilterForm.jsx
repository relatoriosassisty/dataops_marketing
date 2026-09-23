/**
 * components/filters/FilterForm.jsx
 * Formulário completo de filtros — orquestra Location, Person e Phone.
 */

import { useState } from 'react';
import LocationFilters from './LocationFilters';
import PersonFilters from './PersonFilters';
import PhoneFilters from './PhoneFilters';
import DistribuicaoQuantidade from './DistribuicaoQuantidade';
import ExcluirCpfsUpload from './ExcluirCpfsUpload';
import { nomeBairro, partesBairro } from '../../utils/bairroChave';
import { buildConsultaPayload } from '../../utils/buildConsultaPayload';

const FILTROS_PADRAO = {
  // Localização
  ufs: [],
  cidades: [],
  bairros: [],
  altaRenda: false,
  // Perfil
  genero: '',
  idadeMin: 18,
  idadeMax: 70,
  email: 'nao_filtrar',
  // Telefone
  tipoTelefone: 'ambos',
  ddds: [],
  quantidade: 5000,
  // Profissão
  profissoes: [],
  // Distribuição de quantidade por estado, cidade e por bairro
  // (independentes). Chaves de bairro são "CIDADE::BAIRRO" (ver
  // utils/bairroChave.js) — evita confundir bairros de mesmo nome em
  // cidades diferentes. Distribuição por estado só aparece quando não há
  // distribuição por cidade ativa (cidade é mais específica).
  distribuicaoUfs: {},
  distribuicaoCidades: {},
  distribuicaoBairros: {},
  // Proporção de gênero: só se aplica quando genero === '' (Ambos) e
  // generoExato === true; por padrão pega o que houver disponível de cada
  // gênero, sem forçar uma proporção.
  generoExato: false,
  generoDistribuicao: { M: 50, F: 50 },
  // Exclusão de CPFs já obtidos: { token, quantidade, nomeArquivo } | null
  exclusaoCpfs: null,
};

export default function FilterForm({ onContagem, onGerar, carregando, temToken, onFiltrosChange }) {
  const [filtros, setFiltros] = useState(FILTROS_PADRAO);

  const atualizar = (parcial) => {
    setFiltros((prev) => {
      const next = { ...prev, ...parcial };
      // Limpa distribuições quando ufs, cidades ou bairros mudam
      if ('ufs' in parcial) {
        next.distribuicaoUfs = {};
      }
      if ('cidades' in parcial || 'ufs' in parcial) {
        next.distribuicaoCidades = {};
      }
      if ('bairros' in parcial || 'ufs' in parcial) {
        next.distribuicaoBairros = {};
      }
      // Reseta proporção de gênero ao mudar para M ou F
      if ('genero' in parcial && parcial.genero !== '') {
        next.generoExato = false;
        next.generoDistribuicao = { M: 50, F: 50 };
      }
      return next;
    });
    // Quantidade não invalida o token
    const camposMetadado = new Set(['quantidade']);
    const somenteMetadado = Object.keys(parcial).every((k) => camposMetadado.has(k));
    if (!somenteMetadado) {
      onFiltrosChange?.();
    }
  };

  const filtrosAtivos = Object.entries(filtros).filter(([k, v]) => {
    if (Array.isArray(v)) return v.length > 0;
    if (k === 'idadeMin') return v !== 18;
    if (k === 'idadeMax') return v !== 70;
    if (k === 'email') return v !== 'nao_filtrar';
    if (k === 'tipoTelefone') return v !== 'ambos';
    if (k === 'genero') return v !== '';
    if (k === 'quantidade') return v !== 5000;
    if (k === 'altaRenda') return v === true;
    if (k === 'exclusaoCpfs') return v != null;
    return false;
  }).length;

  const valido = filtros.ufs.length > 0;
  const buildPayload = () => buildConsultaPayload(filtros);

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      {/* Header do formulário */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', color: 'var(--roxo-escuro)', fontWeight: 700, marginBottom: '0.15rem' }}>
            Montar lista
          </h1>
          <p style={{ color: 'var(--texto-terciario)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
            1. Configure os filtros e faça o <strong>Levantamento</strong>.
            2. Confirme a disponibilidade e clique em <strong>Gerar Lista</strong>.
          </p>
        </div>
        {filtrosAtivos > 0 && (
          <span className="badge-filtro">
            <i className="bi bi-funnel-fill me-1" />
            {filtrosAtivos} filtro(s) ativo(s)
          </span>
        )}
      </div>

      <div className="row g-4">
        {/* Coluna esquerda: Localização */}
        <div className="col-lg-5">
          <div className="card-padrao h-100">
            <LocationFilters valores={filtros} onChange={atualizar} />
          </div>
        </div>

        {/* Coluna direita: Perfil + Telefone */}
        <div className="col-lg-7">
          <div className="card-padrao mb-4" style={{ position: 'relative' }}>
            <PersonFilters valores={filtros} onChange={atualizar} />
          </div>
          <div className="card-padrao" style={{ position: 'relative' }}>
            <PhoneFilters valores={filtros} onChange={atualizar} />
            <hr style={{ borderColor: 'var(--borda)' }} />
            <ExcluirCpfsUpload
              valor={filtros.exclusaoCpfs}
              onChange={(exclusaoCpfs) => atualizar({ exclusaoCpfs })}
            />
          </div>
        </div>
      </div>

      {/* Distribuição por estado — só quando não há distribuição por cidade
          ativa (cidade é mais específica e assume o controle da cota) */}
      {filtros.ufs.length > 1 && filtros.cidades.length <= 1 && (
        <div className="card-padrao mt-4">
          <DistribuicaoQuantidade
            itens={filtros.ufs}
            total={filtros.quantidade}
            valores={filtros.distribuicaoUfs}
            onChange={(d) => atualizar({ distribuicaoUfs: d })}
            label="uf"
          />
        </div>
      )}

      {/* Distribuição por cidade */}
      {filtros.cidades.length > 1 && (
        <div className="card-padrao mt-4">
          <DistribuicaoQuantidade
            itens={filtros.cidades}
            total={filtros.quantidade}
            valores={filtros.distribuicaoCidades}
            onChange={(d) => atualizar({ distribuicaoCidades: d })}
            label="cidade"
          />
        </div>
      )}

      {/* Distribuição por bairro — sem distribuição de cidade (total global) */}
      {filtros.bairros.length > 1 && filtros.cidades.length <= 1 && (
        <div className="card-padrao mt-4">
          <DistribuicaoQuantidade
            itens={filtros.bairros}
            total={filtros.quantidade}
            valores={filtros.distribuicaoBairros}
            onChange={(d) => atualizar({ distribuicaoBairros: d })}
            label="bairro"
            rotulos={Object.fromEntries(filtros.bairros.map((chave) => [chave, nomeBairro(chave)]))}
          />
        </div>
      )}

      {/* Distribuição por bairro — agrupada por cidade (totais relativos à cota de cada cidade) */}
      {filtros.bairros.length > 1 && filtros.cidades.length > 1 && (() => {
        const grupos = {};
        filtros.cidades.forEach((c) => { grupos[c] = []; });
        filtros.bairros.forEach((chave) => {
          const { cidade: c } = partesBairro(chave);
          if (c && grupos[c]) grupos[c].push(chave);
        });
        const cidadesComBairros = filtros.cidades.filter((c) => grupos[c]?.length > 0);
        if (!cidadesComBairros.length) return null;
        return (
          <div className="card-padrao mt-4">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <h2 className="section-header mb-0" style={{ fontSize: '0.95rem' }}>
                <i className="bi bi-sliders me-2" style={{ color: 'var(--roxo-primario)' }} />
                Distribuição por bairro
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--texto-terciario)', margin: '0 0 1rem' }}>
              Quantidades relativas à cota de cada cidade.
            </p>
            {cidadesComBairros.map((cidade) => {
              const totalCidade = Number(filtros.distribuicaoCidades[cidade]) || filtros.quantidade;
              const bairrosDaCidade = grupos[cidade];
              const valoresBairros = Object.fromEntries(
                bairrosDaCidade.map((chave) => [chave, filtros.distribuicaoBairros[chave] || 0])
              );
              return (
                <div key={cidade} style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--roxo-escuro)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <i className="bi bi-building" style={{ color: 'var(--roxo-primario)' }} />
                    {cidade}
                    <span style={{ color: 'var(--texto-terciario)', fontWeight: 400 }}>
                      — {totalCidade.toLocaleString('pt-BR')} registros
                    </span>
                  </div>
                  <DistribuicaoQuantidade
                    itens={bairrosDaCidade}
                    total={totalCidade}
                    valores={valoresBairros}
                    onChange={(d) => atualizar({ distribuicaoBairros: { ...filtros.distribuicaoBairros, ...d } })}
                    label="bairro"
                    semTitulo
                    rotulos={Object.fromEntries(bairrosDaCidade.map((chave) => [chave, nomeBairro(chave)]))}
                  />
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Aviso UF obrigatória */}
      {!valido && (
        <div
          className="d-flex align-items-center gap-2 mt-3 p-2 rounded"
          style={{ background: '#fff8e1', border: '1px solid var(--aviso)', fontSize: 'var(--font-size-sm)' }}
        >
          <i className="bi bi-exclamation-triangle-fill" style={{ color: 'var(--aviso)' }} />
          <span style={{ color: '#795548' }}>Selecione pelo menos um estado para continuar.</span>
        </div>
      )}

      {/* Ações */}
      <div className="d-flex gap-3 mt-4 flex-wrap align-items-center">
        <button
          type="button"
          className="btn btn-laranja px-4 py-2"
          disabled={!valido || carregando}
          onClick={() => onContagem(buildPayload())}
        >
          {carregando === 'contagem' ? (
            <><span className="spinner-border spinner-border-sm me-2" />Consultando...</>
          ) : (
            <><i className="bi bi-search me-2" />Levantamento</>
          )}
        </button>
        <button
          type="button"
          className="btn btn-roxo px-4 py-2"
          disabled={!valido || !temToken || carregando}
          title={!temToken ? 'Faça o levantamento primeiro' : ''}
          onClick={() => onGerar(buildPayload())}
        >
          {carregando === 'gerar' ? (
            <><span className="spinner-border spinner-border-sm me-2" />Gerando...</>
          ) : (
            <><i className="bi bi-lightning-fill me-2" />Gerar Lista</>
          )}
        </button>
        {temToken && (
          <span style={{ fontSize: '0.78rem', color: 'var(--sucesso)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="bi bi-check-circle-fill" />
            Levantamento pronto
          </span>
        )}
        <button
          type="button"
          className="btn btn-outline-secondary ms-auto"
          onClick={() => { setFiltros(FILTROS_PADRAO); onFiltrosChange?.(); }}
          disabled={carregando}
        >
          <i className="bi bi-arrow-counterclockwise me-1" />
          Limpar filtros
        </button>
      </div>
    </form>
  );
}
