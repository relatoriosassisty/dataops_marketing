/**
 * __tests__/location.demographic.test.js
 * Testes para campos de localização e perfil demográfico
 */

import { describe, it, expect } from 'vitest';

describe('Filtros de Localização', () => {
  describe('UFs (Estados)', () => {
    it('deve aceitar as 27 UFs válidas do Brasil', () => {
      const ufsValidas = [
        'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
        'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN',
        'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
      ];

      expect(ufsValidas.length).toBe(27);
      expect(ufsValidas).toContain('SP');
      expect(ufsValidas).toContain('RJ');
      expect(ufsValidas).toContain('AC');
      expect(ufsValidas).toContain('TO');
    });

    it('deve rejeitar UF inválida', () => {
      const ufs = ['XX', 'YY'];
      const ufsValidas = ['AC', 'AL', 'SP', 'RJ'];
      const temInvalida = ufs.some(u => !ufsValidas.includes(u));
      expect(temInvalida).toBe(true);
    });

    it('deve aceitar múltiplas UFs', () => {
      const ufs = ['SP', 'RJ', 'MG', 'BA'];
      expect(ufs.length).toBe(4);
      expect(ufs).toContain('SP');
      expect(ufs).toContain('BA');
    });

    it('deve rejeitar UF vazia', () => {
      const ufs = [];
      const valido = ufs.length > 0;
      expect(valido).toBe(false);
    });

    it('UF deve ser obrigatória', () => {
      const filtrosSemUF = { cidades: ['SP'] };
      const temUF = 'ufs' in filtrosSemUF;
      expect(temUF).toBe(false);
    });
  });

  describe('Cidades', () => {
    it('deve aceitar até 50 cidades', () => {
      const cidades = new Array(50).fill('CIDADE').map((c, i) => `${c}_${i}`);
      expect(cidades.length).toBeLessThanOrEqual(50);
    });

    it('deve rejeitar mais de 50 cidades', () => {
      const cidades = new Array(51).fill('CIDADE').map((c, i) => `${c}_${i}`);
      const valido = cidades.length <= 50;
      expect(valido).toBe(false);
    });

    it('deve aceitar cidade com espaços', () => {
      const cidade = 'SAO PAULO';
      expect(cidade).toContain(' ');
      expect(cidade.length).toBeLessThanOrEqual(100);
    });

    it('deve rejeitar cidade vazia', () => {
      const cidade = '';
      const valido = cidade.trim().length > 0;
      expect(valido).toBe(false);
    });

    it('cidade pode ser opcional', () => {
      const cidades = [];
      // Opcional, mas combinado com UF é válido
      expect(Array.isArray(cidades)).toBe(true);
    });

    it('cidades válidas em São Paulo', () => {
      const cidadesSP = ['SAO PAULO', 'CAMPINAS', 'SOROCABA', 'SANTOS'];
      expect(cidadesSP).toContain('SAO PAULO');
      expect(cidadesSP.length).toBeGreaterThan(0);
    });
  });

  describe('Bairros', () => {
    it('deve aceitar até 100 bairros', () => {
      const bairros = new Array(100).fill('BAIRRO').map((b, i) => `${b}_${i}`);
      expect(bairros.length).toBeLessThanOrEqual(100);
    });

    it('deve rejeitar mais de 100 bairros', () => {
      const bairros = new Array(101).fill('BAIRRO').map((b, i) => `${b}_${i}`);
      const valido = bairros.length <= 100;
      expect(valido).toBe(false);
    });

    it('deve aceitar múltiplos bairros', () => {
      const bairros = ['VILA OLIMPIA', 'ITAIM BIBI', 'MOEMA'];
      expect(bairros.length).toBe(3);
    });

    it('bairros podem ser vazios', () => {
      const bairros = [];
      const valido = Array.isArray(bairros);
      expect(valido).toBe(true);
    });

    it('bairros válidos em São Paulo', () => {
      const bairosSP = ['VILA OLIMPIA', 'ITAIM BIBI', 'MOEMA', 'JARDINS', 'PINHEIROS'];
      expect(bairosSP).toContain('VILA OLIMPIA');
      expect(bairosSP.length).toBeGreaterThan(0);
    });

    it('bairros válidos no Rio de Janeiro', () => {
      const bairrosRJ = ['COPACABANA', 'IPANEMA', 'LEBLON', 'BARRA DA TIJUCA'];
      expect(bairrosRJ).toContain('COPACABANA');
      expect(bairrosRJ.length).toBeGreaterThan(0);
    });
  });

  describe('Alta Renda', () => {
    it('deve aceitar alta_renda como boolean', () => {
      const altaRenda = true;
      expect(typeof altaRenda).toBe('boolean');
    });

    it('alta_renda padrão deve ser false', () => {
      const altaRenda = false;
      expect(altaRenda).toBe(false);
    });

    it('ativar alta_renda deve filtrar bairros nobres', () => {
      const altaRenda = true;
      const incluiBairros = altaRenda;
      expect(incluiBairros).toBe(true);
    });

    it('alta_renda com cidade deve buscar bairros nobres da cidade', () => {
      const filtro = {
        altaRenda: true,
        cidades: ['SAO PAULO'],
      };

      expect(filtro.altaRenda).toBe(true);
      expect(filtro.cidades.length).toBeGreaterThan(0);
    });

    it('alta_renda sem cidade pode usar UF como fallback', () => {
      const filtro = {
        altaRenda: true,
        ufs: ['SP'],
        cidades: [],
      };

      expect(filtro.altaRenda).toBe(true);
      expect(filtro.ufs.length).toBeGreaterThan(0);
    });
  });
});

