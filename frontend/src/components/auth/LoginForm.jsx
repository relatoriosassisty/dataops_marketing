/**
 * components/auth/LoginForm.jsx
 * Formulário de login com e-mail e senha.
 */

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginForm({ onSucesso }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', senha: '' });
  const [erros, setErros] = useState({});          // erros de campo
  const [erroServidor, setErroServidor] = useState(''); // erro da API
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Limpa o erro do campo ao digitar
    if (erros[name]) setErros((prev) => ({ ...prev, [name]: '' }));
    if (erroServidor) setErroServidor('');
  };

  const validar = () => {
    const novos = {};
    if (!form.email.trim()) {
      novos.email = 'Informe o e-mail.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      novos.email = 'E-mail inválido.';
    }
    if (!form.senha) {
      novos.senha = 'Informe a senha.';
    }
    return novos;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const novosErros = validar();
    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros);
      return;
    }
    setCarregando(true);
    setErroServidor('');
    try {
      await login(form.email.trim(), form.senha);
      onSucesso?.();
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        setErroServidor('E-mail ou senha incorretos. Verifique e tente novamente.');
      } else if (status === 429) {
        setErroServidor('Muitas tentativas de acesso. Aguarde alguns minutos antes de tentar novamente.');
      } else if (status === 400) {
        setErroServidor('Dados inválidos. Verifique o e-mail e a senha.');
      } else if (!err.response) {
        setErroServidor('Não foi possível conectar ao servidor. Verifique sua conexão.');
      } else {
        setErroServidor('Ocorreu um erro inesperado. Tente novamente.');
      }
    } finally {
      setCarregando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>

      {/* Alerta de erro do servidor */}
      {erroServidor && (
        <div className="alert d-flex align-items-start gap-2 mb-3 py-2 px-3"
          style={{
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: 'var(--radius-sm)',
            color: '#991b1b',
            fontSize: '0.87rem',
          }}
          role="alert"
        >
          <i className="bi bi-exclamation-circle-fill mt-1 flex-shrink-0" style={{ color: '#dc2626' }} />
          <span>{erroServidor}</span>
        </div>
      )}

      {/* E-mail */}
      <div className="mb-3">
        <label htmlFor="email" className="form-label fw-semibold" style={{ color: 'var(--roxo-escuro)' }}>
          <i className="bi bi-envelope me-1" />
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className={`form-control ${erros.email ? 'is-invalid' : ''}`}
          placeholder="seu@email.com"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          disabled={carregando}
          autoFocus
        />
        {erros.email && (
          <div className="invalid-feedback">{erros.email}</div>
        )}
      </div>

      {/* Senha */}
      <div className="mb-4">
        <label htmlFor="senha" className="form-label fw-semibold" style={{ color: 'var(--roxo-escuro)' }}>
          <i className="bi bi-lock me-1" />
          Senha
        </label>
        <div className={`input-group ${erros.senha ? 'is-invalid' : ''}`}>
          <input
            id="senha"
            name="senha"
            type={mostrarSenha ? 'text' : 'password'}
            className={`form-control ${erros.senha ? 'is-invalid' : ''}`}
            placeholder="Digite sua senha"
            value={form.senha}
            onChange={handleChange}
            autoComplete="current-password"
            disabled={carregando}
          />
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setMostrarSenha((v) => !v)}
            tabIndex={-1}
            aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
          >
            <i className={`bi ${mostrarSenha ? 'bi-eye-slash' : 'bi-eye'}`} />
          </button>
        </div>
        {erros.senha && (
          <div className="text-danger mt-1" style={{ fontSize: '0.875em' }}>{erros.senha}</div>
        )}
      </div>

      <button
        type="submit"
        className="btn btn-roxo w-100 py-2"
        disabled={carregando}
      >
        {carregando ? (
          <>
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
            Entrando...
          </>
        ) : (
          <>
            <i className="bi bi-box-arrow-in-right me-2" />
            Entrar
          </>
        )}
      </button>
    </form>
  );
}
