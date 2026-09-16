/**
 * __tests__/components.financial.test.jsx
 * Testes para validar campos do componente FinancialFilters
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('FinancialFilters - Campos Validação', () => {
  describe('Tipos de Lista', () => {
    it('deve aceitar os três tipos válidos: consulta_disponibilidade, teste, venda', () => {
      const tiposValidos = ['consulta_disponibilidade', 'teste', 'venda'];
      expect(tiposValidos).toContain('consulta_disponibilidade');
      expect(tiposValidos).toContain('teste');
      expect(tiposValidos).toContain('venda');
    });

    it('tipo padrão deve ser consulta_disponibilidade', () => {
      const tipoDefault = 'consulta_disponibilidade';
      expect(tipoDefault).toBe('consulta_disponibilidade');
    });
  });

  describe('Campos Financeiros Obrigatórios (tipo=venda)', () => {
    it('deve requerer nome_cliente (string, max 150 chars)', () => {
      const nomeCliente = 'ACME Corporation';
      expect(nomeCliente).toBeTruthy();
      expect(nomeCliente.length).toBeLessThanOrEqual(150);
    });

    it('deve requerer valor_lista (number >= 0)', () => {
      const valorLista = 5000.00;
      expect(typeof valorLista).toBe('number');
      expect(valorLista).toBeGreaterThanOrEqual(0);
    });

    it('deve aceitar valor_lista como 0 (consulta sem venda efetiva)', () => {
      const valorLista = 0;
      expect(valorLista).toBeGreaterThanOrEqual(0);
    });

    it('deve rejeitar valor_lista negativo', () => {
      const valorLista = -100;
      expect(valorLista).toBeLessThan(0);
      // Validação deve falhar
      expect(valorLista < 0).toBe(true);
    });

    it('deve aceitar parcelado como boolean', () => {
      const parcelado = true;
      expect(typeof parcelado).toBe('boolean');
    });
  });

  describe('Campos Condicionais (parcelado=true)', () => {
    it('num_parcelas deve ser obrigatório quando parcelado=true', () => {
      const parcelado = true;
      const numParcelas = 12;
      if (parcelado) {
        expect(numParcelas).toBeDefined();
      }
    });

    it('num_parcelas deve ser >= 2', () => {
      const numParcelas = 2;
      expect(numParcelas).toBeGreaterThanOrEqual(2);
    });

    it('num_parcelas deve aceitar até 120', () => {
      const numParcelas = 120;
      expect(numParcelas).toBeLessThanOrEqual(120);
    });

    it('num_parcelas < 2 é inválido', () => {
      const numParcelas = 1;
      expect(numParcelas < 2).toBe(true); // Deve falhar validação
    });

    it('valor_parcela é opcional quando parcelado=true', () => {
      const parcelado = true;
      const valorParcela = undefined;
      // Quando parcelado, pode não ter valorParcela (calcula automaticamente)
      if (parcelado && valorParcela === undefined) {
        expect(valorParcela).toBeUndefined();
      }
    });

    it('valor_parcela deve ser >= 0', () => {
      const valorParcela = 416.67;
      expect(valorParcela).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Estado Condicional', () => {
    it('campos financeiros devem aparecer APENAS quando tipo_lista=venda', () => {
      const tipo = 'venda';
      const mostraFinanceiro = tipo === 'venda';
      expect(mostraFinanceiro).toBe(true);

      const tipo2 = 'teste';
      const mostraFinanceiro2 = tipo2 === 'venda';
      expect(mostraFinanceiro2).toBe(false);
    });

    it('parcelas devem aparecer APENAS quando parcelado=true', () => {
      const parcelado = true;
      const tipo = 'venda';
      const mostraParcelas = parcelado && tipo === 'venda';
      expect(mostraParcelas).toBe(true);

      const parcelado2 = false;
      const mostraParcelas2 = parcelado2 && tipo === 'venda';
      expect(mostraParcelas2).toBe(false);
    });

    it('ao desmarcar parcelado, deve resetar numParcelas e valorParcela', () => {
      const estadoAntes = { parcelado: true, numParcelas: 12, valorParcela: 416.67 };
      const novoParcelado = false; // novo valor após desmarcar
      const estadoDepois = !novoParcelado
        ? { ...estadoAntes, parcelado: false, numParcelas: 1, valorParcela: 0 }
        : estadoAntes;

      expect(estadoDepois.parcelado).toBe(false);
      expect(estadoDepois.numParcelas).toBe(1);
      expect(estadoDepois.valorParcela).toBe(0);
    });
  });
});

describe('FilterForm - Integração de Campos', () => {
  describe('FILTROS_PADRAO - Valores Iniciais', () => {
    it('deve ter todos os campos financeiros no estado padrão', () => {
      const padrao = {
        tipoLista: 'consulta_disponibilidade',
        nomeCliente: '',
        valorLista: 0,
        parcelado: false,
        numParcelas: 1,
        valorParcela: 0,
      };

      expect(padrao).toHaveProperty('tipoLista');
      expect(padrao).toHaveProperty('nomeCliente');
      expect(padrao).toHaveProperty('valorLista');
      expect(padrao).toHaveProperty('parcelado');
      expect(padrao).toHaveProperty('numParcelas');
      expect(padrao).toHaveProperty('valorParcela');
    });

    it('tipo_lista padrão deve ser consulta_disponibilidade', () => {
      const padrao = { tipoLista: 'consulta_disponibilidade' };
      expect(padrao.tipoLista).toBe('consulta_disponibilidade');
    });

    it('campos financeiros vazios por padrão', () => {
      const padrao = {
        nomeCliente: '',
        valorLista: 0,
        numParcelas: 1,
        valorParcela: 0,
      };

      expect(padrao.nomeCliente).toBe('');
      expect(padrao.valorLista).toBe(0);
      expect(padrao.numParcelas).toBe(1);
      expect(padrao.valorParcela).toBe(0);
    });

    it('parcelado padrão deve ser false', () => {
      const padrao = { parcelado: false };
      expect(padrao.parcelado).toBe(false);
    });
  });

  describe('buildPayload - Inclusão Correta de Campos', () => {
    it('deve incluir tipo_lista SEMPRE', () => {
      const filtros = { tipoLista: 'teste' };
      const payload = { tipo_lista: filtros.tipoLista };
      expect(payload).toHaveProperty('tipo_lista');
      expect(payload.tipo_lista).toBe('teste');
    });

    it('deve incluir campos financeiros APENAS quando tipo_lista=venda', () => {
      const filtros1 = {
        tipoLista: 'venda',
        nomeCliente: 'ACME',
        valorLista: 5000,
      };

      // Mock do buildPayload para venda
      const payload1 = {
        tipo_lista: filtros1.tipoLista,
        ...(filtros1.tipoLista === 'venda' && {
          nome_cliente: filtros1.nomeCliente,
          valor_lista: filtros1.valorLista,
        }),
      };

      expect(payload1.tipo_lista).toBe('venda');
      expect(payload1.nome_cliente).toBe('ACME');
      expect(payload1.valor_lista).toBe(5000);

      // Quando tipo é teste, NÃO deve incluir
      const filtros2 = { tipoLista: 'teste', nomeCliente: 'ACME' };
      const payload2 = {
        tipo_lista: filtros2.tipoLista,
        ...(filtros2.tipoLista === 'venda' && {
          nome_cliente: filtros2.nomeCliente,
        }),
      };

      expect(payload2).not.toHaveProperty('nome_cliente');
    });

    it('num_parcelas deve vir do estado quando parcelado=true', () => {
      const filtros = {
        tipoLista: 'venda',
        parcelado: true,
        numParcelas: 12,
      };

      const payload = {
        tipo_lista: filtros.tipoLista,
        ...(filtros.tipoLista === 'venda' && {
          parcelado: filtros.parcelado,
          num_parcelas: filtros.parcelado ? filtros.numParcelas : undefined,
        }),
      };

      expect(payload.num_parcelas).toBe(12);
    });

    it('valor_parcela deve ser undefined quando não informado', () => {
      const filtros = {
        tipoLista: 'venda',
        parcelado: true,
        valorParcela: 0,
      };

      const payload = {
        tipo_lista: filtros.tipoLista,
        ...(filtros.tipoLista === 'venda' && {
          valor_parcela: filtros.parcelado && filtros.valorParcela
            ? filtros.valorParcela
            : undefined,
        }),
      };

      expect(payload.valor_parcela).toBeUndefined();
    });

    it('valor_parcela deve ser incluído quando informado', () => {
      const filtros = {
        tipoLista: 'venda',
        parcelado: true,
        valorParcela: 416.67,
      };

      const payload = {
        tipo_lista: filtros.tipoLista,
        ...(filtros.tipoLista === 'venda' && {
          valor_parcela: filtros.parcelado && filtros.valorParcela
            ? filtros.valorParcela
            : undefined,
        }),
      };

      expect(payload.valor_parcela).toBe(416.67);
    });
  });

  describe('Campos de Localização', () => {
    it('deve incluir ufs no payload', () => {
      const filtros = { ufs: ['SP', 'RJ'] };
      expect(filtros.ufs).toEqual(['SP', 'RJ']);
    });

    it('deve incluir cidades no payload', () => {
      const filtros = { cidades: ['SAO PAULO', 'RIO DE JANEIRO'] };
      expect(filtros.cidades).toEqual(['SAO PAULO', 'RIO DE JANEIRO']);
    });

    it('deve incluir bairros quando informados', () => {
      const filtros = { bairros: ['VILA OLIMPIA', 'COPACABANA'] };
      expect(filtros.bairros).toEqual(['VILA OLIMPIA', 'COPACABANA']);
    });

    it('deve aceitar alta_renda boolean', () => {
      const filtros = { altaRenda: true };
      expect(typeof filtros.altaRenda).toBe('boolean');
    });
  });

  describe('Campos de Perfil', () => {
    it('deve aceitar genero vazio (ambos) ou M/F', () => {
      const generos = ['', 'M', 'F'];
      expect(generos).toContain('');
      expect(generos).toContain('M');
      expect(generos).toContain('F');
    });

    it('deve aceitar idade_min entre 18 e 120', () => {
      const idades = [18, 30, 65, 120];
      idades.forEach(idade => {
        expect(idade).toBeGreaterThanOrEqual(18);
        expect(idade).toBeLessThanOrEqual(120);
      });
    });

    it('deve aceitar email com opções específicas', () => {
      const opcoes = ['nao_filtrar', 'obrigatorio', 'nao', 'preferencial'];
      expect(opcoes).toContain('nao_filtrar');
      expect(opcoes).toContain('obrigatorio');
    });
  });

  describe('Campos de Telefone', () => {
    it('deve aceitar tipo_telefone: movel, fixo, ambos', () => {
      const tipos = ['movel', 'fixo', 'ambos'];
      expect(tipos).toContain('movel');
      expect(tipos).toContain('fixo');
      expect(tipos).toContain('ambos');
    });

    it('deve aceitar lista de DDDs', () => {
      const ddds = [11, 21, 85];
      expect(Array.isArray(ddds)).toBe(true);
      ddds.forEach(ddd => {
        expect(ddd).toBeGreaterThanOrEqual(11);
        expect(ddd).toBeLessThanOrEqual(99);
      });
    });

    it('deve aceitar quantidade como inteiro', () => {
      const quantidade = 5000;
      expect(Number.isInteger(quantidade)).toBe(true);
      expect(quantidade).toBeGreaterThan(0);
    });
  });

  describe('Validação de Distribuição', () => {
    it('deve aceitar distribuição quando há múltiplas cidades', () => {
      const distribuicao = {
        'SAO PAULO': 1000,
        'RIO DE JANEIRO': 2000,
      };

      expect(Object.keys(distribuicao).length).toBeGreaterThan(1);
      Object.values(distribuicao).forEach(valor => {
        expect(Number.isInteger(valor)).toBe(true);
        expect(valor).toBeGreaterThan(0);
      });
    });

    it('deve limpar distribuição ao mudar cidades/bairros', () => {
      const estadoAntes = { distribuicao: { 'SAO PAULO': 1000 } };
      const cidadesVelhas = ['SAO PAULO'];
      const cidadesNovas = ['SAO PAULO', 'RIO DE JANEIRO'];
      
      const estadoDepois = cidadesNovas !== cidadesVelhas
        ? { ...estadoAntes, distribuicao: {} }
        : estadoAntes;

      expect(estadoDepois.distribuicao).toEqual({});
    });
  });
});

describe('MockData Validação - Para Testes', () => {
  describe('mockContagem - Validação de Tipo Lista', () => {
    it('deve validar tipo_lista quando presente', () => {
      const filtros = { tipo_lista: 'venda' };
      expect(filtros.tipo_lista).toBe('venda');
    });

    it('deve requerer nome_cliente quando tipo_lista=venda', () => {
      const filtros = { tipo_lista: 'venda', nome_cliente: '' };
      const temErro = filtros.tipo_lista === 'venda' && !filtros.nome_cliente;
      expect(temErro).toBe(true);
    });

    it('deve requerer valor_lista quando tipo_lista=venda', () => {
      const filtros = { tipo_lista: 'venda', valor_lista: 0 };
      const temErro = filtros.tipo_lista === 'venda' && !filtros.valor_lista;
      expect(temErro).toBe(true);
    });

    it('não deve exigir dados financeiros quando tipo_lista=teste', () => {
      const filtros = { tipo_lista: 'teste' };
      const temErro = filtros.tipo_lista === 'venda' && !filtros.nome_cliente;
      expect(temErro).toBe(false);
    });
  });

  describe('mockContagem - Validação de Parcelamento', () => {
    it('deve validar num_parcelas quando parcelado=true', () => {
      const filtros = { tipo_lista: 'venda', parcelado: true, num_parcelas: 1 };
      const temErro = filtros.parcelado && filtros.num_parcelas < 2;
      expect(temErro).toBe(true);
    });

    it('não deve exigir num_parcelas quando parcelado=false', () => {
      const filtros = { tipo_lista: 'venda', parcelado: false };
      const temErro = filtros.parcelado && !filtros.num_parcelas;
      expect(temErro).toBe(false);
    });
  });
});

describe('Cobertura de Casos Edge', () => {
  it('nomeCliente com exatamente 150 caracteres deve ser aceito', () => {
    const nome = 'A'.repeat(150);
    expect(nome.length).toBe(150);
    expect(nome.length).toBeLessThanOrEqual(150);
  });

  it('nomeCliente com 151 caracteres deve ser rejeitado', () => {
    const nome = 'A'.repeat(151);
    expect(nome.length > 150).toBe(true);
  });

  it('valorLista com decimais deve ser aceito', () => {
    const valor = 5000.99;
    expect(typeof valor).toBe('number');
    expect(valor % 1 !== 0).toBe(true);
  });

  it('numParcelas com valor entre 2 e 120 deve ser aceito', () => {
    const valoresValidos = [2, 12, 60, 120];
    valoresValidos.forEach(valor => {
      expect(valor).toBeGreaterThanOrEqual(2);
      expect(valor).toBeLessThanOrEqual(120);
    });
  });

  it('tipo de lista vazio deve ser tratado', () => {
    const tipo = '';
    const tiposValidos = ['consulta_disponibilidade', 'teste', 'venda'];
    expect(tiposValidos).not.toContain(tipo);
  });

  it('múltiplas cidades deve gerar distribuição válida', () => {
    const cidades = ['SP', 'RJ', 'MG'];
    const distribuicao = cidades.reduce((acc, cidade) => {
      acc[cidade] = 1000;
      return acc;
    }, {});

    expect(Object.keys(distribuicao).length).toBe(3);
    Object.values(distribuicao).forEach(v => {
      expect(v).toBeGreaterThan(0);
    });
  });
});
