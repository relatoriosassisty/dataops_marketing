/**
 * contexts/AuthContext.jsx
 * Estado global de autenticação: token, usuário, login(), logout()
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('usuario')) || null;
    } catch {
      return null;
    }
  });
  const [carregando, setCarregando] = useState(true);

  /* Valida sessão salva ao carregar a página */
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setCarregando(false);
      return;
    }
    authService
      .me()
      .then((dados) => setUsuario(dados))
      .catch(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('usuario');
        setUsuario(null);
      })
      .finally(() => setCarregando(false));
  }, []);

  const login = useCallback(async (email, senha) => {
    const dados = await authService.login(email, senha);
    localStorage.setItem('access_token', dados.access_token);
    localStorage.setItem('refresh_token', dados.refresh_token);
    const usuarioDados = { email, nome: dados.nome || email, role: dados.role };
    localStorage.setItem('usuario', JSON.stringify(usuarioDados));
    setUsuario(usuarioDados);
    return dados;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, carregando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
