/**
 * components/enriquecimento/EnriquecimentoForm.jsx
 * Upload de CSV com CPFs ou telefones para enriquecimento de dados.
 */

import { useState, useRef } from 'react';
import Spinner from '../ui/Spinner';
import { IS_MOCK } from '../../services/mockData';
import { enriquecerLista } from '../../services/enriquecimentoService';

// ── Parsers ──────────────────────────────────────────────────────
function parsearCpfs(texto) {
  return texto
    .split(/[\n,;]+/)
    .map((l) => l.trim().replace(/\D/g, ''))
    .filter((v) => v.length === 11);
}

function parsearTelefones(texto) {
  return texto
    .split(/[\n,;]+/)
    .map((l) => l.trim().replace(/\D/g, ''))
    .filter((v) => v.length >= 10 && v.length <= 11);
}

// ── Mock de resultado ─────────────────────────────────────────────
function mockEnriquecer(itens) {
  const fatores = [0.72, 0.88, 0.55, 1.0, 0.63, 0.91, 0.80, 0.47];
  const encontrados = Math.round(itens.length * fatores[itens.length % fatores.length]);
  return {
    total_enviado: itens.length,
    total_encontrado: encontrados,
    arquivo_url: null, // sem download no mock
  };
}

// ── Componente ────────────────────────────────────────────────────
export default function EnriquecimentoForm() {
  const [tipo, setTipo] = useState('cpf'); // 'cpf' | 'telefone'
  const [arquivo, setArquivo] = useState(null);
  const [itens, setItens] = useState([]); // valores limpos do CSV
  const [arrastar, setArrastar] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);
  const inputRef = useRef(null);

  const parsear = (texto) =>
    tipo === 'cpf' ? parsearCpfs(texto) : parsearTelefones(texto);

  const processarArquivo = (file) => {
    if (!file) return;
    setArquivo(file);
    setResultado(null);
    setErro(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const lista = parsear(e.target.result);
      setItens(lista);
      if (lista.length === 0) {
        setErro(`Nenhum ${tipo === 'cpf' ? 'CPF válido (11 dígitos)' : 'telefone válido (10-11 dígitos)'} encontrado no arquivo.`);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setArrastar(false);
    const file = e.dataTransfer.files[0];
    if (file) processarArquivo(file);
  };

  const handleEnriquecer = async () => {
    if (itens.length === 0) return;
    setCarregando(true);
    setResultado(null);
    setErro(null);
    try {
      if (IS_MOCK) {
        await new Promise((r) => setTimeout(r, 800));
        setResultado(mockEnriquecer(itens));
      } else {
        setResultado(await enriquecerLista(tipo, itens));
      }
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao processar enriquecimento.');
    } finally {
      setCarregando(false);
    }
  };

  const handleLimpar = () => {
    setArquivo(null);
    setItens([]);
    setResultado(null);
    setErro(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleTipoChange = (novoTipo) => {
    setTipo(novoTipo);
    setArquivo(null);
    setItens([]);
    setResultado(null);
    setErro(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>

      {/* Cartão principal */}
      <div
        className="p-4"
        style={{
          background: 'var(--fundo-card)',
          border: '1px solid var(--borda)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 2px 8px var(--sombra)',
        }}
      >
        <h5 className="mb-1" style={{ color: 'var(--roxo-escuro)', fontWeight: 700 }}>
          <i className="bi bi-database-add me-2" style={{ color: 'var(--roxo-primario)' }} />
          Enriquecimento de dados
        </h5>
        <p className="mb-4" style={{ color: 'var(--texto-terciario)', fontSize: '0.88rem' }}>
          Envie um CSV com CPFs ou telefones e receba uma lista enriquecida com os dados disponíveis no banco.
        </p>

        {/* Tipo */}
        <div className="mb-4">
          <label className="form-label fw-semibold" style={{ color: 'var(--roxo-escuro)', fontSize: '0.88rem' }}>
            Tipo de dado no CSV
          </label>
          <div className="d-flex gap-2">
            {[
              { valor: 'cpf',      label: 'CPF',      icone: 'bi-person-vcard' },
              { valor: 'telefone', label: 'Telefone', icone: 'bi-telephone' },
            ].map(({ valor, label, icone }) => {
              const ativo = tipo === valor;
              return (
                <button
                  key={valor}
                  type="button"
                  onClick={() => handleTipoChange(valor)}
                  className="btn btn-sm flex-fill"
                  style={{
                    background: ativo ? 'var(--roxo-primario)' : 'var(--fundo-secundario)',
                    color: ativo ? '#fff' : 'var(--roxo-escuro)',
                    border: `1px solid ${ativo ? 'var(--roxo-primario)' : 'var(--borda)'}`,
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    padding: '0.5rem 1rem',
                  }}
                >
                  <i className={`bi ${icone} me-2`} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Área de upload */}
        <div className="mb-3">
          <label className="form-label fw-semibold" style={{ color: 'var(--roxo-escuro)', fontSize: '0.88rem' }}>
            Arquivo CSV
          </label>

          <div
            onDragOver={(e) => { e.preventDefault(); setArrastar(true); }}
            onDragLeave={() => setArrastar(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${arrastar ? 'var(--roxo-primario)' : arquivo ? 'var(--sucesso)' : 'var(--borda)'}`,
              borderRadius: 'var(--radius-md)',
              background: arrastar ? 'var(--roxo-claro)' : arquivo ? '#f1f8f1' : 'var(--fundo-secundario)',
              padding: '2rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.txt"
              style={{ display: 'none' }}
              onChange={(e) => processarArquivo(e.target.files[0])}
            />
            {arquivo ? (
              <>
                <i className="bi bi-file-earmark-check-fill" style={{ fontSize: '2rem', color: 'var(--sucesso)' }} />
                <div className="mt-2 fw-semibold" style={{ color: 'var(--texto-secundario)' }}>
                  {arquivo.name}
                </div>
                <div style={{ color: 'var(--texto-terciario)', fontSize: '0.82rem' }}>
                  {(arquivo.size / 1024).toFixed(1)} KB
                </div>
              </>
            ) : (
              <>
                <i className="bi bi-cloud-upload" style={{ fontSize: '2rem', color: 'var(--roxo-primario)' }} />
                <div className="mt-2 fw-semibold" style={{ color: 'var(--texto-secundario)' }}>
                  Arraste o arquivo aqui ou clique para selecionar
                </div>
                <div style={{ color: 'var(--texto-terciario)', fontSize: '0.82rem' }}>
                  .csv ou .txt — um {tipo === 'cpf' ? 'CPF' : 'telefone'} por linha
                </div>
              </>
            )}
          </div>
        </div>

        {/* Preview dos itens parseados */}
        {itens.length > 0 && (
          <div
            className="mb-3 p-3 rounded d-flex align-items-center justify-content-between"
            style={{ background: 'var(--roxo-claro)', border: '1px solid var(--borda)' }}
          >
            <div>
              <i className="bi bi-check-circle-fill me-2" style={{ color: 'var(--sucesso)' }} />
              <span style={{ color: 'var(--roxo-escuro)', fontWeight: 600 }}>
                {itens.length.toLocaleString('pt-BR')} {tipo === 'cpf' ? 'CPFs' : 'telefones'} válidos
              </span>
              <span style={{ color: 'var(--texto-terciario)', fontSize: '0.82rem', marginLeft: 8 }}>
                Ex: {itens.slice(0, 3).map((v) =>
                  tipo === 'cpf'
                    ? `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9)}`
                    : `(${v.slice(0,2)}) ${v.slice(2)}`
                ).join(', ')}
                {itens.length > 3 && ` ...`}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary py-0 px-2"
              style={{ fontSize: '0.78rem' }}
              onClick={handleLimpar}
            >
              <i className="bi bi-x" /> Limpar
            </button>
          </div>
        )}

        {/* Erro de parse */}
        {erro && !resultado && (
          <div className="mb-3 d-flex align-items-center gap-2 p-2 rounded"
            style={{ background: '#fdecea', border: '1px solid #f44336', fontSize: '0.85rem', color: '#c62828' }}>
            <i className="bi bi-exclamation-circle-fill" />
            {erro}
          </div>
        )}

        {/* Botão enriquecer */}
        <button
          type="button"
          onClick={handleEnriquecer}
          disabled={itens.length === 0 || carregando}
          className="btn w-100"
          style={{
            background: itens.length > 0 ? 'var(--laranja-primario)' : 'var(--borda)',
            color: itens.length > 0 ? '#fff' : 'var(--texto-terciario)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 700,
            fontSize: '0.95rem',
            padding: '0.6rem',
            transition: 'background 0.15s',
          }}
        >
          {carregando ? (
            <><Spinner tamanho="sm" cor="#fff" />&nbsp; Processando...</>
          ) : (
            <><i className="bi bi-database-add me-2" />Enriquecer lista</>
          )}
        </button>
      </div>

      {/* Painel de resultado */}
      {resultado && (
        <div
          className="mt-3 p-4"
          style={{
            background: 'var(--fundo-card)',
            border: '1px solid var(--borda)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 2px 8px var(--sombra)',
          }}
        >
          <h6 className="mb-3 fw-bold" style={{ color: 'var(--roxo-escuro)' }}>
            <i className="bi bi-clipboard2-data me-2" style={{ color: 'var(--roxo-primario)' }} />
            Resultado
          </h6>

          <div className="d-flex gap-3 mb-3">
            {[
              { label: 'Enviados',    valor: resultado.total_enviado,    icone: 'bi-upload',        cor: 'var(--roxo-primario)' },
              { label: 'Encontrados', valor: resultado.total_encontrado, icone: 'bi-person-check',  cor: 'var(--sucesso)' },
              { label: 'Não encontrados', valor: resultado.total_enviado - resultado.total_encontrado, icone: 'bi-person-x', cor: 'var(--aviso)' },
            ].map(({ label, valor, icone, cor }) => (
              <div
                key={label}
                className="flex-fill p-3 rounded text-center"
                style={{ background: 'var(--fundo-secundario)', border: '1px solid var(--borda)' }}
              >
                <i className={`bi ${icone} d-block mb-1`} style={{ color: cor, fontSize: '1.4rem' }} />
                <div style={{ fontWeight: 700, fontSize: '1.3rem', color: cor }}>
                  {valor.toLocaleString('pt-BR')}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--texto-terciario)' }}>{label}</div>
              </div>
            ))}
          </div>

          {resultado.download_iniciado && (
            <p className="text-success mb-0">Lista enriquecida gerada. O download foi iniciado.</p>
          )}
          {resultado.arquivo_url ? (
            <a
              href={resultado.arquivo_url}
              download
              className="btn w-100"
              style={{
                background: 'var(--sucesso)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 700,
                fontSize: '0.95rem',
                padding: '0.6rem',
              }}
            >
              <i className="bi bi-file-earmark-arrow-down me-2" />
              Baixar lista enriquecida (.xlsx)
            </a>
          ) : IS_MOCK ? (
            <div
              className="text-center p-2 rounded"
              style={{ background: '#fff9c4', border: '1px solid #f9a825', fontSize: '0.83rem', color: '#7a5800' }}
            >
              <i className="bi bi-info-circle me-1" />
              Download indisponível no modo mock.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
