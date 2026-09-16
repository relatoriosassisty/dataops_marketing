import axios from 'axios';

// A edição local acessa a API diretamente, sem sessão ou credenciais.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 1800000,
});

export default api;
