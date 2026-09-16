/**
 * services/authService.js
 * Funções de autenticação: login, refresh, logout, me
 */

import api from './api';
import { IS_MOCK, MOCK_USUARIO } from './mockData';

const MOCK_TOKEN = 'mock-token-dev';

export const authService = {
  /**
   * Login com usuário e senha.
   * Retorna { access_token, refresh_token, role, nome }
   */
  async login(email, senha) {
    if (IS_MOCK) {
      await new Promise((r) => setTimeout(r, 600)); // simula latência
      if (email === '1' && senha === '1') {
        return {
          access_token: MOCK_TOKEN,
          refresh_token: MOCK_TOKEN,
          role: MOCK_USUARIO.role,
          nome: MOCK_USUARIO.nome,
        };
      }
      const err = new Error('Credenciais inválidas');
      err.response = { status: 401, data: { erro: 'E-mail ou senha inválidos.' } };
      throw err;
    }
    const { data } = await api.post('/api/v1/auth/login_usuario', { email, senha });
    return data;
  },

  /** Renova o access token usando o refresh token */
  async refresh(refreshToken) {
    if (IS_MOCK) return { access_token: MOCK_TOKEN };
    const { data } = await api.post('/api/v1/auth/refresh', {
      refresh_token: refreshToken,
    });
    return data;
  },

  /** Revoga o token atual (logout no servidor) */
  async logout() {
    if (IS_MOCK) return;
    try {
      await api.post('/api/v1/auth/logout');
    } catch {
      // Ignora erros de rede no logout — limpa local de qualquer forma
    }
  },

  /** Retorna dados do usuário autenticado */
  async me() {
    if (IS_MOCK) {
      const token = localStorage.getItem('access_token');
      if (token === MOCK_TOKEN) return MOCK_USUARIO;
      throw new Error('Sem sessão mock');
    }
    const { data } = await api.get('/api/v1/auth/me');
    return data;
  },
};
