/**
 * components/auth/TrocarSenhaModal.jsx
 * Modal opcional para troca de senha.
 */

import { useState } from 'react';
import api from '../../services/api';

export default function TrocarSenhaModal({ onFechar }) {
  const [form, setForm] = useState({ senha_atual: '', senha_nova: '', confirmar: '' });
  const [erros, setErros] = useState({});
  const [erroServidor, setErroServidor] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [mostrar, setMostrar] = useState({ atual: false, nova: false, confirmar: false });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (erros[name]) setErros((p) => ({ ...p, [name]: '' }));
    if (erroServidor) setErroServidor('');
  };

  const toggleMostrar = (campo) => setMostrar((p) => ({ ...p, [campo]: !p[campo] }));

  const validar = () => {
    const e = {};
    if (!form.senha_atual) e.senha_atual = 'Informe a senha atual.';
    if (!form.senha_nova) {
      e.senha_nova = 'Informe a nova senha.';
    } else if (form.senha_nova.length < 8) {
      e.senha_nova = 'Mínimo 8 caracteres.';
    } else if (form.senha_nova === form.senha_atual) {
      e.senha_nova = 'A nova senha deve ser diferente da atual.';
    }
    if (!form.confirmar) {
      e.confirmar = 'Confirme a nova senha.';
    } else if (form.confirmar !== form.senha_nova) {
      e.confirmar = 'As senhas não coincidem.';
    }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const novosErros = validar();
    if (Object.keys(novosErros).length > 0) { setErros(novosErros); return; }
    setCarregando(true);
    try {
      await api.post('/api/v1/auth/trocar-senha', {
        senha_atual: form.senha_atual,
        senha_nova: form.senha_nova,
      });
      setSucesso(true);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.erro;
      if (status === 401) {
        setErros({ senha_atual: 'Senha atual incorreta.' });
      } else if (status === 400 && msg) {
        setErroServidor(msg);
      } else {
        setErroServidor('Erro ao alterar senha. Tente novamente.');
      }
    } finally {
      setCarregando(false);
    }
  };

  const inputSenha = (id, label, campo) => (
    <div className="mb-3">
      <label htmlFor={id} className="form-label fw-semibold" style={{ color: 'var(--roxo-escuro)', fontSize: '0.88rem' }}>
        {label}
      </label>
      <div className="input-group">
        <input
          id={id}
          name={campo}
          type={mostrar[campo] ? 'text' : 'password'}
          className={`form-control ${erros[campo] ? 'is-invalid' : ''}`}
          value={form[campo]}
          onChange={handleChange}
          disabled={carregando || sucesso}
          autoComplete="new-password"
        />
        <button type="button" className="btn btn-outline-secondary" tabIndex={-1}
          onClick={() => toggleMostrar(campo)}>
          <i className={`bi ${mostrar[campo] ? 'bi-eye-slash' : 'bi-eye'}`} />
        </button>
      </div>
      {erros[campo] && <div className="text-danger mt-1" style={{ fontSize: '0.8rem' }}>{erros[campo]}</div>}
    </div>
  );

  return (
    <div className="modal d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onFechar(); }}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 420 }}>
        <div className="modal-content" style={{ borderRadius: 'var(--radius)', border: 'none', boxShadow: 'var(--shadow-hover)' }}>

          {/* Header */}
          <div className="modal-header" style={{ background: 'var(--roxo-escuro)', borderRadius: 'var(--radius) var(--radius) 0 0', padding: '1rem 1.25rem' }}>
            <h5 className="modal-title" style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
              <i className="bi bi-shield-lock me-2" />
              Alterar Senha
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onFechar} />
          </div>

          {/* Body */}
          <div className="modal-body p-4">
            {sucesso ? (
              <div className="text-center py-2">
                <i className="bi bi-check-circle-fill mb-3" style={{ fontSize: '2.5rem', color: '#16a34a' }} />
                <p className="fw-semibold mb-1" style={{ color: 'var(--roxo-escuro)' }}>Senha alterada com sucesso!</p>
                <p className="text-muted mb-3" style={{ fontSize: '0.87rem' }}>Use a nova senha no próximo acesso.</p>
                <button className="btn btn-roxo px-4" onClick={onFechar}>Fechar</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                {erroServidor && (
                  <div className="d-flex align-items-start gap-2 mb-3 p-2 rounded"
                    style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', fontSize: '0.85rem' }}>
                    <i className="bi bi-exclamation-circle-fill mt-1 flex-shrink-0" style={{ color: '#dc2626' }} />
                    <span>{erroServidor}</span>
                  </div>
                )}

                {inputSenha('senha_atual', 'Senha atual', 'senha_atual')}
                <hr style={{ borderColor: 'var(--borda)', margin: '0.75rem 0' }} />
                {inputSenha('senha_nova', 'Nova senha', 'senha_nova')}
                {inputSenha('confirmar', 'Confirmar nova senha', 'confirmar')}

                <div className="d-flex gap-2 mt-4">
                  <button type="button" className="btn btn-outline-secondary flex-fill" onClick={onFechar} disabled={carregando}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-roxo flex-fill" disabled={carregando}>
                    {carregando
                      ? <><span className="spinner-border spinner-border-sm me-2" />Salvando...</>
                      : <><i className="bi bi-check2 me-1" />Salvar</>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
