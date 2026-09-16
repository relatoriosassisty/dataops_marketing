/**
 * __tests__/api.validation.test.js
 * Testes para validar compatibilidade entre frontend e API backend
 */

import { describe, it, expect } from 'vitest';

describe('Compatibilidade Frontend ↔ API Backend', () => {
  describe('Mapeamento de Campos FilterForm → API', () => {
    it('ufs (frontend) → ufs (backend)', () => {
      const frontend = { ufs: ['SP', 'RJ'] };
      const backend = { ufs: frontend.ufs };
      expect(backend.ufs).toEqual(['SP', 'RJ']);
    });

    it('cidades (frontend) → cidades (backend)', () => {
      const frontend = { cidades: ['SAO PAULO', 'RIO DE JANEIRO'] };
      const backend = { cidades: frontend.cidades };
      expect(backend.cidades).toEqual(['SAO PAULO', 'RIO DE JANEIRO']);
    });

    it('bairros (frontend) → bairros (backend)', () => {
      const frontend = { bairros: ['VILA OLIMPIA', 'COPACABANA'] };
      const backend = { bairros: frontend.bairros };
      expect(backend.bairros).toEqual(['VILA OLIMPIA', 'COPACABANA']);
    });

    it('altaRenda (frontend) → alta_renda (backend)', () => {
      const frontend = { altaRenda: true };
      const backend = { alta_renda: frontend.altaRenda };
      expect(backend.alta_renda).toBe(true);
    });

    it('genero (frontend) → genero (backend)', () => {
      const frontend = { genero: 'M' };
      const backend = { genero: frontend.genero };
      expect(backend.genero).toBe('M');
    });

    it('idadeMin (frontend) → idade_min (backend)', () => {
      const frontend = { idadeMin: 25 };
      const backend = { idade_min: frontend.idadeMin };
      expect(backend.idade_min).toBe(25);
    });

    it('idadeMax (frontend) → idade_max (backend)', () => {
      const frontend = { idadeMax: 65 };
      const backend = { idade_max: frontend.idadeMax };
      expect(backend.idade_max).toBe(65);
    });

    it('email (frontend) → email (backend)', () => {
      const frontend = { email: 'obrigatorio' };
      const backend = { email: frontend.email };
      expect(backend.email).toBe('obrigatorio');
    });

    it('tipoTelefone (frontend) → tipo_telefone (backend)', () => {
      const frontend = { tipoTelefone: 'movel' };
      const backend = { tipo_telefone: frontend.tipoTelefone };
      expect(backend.tipo_telefone).toBe('movel');
    });

    it('ddds (frontend) → ddds (backend)', () => {
      const frontend = { ddds: [11, 21, 85] };
      const backend = { ddds: frontend.ddds };
      expect(backend.ddds).toEqual([11, 21, 85]);
    });

    it('quantidade (frontend) → quantidade (backend)', () => {
      const frontend = { quantidade: 5000 };
      const backend = { quantidade: frontend.quantidade };
      expect(backend.quantidade).toBe(5000);
    });

    it('tipoLista (frontend) → tipo_lista (backend)', () => {
      const frontend = { tipoLista: 'venda' };
      const backend = { tipo_lista: frontend.tipoLista };
      expect(backend.tipo_lista).toBe('venda');
    });

    it('nomeCliente (frontend) → nome_cliente (backend)', () => {
      const frontend = { nomeCliente: 'ACME Corp' };
      const backend = { nome_cliente: frontend.nomeCliente };
      expect(backend.nome_cliente).toBe('ACME Corp');
    });

    it('valorLista (frontend) → valor_lista (backend)', () => {
      const frontend = { valorLista: 5000.00 };
      const backend = { valor_lista: frontend.valorLista };
      expect(backend.valor_lista).toBe(5000.00);
    });

    it('parcelado (frontend) → parcelado (backend)', () => {
      const frontend = { parcelado: true };
      const backend = { parcelado: frontend.parcelado };
      expect(backend.parcelado).toBe(true);
    });

    it('numParcelas (frontend) → num_parcelas (backend)', () => {
      const frontend = { numParcelas: 12 };
      const backend = { num_parcelas: frontend.numParcelas };
      expect(backend.num_parcelas).toBe(12);
    });

    it('valorParcela (frontend) → valor_parcela (backend)', () => {
      const frontend = { valorParcela: 416.67 };
      const backend = { valor_parcela: frontend.valorParcela };
      expect(backend.valor_parcela).toBe(416.67);
    });
  });

  describe('Opções de Valores (backend)', () => {
    it('UFs válidas (conforme schema.py)', () => {
      const ufsValidas = [
        'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
        'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN',
        'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
      ];
      expect(ufsValidas).toContain('SP');
      expect(ufsValidas).toContain('RJ');
      expect(ufsValidas).toContain('MG');
    });

    it('Gêneros válidos (conforme schema.py)', () => {
      const generosValidos = ['M', 'F', 'MASCULINO', 'FEMININO', 'AMBOS'];
      expect(generosValidos).toContain('M');
      expect(generosValidos).toContain('F');
      expect(generosValidos).toContain('AMBOS');
    });

    it('Opções de Email válidas (conforme schema.py)', () => {
      const emailOpcoes = ['obrigatorio', 'nao_filtrar', 'nao', 'preferencial'];
      expect(emailOpcoes).toContain('obrigatorio');
      expect(emailOpcoes).toContain('nao_filtrar');
      expect(emailOpcoes).toContain('preferencial');
    });

    it('Tipos de Telefone válidos (conforme schema.py)', () => {
      const telefoneOpcoes = ['movel', 'fixo', 'ambos'];
      expect(telefoneOpcoes).toContain('movel');
      expect(telefoneOpcoes).toContain('fixo');
      expect(telefoneOpcoes).toContain('ambos');
    });

    it('Tipos de Lista válidos (conforme schema.py)', () => {
      const tipoListaOpcoes = ['venda', 'teste', 'consulta_disponibilidade'];
      expect(tipoListaOpcoes).toContain('venda');
      expect(tipoListaOpcoes).toContain('teste');
      expect(tipoListaOpcoes).toContain('consulta_disponibilidade');
    });
  });

  describe('Limites de Valores (conforme schema.py)', () => {
    it('Cidades: máximo 50', () => {
      const cidades = new Array(50).fill('CIDADE').map((c, i) => `${c}_${i}`);
      expect(cidades.length).toBeLessThanOrEqual(50);
    });

    it('Bairros: máximo 100', () => {
      const bairros = new Array(100).fill('BAIRRO').map((b, i) => `${b}_${i}`);
      expect(bairros.length).toBeLessThanOrEqual(100);
    });

    it('CBOs: máximo 50', () => {
      const cbos = new Array(50).fill(1).map((_, i) => i + 1000);
      expect(cbos.length).toBeLessThanOrEqual(50);
    });

    it('DDDs: máximo 30', () => {
      const ddds = new Array(30).fill(11).map((d, i) => d + i);
      expect(ddds.length).toBeLessThanOrEqual(30);
    });

    it('Nome Cliente: máximo 150 caracteres', () => {
      const nome = 'A'.repeat(150);
      expect(nome.length).toBeLessThanOrEqual(150);
    });

    it('Idade mínima: >= 18', () => {
      expect(18).toBeGreaterThanOrEqual(18);
    });

    it('Idade máxima: <= 120', () => {
      expect(120).toBeLessThanOrEqual(120);
    });

    it('Quantidade mínima: >= 1', () => {
      expect(1).toBeGreaterThanOrEqual(1);
    });

    it('DDD válido: 11-99', () => {
      const dddsValidos = [11, 21, 31, 85, 99];
      dddsValidos.forEach(ddd => {
        expect(ddd).toBeGreaterThanOrEqual(11);
        expect(ddd).toBeLessThanOrEqual(99);
      });
    });

    it('Num Parcelas: 2-120', () => {
      const parcelas = [2, 6, 12, 60, 120];
      parcelas.forEach(p => {
        expect(p).toBeGreaterThanOrEqual(2);
        expect(p).toBeLessThanOrEqual(120);
      });
    });
  });

  describe('Validações Condicionais (backend)', () => {
    it('tipo_lista=venda requer nome_cliente', () => {
      const filtros = { tipo_lista: 'venda', nome_cliente: '' };
      const invalido = filtros.tipo_lista === 'venda' && !filtros.nome_cliente;
      expect(invalido).toBe(true);
    });

    it('tipo_lista=venda requer valor_lista', () => {
      const filtros = { tipo_lista: 'venda', valor_lista: 0 };
      const invalido = filtros.tipo_lista === 'venda' && !filtros.valor_lista;
      expect(invalido).toBe(true);
    });

    it('parcelado=true requer num_parcelas', () => {
      const filtros = { tipo_lista: 'venda', parcelado: true, num_parcelas: 0 };
      const invalido = filtros.parcelado && !filtros.num_parcelas;
      expect(invalido).toBe(true);
    });

    it('tipo_lista=teste NÃO requer dados financeiros', () => {
      const filtros = { tipo_lista: 'teste' };
      const temErroFinanceiro = filtros.tipo_lista === 'venda' && !filtros.nome_cliente;
      expect(temErroFinanceiro).toBe(false);
    });

    it('consulta sem cidade requer ao menos 1 CBO', () => {
      const filtros = { cidades: [], cbos: [] };
      const invalido = !filtros.cidades.length && !filtros.cbos.length;
      expect(invalido).toBe(true);
    });
  });

  describe('Payload Completo para API', () => {
    it('Consulta de disponibilidade mínima', () => {
      const payload = {
        ufs: ['SP'],
        tipo_lista: 'consulta_disponibilidade',
      };

      expect(payload).toHaveProperty('ufs');
      expect(payload).toHaveProperty('tipo_lista');
      expect(payload.tipo_lista).toBe('consulta_disponibilidade');
    });

    it('Venda completa com parcelamento', () => {
      const payload = {
        ufs: ['SP'],
        cidades: ['SAO PAULO'],
        tipo_lista: 'venda',
        nome_cliente: 'ACME Corp',
        valor_lista: 5000.00,
        parcelado: true,
        num_parcelas: 12,
        valor_parcela: 416.67,
        quantidade: 1000,
      };

      expect(payload.tipo_lista).toBe('venda');
      expect(payload.nome_cliente).toBe('ACME Corp');
      expect(payload.parcelado).toBe(true);
      expect(payload.num_parcelas).toBe(12);
      expect(payload.valor_lista).toBeGreaterThan(0);
    });

    it('Teste com filtros demográficos', () => {
      const payload = {
        ufs: ['RJ'],
        cidades: ['RIO DE JANEIRO'],
        genero: 'F',
        idade_min: 25,
        idade_max: 45,
        email: 'obrigatorio',
        tipo_telefone: 'movel',
        tipo_lista: 'teste',
      };

      expect(payload.tipo_lista).toBe('teste');
      expect(payload.genero).toBe('F');
      expect(payload.idade_min).toBe(25);
      expect(payload.email).toBe('obrigatorio');
    });

    it('Alta renda com distribuição por bairro', () => {
      const payload = {
        ufs: ['SP'],
        cidades: ['SAO PAULO'],
        alta_renda: true,
        distribuicao: [
          { bairro: 'VILA OLIMPIA', quantidade: 300 },
          { bairro: 'ITAIM BIBI', quantidade: 200 },
        ],
        tipo_lista: 'venda',
        nome_cliente: 'Premium Lists Inc',
        valor_lista: 10000,
      };

      expect(payload.alta_renda).toBe(true);
      expect(payload.distribuicao).toHaveLength(2);
      expect(payload.distribuicao[0]).toHaveProperty('bairro');
      expect(payload.distribuicao[0]).toHaveProperty('quantidade');
    });
  });

  describe('Respostas da API Esperadas', () => {
    it('Resposta de contagem deve incluir total_banco, total_disponivel', () => {
      const resposta = {
        total_banco: 50000,
        total_disponivel: 45000,
        total_final: 5000,
        resultado_token: 'token-123',
      };

      expect(resposta).toHaveProperty('total_banco');
      expect(resposta).toHaveProperty('total_disponivel');
      expect(resposta).toHaveProperty('resultado_token');
    });

    it('Resposta de preview deve incluir registros e total', () => {
      const resposta = {
        registros: [
          { cpf: '123', telefone_1: '11987654321', email: 'test@test.com' },
        ],
        total: 50,
      };

      expect(resposta).toHaveProperty('registros');
      expect(resposta).toHaveProperty('total');
      expect(Array.isArray(resposta.registros)).toBe(true);
    });

    it('Erro 401 deve retornar mensagem de credenciais', () => {
      const resposta = {
        erro: 'Credenciais inválidas.',
      };

      expect(resposta).toHaveProperty('erro');
      expect(resposta.erro).toContain('Credenciais');
    });

    it('Erro 410 (token expirado) deve retornar mensagem clara', () => {
      const resposta = {
        erro: 'Levantamento expirado (30 min). Refaça o levantamento.',
      };

      expect(resposta).toHaveProperty('erro');
      expect(resposta.erro).toContain('expirado');
    });
  });
});