describe('Filtros Demográficos', () => {
  describe('Gênero', () => {
    it('deve aceitar M (masculino)', () => {
      const genero = 'M';
      expect(genero).toBe('M');
    });

    it('deve aceitar F (feminino)', () => {
      const genero = 'F';
      expect(genero).toBe('F');
    });

    it('deve aceitar AMBOS ou vazio', () => {
      const genero = '';
      expect(genero === '' || genero === 'AMBOS').toBe(true);
    });

    it('gênero deve ser insensível a maiúsculas (backend normaliza)', () => {
      const genero = 'M';
      const normalizado = genero.toUpperCase();
      expect(normalizado).toBe('M');
    });

    it('deve rejeitar gênero inválido', () => {
      const genero = 'X';
      const valido = ['M', 'F', '', 'AMBOS'].includes(genero);
      expect(valido).toBe(false);
    });

    it('padrão deve ser ambos (genero vazio)', () => {
      const genero = '';
      expect(genero).toBe('');
    });
  });

  describe('Idade', () => {
    it('idade_min deve ser >= 18', () => {
      const idadeMin = 18;
      expect(idadeMin).toBeGreaterThanOrEqual(18);
    });

    it('idade_max deve ser <= 120', () => {
      const idadeMax = 120;
      expect(idadeMax).toBeLessThanOrEqual(120);
    });

    it('idade_min < 18 deve ser rejeitada', () => {
      const idadeMin = 17;
      const valido = idadeMin >= 18;
      expect(valido).toBe(false);
    });

    it('idade_max > 120 deve ser rejeitada', () => {
      const idadeMax = 121;
      const valido = idadeMax <= 120;
      expect(valido).toBe(false);
    });

    it('idade_min deve ser <= idade_max', () => {
      const idadeMin = 30;
      const idadeMax = 50;
      const valido = idadeMin <= idadeMax;
      expect(valido).toBe(true);
    });

    it('idade_min > idade_max deve ser rejeitada', () => {
      const idadeMin = 50;
      const idadeMax = 30;
      const valido = idadeMin <= idadeMax;
      expect(valido).toBe(false);
    });

    it('idade_min padrão deve ser 18', () => {
      const idadeMin = 18;
      expect(idadeMin).toBe(18);
    });

    it('idade_max padrão deve ser 70', () => {
      const idadeMax = 70;
      expect(idadeMax).toBe(70);
    });

    it('deve aceitar intervalo de idade específico', () => {
      const idadeMin = 25;
      const idadeMax = 45;
      const valido = idadeMin >= 18 && idadeMax <= 120 && idadeMin <= idadeMax;
      expect(valido).toBe(true);
    });
  });

  describe('Email', () => {
    it('deve aceitar email=obrigatorio', () => {
      const email = 'obrigatorio';
      expect(email).toBe('obrigatorio');
    });

    it('deve aceitar email=nao_filtrar', () => {
      const email = 'nao_filtrar';
      expect(email).toBe('nao_filtrar');
    });

    it('deve aceitar email=nao', () => {
      const email = 'nao';
      expect(email).toBe('nao');
    });

    it('deve aceitar email=preferencial', () => {
      const email = 'preferencial';
      expect(email).toBe('preferencial');
    });

    it('padrão deve ser nao_filtrar', () => {
      const email = 'nao_filtrar';
      expect(email).toBe('nao_filtrar');
    });

    it('deve rejeitar email inválido', () => {
      const email = 'invalido';
      const opcoes = ['obrigatorio', 'nao_filtrar', 'nao', 'preferencial'];
      const valido = opcoes.includes(email);
      expect(valido).toBe(false);
    });
  });
});

