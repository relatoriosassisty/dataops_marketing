/**
 * pages/HomePage.jsx
 * Página principal — formulário de filtros + resultados.
 */

import { useState } from 'react';
import FilterForm from '../components/filters/FilterForm';
import ResultPanel from '../components/results/ResultPanel';
import Toast from '../components/ui/Toast';
import EnriquecimentoForm from '../components/enriquecimento/EnriquecimentoForm';
import { consultaService } from '../services/consultaService';
import { IS_MOCK } from '../services/mockData';

export default function HomePage() {
  const [resultadoEstado, setResultadoEstado] = useState('idle'); // idle | carregando | contagem | pronto | erro
  const [resultadoDados, setResultadoDados] = useState(null);
  const [carregando, setCarregando] = useState(null); // null | 'contagem' | 'gerar'
  const [toast, setToast] = useState(null);
  const [resultadoToken, setResultadoToken] = useState(null);
  const [aba, setAba] = useState('gerador'); // 'gerador' | 'enriquecimento'

  const mostrarToast = (tipo, mensagem) => {
    setToast({ tipo, mensagem });
    setTimeout(() => setToast(null), 4000);
  };

  const handleContagem = async (payload) => {
    setCarregando('contagem');
    setResultadoEstado('carregando');
    setResultadoDados(null);
    setResultadoToken(null);
    try {
      const dados = await consultaService.contagem(payload);
      setResultadoEstado('contagem');
      setResultadoDados(dados);
      setResultadoToken(dados.resultado_token ?? null);
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao realizar levantamento.';
      setResultadoEstado('erro');
      setResultadoDados({ mensagem: msg });
      mostrarToast('erro', msg);
    } finally {
      setCarregando(null);
    }
  };

  const handleGerar = async (payload) => {
    if (!resultadoToken) {
      mostrarToast('aviso', 'Faça o levantamento antes de gerar a lista.');
      return;
    }
    setCarregando('gerar');
    setResultadoEstado('carregando');
    try {
      const gerarPayload = {
        resultado_token: resultadoToken,
        quantidade: payload.quantidade,
      };
      const dados = await consultaService.gerarLista(gerarPayload);
      setResultadoEstado('pronto');
      setResultadoDados(dados);
      mostrarToast('sucesso', 'Lista gerada! Download iniciado.');
    } catch (err) {
      const status = err.response?.status;
      const msg = status === 410
        ? 'Levantamento expirado (30 min). Refaça o levantamento.'
        : err.response?.data?.erro || 'Erro ao gerar a lista.';
      if (status === 410) {
        setResultadoToken(null);
        setResultadoEstado('idle');
        setResultadoDados(null);
      } else {
        setResultadoEstado('erro');
        setResultadoDados({ mensagem: msg });
      }
      mostrarToast('erro', msg);
    } finally {
      setCarregando(null);
    }
  };

  const handleDownload = () => {
    if (IS_MOCK) {
      mostrarToast('aviso', 'Download indisponível no modo mock. Conecte a API real para baixar arquivos.');
      return;
    }
    if (!resultadoDados?.registros) return;
    const url = resultadoDados?.arquivo_url;
    if (url) {
      window.open(url, '_blank');
    } else {
      mostrarToast('aviso', 'URL de download não disponível.');
    }
  };

  const handleLimpar = () => {
    setResultadoEstado('idle');
    setResultadoDados(null);
    setResultadoToken(null);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--fundo-pagina)' }}>
      {/* Navbar */}
      <nav
        style={{
          background: 'var(--roxo-escuro)',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-list-columns-reverse" style={{ color: 'var(--roxo-texto)', fontSize: '1.4rem' }} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
            Gerador de Listas PF
          </span>
          <span
            style={{
              background: 'var(--laranja-primario)',
              color: '#fff',
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '0.1rem 0.4rem',
              borderRadius: '4px',
              letterSpacing: '0.05em',
            }}
          >
            CONTATUS
          </span>
          {IS_MOCK && (
            <span
              style={{
                background: '#ffd600',
                color: '#333',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '0.1rem 0.5rem',
                borderRadius: '4px',
                letterSpacing: '0.05em',
              }}
            >
              MOCK
            </span>
          )}
        </div>
        <span style={{ color: "#fff", fontSize: "0.85rem" }}>versão local · uso provisório</span>
      </nav>

      {/* Abas */}
      <div style={{ background: 'var(--roxo-escuro)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem', display: 'flex', gap: '0.25rem' }}>
          {[
            { id: 'gerador',        label: 'Gerador de listas',  icone: 'bi-list-columns-reverse' },
            { id: 'enriquecimento', label: 'Enriquecimento',      icone: 'bi-database-add' },
          ].map(({ id, label, icone }) => {
            const ativo = aba === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setAba(id)}
                style={{
                  background: ativo ? 'var(--fundo-pagina)' : 'transparent',
                  color: ativo ? 'var(--roxo-escuro)' : 'var(--roxo-texto)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                  padding: '0.6rem 1.2rem',
                  fontWeight: ativo ? 700 : 500,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <i className={`bi ${icone} me-2`} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo principal */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        {aba === 'gerador' && (
          <>
            <FilterForm
              onContagem={handleContagem}
              onGerar={handleGerar}
              carregando={carregando}
              temToken={!!resultadoToken}
              onFiltrosChange={() => setResultadoToken(null)}
            />
            <ResultPanel
              estado={resultadoEstado}
              dados={resultadoDados}
              onDownload={handleDownload}
              onLimpar={handleLimpar}
            />
          </>
        )}
        {aba === 'enriquecimento' && <EnriquecimentoForm />}
      </main>

      {/* Toast */}
      {toast && (
        <Toast tipo={toast.tipo} mensagem={toast.mensagem} onClose={() => setToast(null)} />
      )}

    </div>
  );
}
