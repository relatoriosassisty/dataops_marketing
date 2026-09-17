/**
 * components/filters/ExcluirCpfsUpload.jsx
 * Upload opcional de um CSV/TXT com CPFs a excluir do levantamento —
 * útil para reenviar uma lista já baixada antes e trazer só CPFs novos.
 */

import { useRef, useState } from 'react';
import { consultaService } from '../../services/consultaService';

export default function ExcluirCpfsUpload({ valor, onChange }) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const inputRef = useRef(null);

  const processarArquivo = async (file) => {
    if (!file) return;
    setCarregando(true);
    setErro(null);
    try {
      const resp = await consultaService.excluirCpfs(file);
      onChange({ token: resp.exclusao_token, quantidade: resp.quantidade, nomeArquivo: file.name });
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao processar o arquivo.');
      onChange(null);
    } finally {
      setCarregando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemover = () => {
    onChange(null);
    setErro(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="mb-1">
      <label className="form-label fw-semibold" style={{ color: 'var(--roxo-escuro)' }}>
        Excluir CPFs já obtidos <span style={{ fontWeight: 400, color: 'var(--texto-terciario)' }}>(opcional)</span>
      </label>

      {!valor ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.txt"
            className="form-control form-control-sm"
            disabled={carregando}
            onChange={(e) => processarArquivo(e.target.files[0])}
          />
          <small style={{ color: 'var(--texto-terciario)' }}>
            {carregando ? 'Enviando...' : 'Envie uma lista de CPFs (um por linha) para receber só CPFs novos.'}
          </small>
        </>
      ) : (
        <div
          className="d-flex align-items-center justify-content-between p-2 rounded"
          style={{ background: 'var(--roxo-claro)', border: '1px solid var(--borda)' }}
        >
          <span style={{ fontSize: '0.85rem', color: 'var(--roxo-escuro)' }}>
            <i className="bi bi-check-circle-fill me-2" style={{ color: 'var(--sucesso)' }} />
            {valor.quantidade.toLocaleString('pt-BR')} CPFs de "{valor.nomeArquivo}" serão excluídos
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary py-0 px-2"
            style={{ fontSize: '0.78rem' }}
            onClick={handleRemover}
          >
            <i className="bi bi-x" /> Remover
          </button>
        </div>
      )}

      {erro && (
        <div className="mt-1" style={{ fontSize: '0.8rem', color: '#c62828' }}>
          <i className="bi bi-exclamation-circle-fill me-1" />
          {erro}
        </div>
      )}
    </div>
  );
}
