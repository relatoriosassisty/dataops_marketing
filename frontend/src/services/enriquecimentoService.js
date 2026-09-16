import api from './api';
import { baixarArquivo, interpretarErroDownload } from './download';

export async function enriquecerLista(tipo, itens) {
  const form = new FormData();
  form.append('tipo', tipo);
  form.append('arquivo', new Blob([itens.join('\n')], { type: 'text/csv' }), 'entrada.csv');
  try {
    const response = await api.post('/api/v1/enriquecimento', form, { responseType: 'blob' });
    baixarArquivo(response, 'enriquecimento.xlsx');
    return {
      total_enviado: Number(response.headers['x-enviados'] ?? itens.length),
      total_encontrado: Number(response.headers['x-encontrados'] ?? 0),
      download_iniciado: true,
    };
  } catch (error) {
    throw await interpretarErroDownload(error);
  }
}
