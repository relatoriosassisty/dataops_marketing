/**
 * pages/LoginPage.jsx
 * Tela de login — redireciona para / se já autenticado.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginForm from '../components/auth/LoginForm';

export default function LoginPage() {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (usuario) navigate('/', { replace: true });
  }, [usuario, navigate]);

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100"
      style={{ background: 'linear-gradient(135deg, var(--roxo-escuro) 0%, var(--roxo-primario) 100%)' }}
    >
      <div style={{ width: '100%', maxWidth: '420px', padding: '1rem' }}>
        {/* Card de login */}
        <div className="card-padrao">
          {/* Logo / título */}
          <div className="text-center mb-4">
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--roxo-claro)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <i className="bi bi-list-columns-reverse" style={{ fontSize: '1.75rem', color: 'var(--roxo-primario)' }} />
            </div>
            <h1 style={{ fontSize: 'var(--font-size-xl)', color: 'var(--roxo-escuro)', fontWeight: 700, marginBottom: '0.25rem' }}>
              Gerador de Listas PF
            </h1>
            <p style={{ color: 'var(--texto-terciario)', fontSize: 'var(--font-size-sm)', marginBottom: 0 }}>
              Contatus — Acesso interno
            </p>
          </div>

          <LoginForm onSucesso={() => navigate('/', { replace: true })} />
        </div>

        <p className="text-center mt-3" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem' }}>
          Problemas de acesso? Contate o administrador.
        </p>
      </div>
    </div>
  );
}
