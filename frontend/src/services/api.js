/**
 * services/api.js
 * Instância Axios centralizada com:
 *  - baseURL via variável de ambiente
 *  - Interceptor de request: injeta Bearer token
 *  - Interceptor de response: renova token expirado (401) automaticamente
 */

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000, // 2 min — queries no banco podem demorar
});

/* ── Request: injeta token ────────────────────────────────── */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ── Response: trata 401 com refresh automático ───────────── */
let _renovando = false;
let _filaEspera = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (_renovando) {
        // Aguarda o refresh em andamento
        return new Promise((resolve, reject) => {
          _filaEspera.push({ resolve, reject });
        }).then(() => api(original));
      }

      _renovando = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('Sem refresh token');

        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || ''}/api/v1/auth/refresh`,
          { refresh_token: refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        localStorage.setItem('access_token', data.access_token);
        _filaEspera.forEach(({ resolve }) => resolve());
        _filaEspera = [];
        return api(original);
      } catch {
        // Refresh falhou → limpa sessão
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('usuario');
        _filaEspera.forEach(({ reject }) => reject(error));
        _filaEspera = [];
        window.location.href = '/login';
      } finally {
        _renovando = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