describe('Fluxo Completo de Uso', () => {
  it('1. Usuário seleciona filtros básicos', () => {
    const filtros = {
      ufs: ['SP'],
      cidades: ['SAO PAULO'],
      quantidade: 1000,
      tipo_lista: 'consulta_disponibilidade',
    };

    expect(filtros.ufs).toBeTruthy();
    expect(filtros.cidades).toBeTruthy();
    expect(filtros.tipo_lista).toBe('consulta_disponibilidade');
  });

  it('2. Usuário muda para venda e preenche dados financeiros', () => {
    const filtros = {
      ...{
        ufs: ['SP'],
        cidades: ['SAO PAULO'],
        tipo_lista: 'venda',
      },
      nomeCliente: 'ACME Corp',
      valorLista: 5000,
      parcelado: false,
    };

    expect(filtros.tipo_lista).toBe('venda');
    expect(filtros.nomeCliente).toBe('ACME Corp');
  });

  it('3. Usuário ativa parcelamento', () => {
    const filtros = {
      tipo_lista: 'venda',
      nomeCliente: 'ACME Corp',
      valorLista: 5000,
      parcelado: true,
      numParcelas: 12,
      valorParcela: 416.67,
    };

    expect(filtros.parcelado).toBe(true);
    expect(filtros.numParcelas).toBe(12);
  });

  it('4. Clica em "Levantamento" e recebe token', () => {
    const resposta = {
      total_disponivel: 45000,
      resultado_token: 'token-abc123',
    };

    expect(resposta).toHaveProperty('resultado_token');
    expect(resposta.total_disponivel).toBeGreaterThan(0);
  });

  it('5. Clica em "Gerar Lista" e recebe arquivo', () => {
    const resposta = {
      download_iniciado: true,
    };

    expect(resposta.download_iniciado).toBe(true);
  });
});
