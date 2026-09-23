/**
 * services/consultaService.js
 * Funções de consulta ao banco via API
 */

import api from './api';
import { IS_MOCK, mockContagem, mockGerarLista } from './mockData';
import { aguardarJob } from '../utils/progresso';

export const consultaService = {
  /**
   * Envia um CSV/TXT com CPFs a excluir do próximo levantamento.
   * Retorna { exclusao_token, quantidade }.
   */
  async excluirCpfs(arquivo) {
    if (IS_MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      return { ok: true, exclusao_token: 'mock-token', quantidade: 0 };
    }
    const formData = new FormData();
    formData.append('arquivo', arquivo);
    const { data } = await api.post('/api/v1/consulta/excluir-cpfs', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /**
   * Apenas contagem — não retorna dados pessoais.
   * Roda em segundo plano no backend e informa o andamento por `onProgresso`
   * ({ coletados, meta }); `meta` nulo = sem total definido.
   */
  async contagem(filtros, onProgresso) {
    if (IS_MOCK) {
      for (const coletados of [0, 0.3, 0.6, 0.9]) {
        onProgresso?.({ coletados: Math.round((filtros.quantidade ?? 1000) * coletados), meta: filtros.quantidade ?? 1000 });
        await new Promise((r) => setTimeout(r, 300));
      }
      return mockContagem(filtros);
    }
    return aguardarJob({
      iniciar: async () => (await api.post('/api/v1/consulta/contagem/iniciar', filtros)).data.job_id,
      consultar: async (jobId) => (await api.get(`/api/v1/consulta/contagem/job/${jobId}`)).data,
      onProgresso,
    });
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
