/**
 * services/consultaService.js
 * Funções de consulta ao banco via API
 */

import api from './api';
import { IS_MOCK, mockContagem, mockGerarLista } from './mockData';

export const consultaService = {
  /**
   * Apenas contagem — não retorna dados pessoais.
   */
  async contagem(filtros) {
    if (IS_MOCK) {
      await new Promise((r) => setTimeout(r, 1200));
      return mockContagem(filtros);
    }
    const { data } = await api.post('/api/v1/consulta/contagem', filtros);
    return data;
  },

  /**
   * Preview com amostra mascarada (máx 50 registros).
   */
  async preview(filtros) {
    if (IS_MOCK) {
      await new Promise((r) => setTimeout(r, 800));
      return { registros: [], total: 0 };
    }
    const { data } = await api.post('/api/v1/consulta/preview', filtros);
    return data;
  },

  /**
   * Gera a lista completa e dispara o download do .xlsx.
   * Requer o token retornado pelo levantamento.
   */
  async gerarLista(payload) {
    if (IS_MOCK) {
      await new Promise((r) => setTimeout(r, 2000));
      return mockGerarLista(payload);
    }
    try {
      const response = await api.post('/api/v1/consulta/gerar', payload, {
        responseType: 'blob',
      });
      // Dispara o download no browser
      const disposition = response.headers['content-disposition'] || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match ? match[1] : 'lista.xlsx';
      const url = URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { download_iniciado: true };
    } catch (err) {
      // Se o backend retornou erro como blob, converte para JSON legível
      if (err.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          err.response.data = JSON.parse(text);
        } catch (_) { /* mantém o blob se não for JSON */ }
      }
      throw err;
    }
  },
};