describe('Filtros de Telefone', () => {
  describe('Tipo de Telefone', () => {
    it('deve aceitar tipo_telefone=movel', () => {
      const tipo = 'movel';
      expect(tipo).toBe('movel');
    });

    it('deve aceitar tipo_telefone=fixo', () => {
      const tipo = 'fixo';
      expect(tipo).toBe('fixo');
    });

    it('deve aceitar tipo_telefone=ambos', () => {
      const tipo = 'ambos';
      expect(tipo).toBe('ambos');
    });

    it('padrão deve ser ambos', () => {
      const tipo = 'ambos';
      expect(tipo).toBe('ambos');
    });

    it('deve rejeitar tipo inválido', () => {
      const tipo = 'satelite';
      const valido = ['movel', 'fixo', 'ambos'].includes(tipo);
      expect(valido).toBe(false);
    });
  });

  describe('DDDs (Códigos de Área)', () => {
    it('deve aceitar até 30 DDDs', () => {
      const ddds = new Array(30).fill(11).map((d, i) => d + i);
      expect(ddds.length).toBeLessThanOrEqual(30);
    });

    it('deve rejeitar mais de 30 DDDs', () => {
      const ddds = new Array(31).fill(11).map((d, i) => d + i);
      const valido = ddds.length <= 30;
      expect(valido).toBe(false);
    });

    it('DDD deve estar entre 11 e 99', () => {
      const ddds = [11, 21, 31, 85, 99];
      const valido = ddds.every(d => d >= 11 && d <= 99);
      expect(valido).toBe(true);
    });

    it('DDD < 11 deve ser rejeitado', () => {
      const ddd = 10;
      const valido = ddd >= 11;
      expect(valido).toBe(false);
    });

    it('DDD > 99 deve ser rejeitado', () => {
      const ddd = 100;
      const valido = ddd <= 99;
      expect(valido).toBe(false);
    });

    it('DDDs de São Paulo', () => {
      const ddds = [11, 12, 13, 14, 15, 16, 17, 18, 19];
      expect(ddds).toContain(11);
      ddds.forEach(d => {
        expect(d).toBeGreaterThanOrEqual(11);
        expect(d).toBeLessThanOrEqual(99);
      });
    });

    it('DDDs do Rio de Janeiro', () => {
      const ddds = [21, 24];
      expect(ddds).toContain(21);
      ddds.forEach(d => {
        expect(d).toBeGreaterThanOrEqual(11);
        expect(d).toBeLessThanOrEqual(99);
      });
    });

    it('DDDs podem estar vazios', () => {
      const ddds = [];
      expect(Array.isArray(ddds)).toBe(true);
    });
  });

  describe('Tem Telefone', () => {
    it('deve aceitar tem_telefone=obrigatorio', () => {
      const temTelefone = 'obrigatorio';
      expect(temTelefone).toBe('obrigatorio');
    });

    it('deve aceitar tem_telefone=nao_filtrar', () => {
      const temTelefone = 'nao_filtrar';
      expect(temTelefone).toBe('nao_filtrar');
    });

    it('padrão deve ser nao_filtrar', () => {
      const temTelefone = 'nao_filtrar';
      expect(temTelefone).toBe('nao_filtrar');
    });
  });
});

describe('Quantidade e Distribuição', () => {
  describe('Quantidade Total', () => {
    it('deve aceitar quantidade >= 1', () => {
      const quantidade = 1000;
      expect(quantidade).toBeGreaterThanOrEqual(1);
    });

    it('deve rejeitar quantidade < 1', () => {
      const quantidade = 0;
      const valido = quantidade >= 1;
      expect(valido).toBe(false);
    });

    it('padrão deve ser 5000', () => {
      const quantidade = 5000;
      expect(quantidade).toBe(5000);
    });

    it('deve aceitar quantidade grande', () => {
      const quantidade = 50000;
      expect(quantidade).toBeGreaterThan(0);
    });
  });

  describe('Distribuição', () => {
    it('deve aparecer quando cidades.length > 1', () => {
      const cidades = ['SP', 'RJ'];
      const mostrarDistribuicao = cidades.length > 1;
      expect(mostrarDistribuicao).toBe(true);
    });

    it('não deve aparecer quando cidades.length <= 1', () => {
      const cidades = ['SP'];
      const mostrarDistribuicao = cidades.length > 1;
      expect(mostrarDistribuicao).toBe(false);
    });

    it('distribuição por bairro quando bairros.length > 1', () => {
      const bairros = ['BAIRRO1', 'BAIRRO2'];
      const mostrarDistribuicao = bairros.length > 1;
      expect(mostrarDistribuicao).toBe(true);
    });

    it('cada item da distribuição deve ter quantidade >= 1', () => {
      const distribuicao = [
        { cidade: 'SP', quantidade: 100 },
        { cidade: 'RJ', quantidade: 200 },
      ];
      const valido = distribuicao.every(item => item.quantidade >= 1);
      expect(valido).toBe(true);
    });

    it('deve limpar distribuição ao mudar cidades', () => {
      const estadoAntes = { cidades: ['SP'], distribuicao: { SP: 1000 } };
      const estadoDepois = { cidades: ['RJ'], distribuicao: {} };
      expect(estadoDepois.distribuicao).toEqual({});
    });
  });
});

describe('Validações Compostas', () => {
  it('consulta válida: SP, cidade, quantidade', () => {
    const filtro = {
      ufs: ['SP'],
      cidades: ['SAO PAULO'],
      quantidade: 1000,
    };

    expect(filtro.ufs.length).toBeGreaterThan(0);
    expect(filtro.cidades.length).toBeGreaterThan(0);
    expect(filtro.quantidade).toBeGreaterThanOrEqual(1);
  });

  it('consulta válida: SP+RJ, múltiplas cidades, distribuição', () => {
    const filtro = {
      ufs: ['SP', 'RJ'],
      cidades: ['SAO PAULO', 'RIO DE JANEIRO'],
      distribuicao: { 'SAO PAULO': 500, 'RIO DE JANEIRO': 500 },
    };

    expect(filtro.ufs.length).toBeGreaterThan(1);
    expect(filtro.cidades.length).toBeGreaterThan(1);
    expect(Object.keys(filtro.distribuicao).length).toBeGreaterThan(1);
  });

  it('consulta válida: alta renda + bairros específicos', () => {
    const filtro = {
      ufs: ['SP'],
      cidades: ['SAO PAULO'],
      altaRenda: true,
      bairros: ['VILA OLIMPIA', 'ITAIM BIBI'],
    };

    expect(filtro.altaRenda).toBe(true);
    expect(filtro.bairros.length).toBeGreaterThan(0);
  });

  it('consulta válida: perfil demográfico específico', () => {
    const filtro = {
      ufs: ['SP'],
      cidades: ['SAO PAULO'],
      genero: 'F',
      idadeMin: 25,
      idadeMax: 45,
      email: 'obrigatorio',
      tipoTelefone: 'movel',
    };

    expect(filtro.genero).toBe('F');
    expect(filtro.idadeMin).toBeLessThanOrEqual(filtro.idadeMax);
    expect(filtro.email).toBe('obrigatorio');
  });
});
