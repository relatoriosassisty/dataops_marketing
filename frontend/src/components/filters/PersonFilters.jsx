/**
 * components/filters/PersonFilters.jsx
 * Filtros: Gênero, Faixa etária, E-mail, Profissão (CBO)
 * Dropdown com seleção por categoria (todos os CBOs do grupo) ou profissão individual.
 */

import { useRef, useState } from 'react';

const GRUPOS = [
  {
    grupo: 'Médico',
    cbos: [
      { cbo: '225125', nome: 'Médico Clínico' },
      { cbo: '225124', nome: 'Médico Pediatra' },
      { cbo: '225225', nome: 'Médico Cirurgião Geral' },
      { cbo: '225250', nome: 'Médico Ginecologista e Obstetra' },
      { cbo: '225142', nome: 'Médico (Estratégia Saúde da Família)' },
      { cbo: '225120', nome: 'Médico Cardiologista' },
      { cbo: '225151', nome: 'Médico Anestesiologista' },
      { cbo: '225270', nome: 'Médico Ortopedista e Traumatologista' },
      { cbo: '225140', nome: 'Médico do Trabalho' },
      { cbo: '225133', nome: 'Médico Psiquiatra' },
      { cbo: '225170', nome: 'Médico Generalista' },
      { cbo: '225320', nome: 'Médico Radiologista' },
      { cbo: '225265', nome: 'Médico Oftalmologista' },
      { cbo: '225130', nome: 'Médico de Família e Comunidade' },
      { cbo: '225150', nome: 'Médico em Medicina Intensiva' },
      { cbo: '225135', nome: 'Médico Dermatologista' },
      { cbo: '225275', nome: 'Médico Otorrinolaringologista' },
      { cbo: '225112', nome: 'Médico Neurologista' },
      { cbo: '225121', nome: 'Médico Oncologista Clínico' },
      { cbo: '225155', nome: 'Médico Endocrinologista' },
      { cbo: '225103', nome: 'Médico Infectologista' },
      { cbo: '225109', nome: 'Médico Nefrologista' },
      { cbo: '225235', nome: 'Médico Cirurgião Plástico' },
      { cbo: '225285', nome: 'Médico Urologista' },
      { cbo: '225260', nome: 'Médico Neurocirurgião' },
      { cbo: '225115', nome: 'Médico Angiologista' },
      { cbo: '225165', nome: 'Médico Gastroenterologista' },
      { cbo: '225127', nome: 'Médico Pneumologista' },
      { cbo: '225325', nome: 'Médico Patologista' },
      { cbo: '225139', nome: 'Médico Sanitarista' },
      { cbo: '225210', nome: 'Médico Cirurgião Cardiovascular' },
      { cbo: '225310', nome: 'Médico em Endoscopia' },
      { cbo: '225185', nome: 'Médico Hematologista' },
      { cbo: '225203', nome: 'Médico em Cirurgia Vascular' },
      { cbo: '225148', nome: 'Médico Anatomopatologista' },
      { cbo: '225220', nome: 'Médico Cirurgião do Aparelho Digestivo' },
      { cbo: '225110', nome: 'Médico Alergista e Imunologista' },
      { cbo: '225105', nome: 'Médico Acupunturista' },
      { cbo: '225230', nome: 'Médico Cirurgião Pediátrico' },
      { cbo: '225136', nome: 'Médico Reumatologista' },
      { cbo: '225180', nome: 'Médico Geriatra' },
      { cbo: '225145', nome: 'Médico em Medicina de Tráfego' },
      { cbo: '225195', nome: 'Médico Homeopata' },
      { cbo: '225106', nome: 'Médico Legista' },
      { cbo: '225350', nome: 'Médico Neurofisiologista' },
      { cbo: '225215', nome: 'Médico Cirurgião de Cabeça e Pescoço' },
      { cbo: '225335', nome: 'Médico Patologista Clínico' },
      { cbo: '225330', nome: 'Médico Radioterapeuta' },
      { cbo: '225240', nome: 'Médico Cirurgião Torácico' },
      { cbo: '225280', nome: 'Médico Coloproctologista' },
      { cbo: '225305', nome: 'Médico Citopatologista' },
      { cbo: '225160', nome: 'Médico Fisiatra' },
      { cbo: '225255', nome: 'Médico Mastologista' },
      { cbo: '225315', nome: 'Médico em Medicina Nuclear' },
      { cbo: '225175', nome: 'Médico Geneticista' },
      { cbo: '225340', nome: 'Médico Hemoterapeuta' },
      { cbo: '225118', nome: 'Médico Nutrologista' },
      { cbo: '225122', nome: 'Médico Cancerologista Pediátrico' },
      { cbo: '225290', nome: 'Médico Cancerologista Cirúrgico' },
    ],
  },
  {
    grupo: 'Cirurgião-Dentista',
    cbos: [
      { cbo: '223208', nome: 'Cirurgião-Dentista Clínico Geral' },
      { cbo: '223280', nome: 'Cirurgião-Dentista Dentística' },
      { cbo: '223293', nome: 'Cirurgião-Dentista (Estratégia Saúde da Família)' },
      { cbo: '223272', nome: 'Cirurgião-Dentista Saúde Coletiva' },
      { cbo: '223212', nome: 'Cirurgião-Dentista Endodontista' },
      { cbo: '223268', nome: 'Cirurgião-Dentista Traumatologista Bucomaxilofacial' },
      { cbo: '223256', nome: 'Cirurgião-Dentista Protesista' },
      { cbo: '223248', nome: 'Cirurgião-Dentista Periodontista' },
      { cbo: '223240', nome: 'Cirurgião-Dentista Ortodontista' },
      { cbo: '223236', nome: 'Cirurgião-Dentista Odontopediatra' },
      { cbo: '223204', nome: 'Cirurgião-Dentista Auditor' },
      { cbo: '223232', nome: 'Cirurgião-Dentista Odontologista Legal' },
      { cbo: '223260', nome: 'Cirurgião-Dentista Radiologista' },
      { cbo: '223288', nome: 'Cirurgião-Dentista (Pacientes com Necessidades Especiais)' },
      { cbo: '223224', nome: 'Cirurgião-Dentista Implantodontista' },
      { cbo: '223228', nome: 'Cirurgião-Dentista Odontogeriatra' },
      { cbo: '223244', nome: 'Cirurgião-Dentista Patologista Bucal' },
      { cbo: '223252', nome: 'Cirurgião-Dentista Protesiológo Bucomaxilofacial' },
      { cbo: '223276', nome: 'Cirurgião-Dentista Odontologia do Trabalho' },
      { cbo: '223220', nome: 'Cirurgião-Dentista Estomatologista' },
      { cbo: '223264', nome: 'Cirurgião-Dentista Reabilitador Oral' },
      { cbo: '223284', nome: 'Cirurgião-Dentista Disfunção Temporomandibular' },
      { cbo: '223216', nome: 'Cirurgião-Dentista Epidemiologista' },
    ],
  },
  {
    grupo: 'Psicólogo',
    cbos: [
      { cbo: '251510', nome: 'Psicólogo Clínico' },
      { cbo: '251505', nome: 'Psicólogo Educacional' },
      { cbo: '251530', nome: 'Psicólogo Social' },
      { cbo: '251540', nome: 'Psicólogo do Trabalho' },
      { cbo: '251520', nome: 'Psicólogo Hospitalar' },
      { cbo: '251550', nome: 'Psicanalista' },
      { cbo: '251535', nome: 'Psicólogo do Trânsito' },
      { cbo: '251525', nome: 'Psicólogo Jurídico' },
      { cbo: '251515', nome: 'Psicólogo do Esporte' },
      { cbo: '251545', nome: 'Neuropsicólogo' },
      { cbo: '251555', nome: 'Psicólogo Acupunturista' },
    ],
  },
  {
    grupo: 'Nutricionista',
    cbos: [
      { cbo: '223710', nome: 'Nutricionista' },
    ],
  },
  {
    grupo: 'Esteticista',
    cbos: [
      { cbo: '322130', nome: 'Esteticista' },
    ],
  },
  {
    grupo: 'Advogado',
    cbos: [
      { cbo: '241005', nome: 'Advogado' },
      { cbo: '241010', nome: 'Advogado de Empresa' },
      { cbo: '241015', nome: 'Advogado (Direito Civil)' },
      { cbo: '241020', nome: 'Advogado (Direito Público)' },
      { cbo: '241025', nome: 'Advogado (Direito Penal)' },
      { cbo: '241030', nome: 'Advogado (Áreas Especiais)' },
      { cbo: '241035', nome: 'Advogado (Direito do Trabalho)' },
      { cbo: '241205', nome: 'Advogado da União' },
    ],
  },
  {
    grupo: 'Sócio / Proprietário',
    cbos: [
      { cbo: '141410', nome: 'Comerciante Varejista / Empresário' },
      { cbo: '141405', nome: 'Comerciante Atacadista' },
      { cbo: '141415', nome: 'Gerente de Loja / Supermercado' },
    ],
  },
  {
    grupo: 'Saúde',
    cbos: [
      { cbo: '223505', nome: 'Enfermeiro' },
      { cbo: '322205', nome: 'Técnico de Enfermagem' },
      { cbo: '223405', nome: 'Farmacêutico' },
      { cbo: '223605', nome: 'Fisioterapeuta' },
      { cbo: '251605', nome: 'Assistente Social' },
    ],
  },
  {
    grupo: 'Negócios / Gestão',
    cbos: [
      { cbo: '252105', nome: 'Administrador' },
      { cbo: '252210', nome: 'Contador' },
      { cbo: '121010', nome: 'Diretor de Empresa' },
      { cbo: '142105', nome: 'Gerente Administrativo' },
      { cbo: '142305', nome: 'Gerente Comercial' },
      { cbo: '142320', nome: 'Gerente de Vendas' },
    ],
  },
  {
    grupo: 'Engenharia / Arquitetura',
    cbos: [
      { cbo: '214205', nome: 'Engenheiro Civil' },
      { cbo: '214305', nome: 'Engenheiro Elétrico' },
      { cbo: '214405', nome: 'Engenheiro Mecânico' },
      { cbo: '214105', nome: 'Arquiteto' },
      { cbo: '212405', nome: 'Analista de Sistemas' },
    ],
  },
  {
    grupo: 'Educação',
    cbos: [
      { cbo: '231210', nome: 'Professor (Ensino Fundamental)' },
      { cbo: '331205', nome: 'Professor (Ensino Médio)' },
    ],
  },
  {
    grupo: 'Administrativo / Serviços',
    cbos: [
      { cbo: '411005', nome: 'Auxiliar de Escritório' },
      { cbo: '411010', nome: 'Assistente Administrativo' },
      { cbo: '422105', nome: 'Recepcionista' },
      { cbo: '413210', nome: 'Caixa de Banco' },
      { cbo: '354125', nome: 'Assistente de Vendas' },
      { cbo: '513205', nome: 'Cozinheiro' },
      { cbo: '782510', nome: 'Motorista de Caminhão' },
      { cbo: '715210', nome: 'Pedreiro' },
      { cbo: '715615', nome: 'Eletricista' },
    ],
  },
];

// Lookup plano CBO → nome + grupo
const CBO_MAP = {};
GRUPOS.forEach((g) => g.cbos.forEach((p) => { CBO_MAP[p.cbo] = { ...p, grupo: g.grupo }; }));

// Checkbox customizado com suporte a estado parcial
function Checkbox({ estado, onClick, size = 18 }) {
  const ativo = estado === 'all';
  const parcial = estado === 'partial';
  return (
    <div
      onClick={onClick}
      style={{
        width: size, height: size, borderRadius: 3, flexShrink: 0, cursor: 'pointer',
        border: `2px solid ${ativo || parcial ? 'var(--roxo-primario)' : 'var(--borda)'}`,
        background: ativo ? 'var(--roxo-primario)' : parcial ? 'var(--roxo-claro)' : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {ativo && <i className="bi bi-check" style={{ color: '#fff', fontSize: size * 0.75 }} />}
      {parcial && <i className="bi bi-dash" style={{ color: 'var(--roxo-primario)', fontSize: size * 0.75 }} />}
    </div>
  );
}

export default function PersonFilters({ valores, onChange }) {
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(false);
  const [expandidos, setExpandidos] = useState({});
  const dropdownRef = useRef(null);

  const selecionadas = valores.profissoes || [];

  // Estado de seleção de um grupo: 'all' | 'partial' | 'none'
  const estadoGrupo = (g) => {
    const total = g.cbos.length;
    const sel = g.cbos.filter((p) => selecionadas.includes(p.cbo)).length;
    if (sel === 0) return 'none';
    if (sel === total) return 'all';
    return 'partial';
  };

  // Toggle grupo inteiro
  const toggleGrupo = (g) => {
    const cbos = g.cbos.map((p) => p.cbo);
    const todos = cbos.every((c) => selecionadas.includes(c));
    const novo = todos
      ? selecionadas.filter((c) => !cbos.includes(c))
      : [...new Set([...selecionadas, ...cbos])];
    onChange({ profissoes: novo });
  };

  // Toggle profissão individual
  const toggleCbo = (cbo) => {
    const novo = selecionadas.includes(cbo)
      ? selecionadas.filter((c) => c !== cbo)
      : [...selecionadas, cbo];
    onChange({ profissoes: novo });
  };

  const remover = (cbos) =>
    onChange({ profissoes: selecionadas.filter((c) => !cbos.includes(c)) });

  const toggleExpand = (nome) =>
    setExpandidos((v) => ({ ...v, [nome]: !v[nome] }));

  const handleBlur = (e) => {
    if (!dropdownRef.current?.contains(e.relatedTarget)) {
      setAberto(false);
      setBusca('');
    }
  };

  // Filtra grupos/profissões pela busca
  const gruposFiltrados = busca.trim()
    ? GRUPOS.map((g) => {
        const q = busca.toLowerCase();
        const cbosMatch = g.cbos.filter(
          (p) => p.nome.toLowerCase().includes(q) || p.cbo.includes(q)
        );
        const grupoMatch = g.grupo.toLowerCase().includes(q);
        return grupoMatch ? g : cbosMatch.length > 0 ? { ...g, cbos: cbosMatch } : null;
      }).filter(Boolean)
    : GRUPOS;

  // Gera tags: se grupo inteiro selecionado → 1 tag de grupo; senão → tags individuais
  const tags = [];
  GRUPOS.forEach((g) => {
    const cbosGrupo = g.cbos.map((p) => p.cbo);
    const sel = cbosGrupo.filter((c) => selecionadas.includes(c));
    if (sel.length === 0) return;
    if (sel.length === cbosGrupo.length) {
      tags.push({ label: g.grupo, cbos: cbosGrupo, tipo: 'grupo' });
    } else {
      sel.forEach((cbo) => {
        tags.push({ label: CBO_MAP[cbo]?.nome || cbo, cbos: [cbo], tipo: 'individual' });
      });
    }
  });

  const totalSelecionadas = selecionadas.length;

  return (
    <div>
      <h2 className="section-header">
        <i className="bi bi-person-lines-fill" style={{ color: 'var(--roxo-primario)' }} />
        Perfil
      </h2>

      {/* Gênero */}
      <div className="mb-3">
        <label className="form-label fw-semibold" style={{ color: 'var(--roxo-escuro)' }}>
          Gênero
        </label>
        <div className="d-flex gap-2">
          {[
            { valor: '', label: 'Ambos', icone: 'bi-people' },
            { valor: 'M', label: 'Masculino', icone: 'bi-gender-male' },
            { valor: 'F', label: 'Feminino', icone: 'bi-gender-female' },
          ].map(({ valor, label, icone }) => {
            const ativo = valores.genero === valor;
            return (
              <button
                key={valor}
                type="button"
                onClick={() => onChange({ genero: valor })}
                className="btn btn-sm flex-fill"
                style={{
                  background: ativo ? 'var(--roxo-primario)' : 'var(--fundo-secundario)',
                  color: ativo ? '#fff' : 'var(--roxo-escuro)',
                  border: `1px solid ${ativo ? 'var(--roxo-primario)' : 'var(--borda)'}`,
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                <i className={`bi ${icone} me-1`} />
                {label}
              </button>
            );
          })}
        </div>

        {valores.genero === '' && (() => {
          const dist = valores.generoDistribuicao ?? { M: 50, F: 50 };
          const total = valores.quantidade ?? 5000;
          const soma = (dist.M ?? 0) + (dist.F ?? 0);
          const ok = soma === 100;
          const setM = (val) => {
            const m = Math.min(100, Math.max(0, parseInt(val) || 0));
            onChange({ generoDistribuicao: { M: m, F: 100 - m } });
          };
          const setF = (val) => {
            const f = Math.min(100, Math.max(0, parseInt(val) || 0));
            onChange({ generoDistribuicao: { M: 100 - f, F: f } });
          };
          return (
            <div className="mt-2 p-2 rounded" style={{ background: 'var(--fundo-secundario)', border: '1px solid var(--borda)', fontSize: '0.83rem' }}>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="fw-semibold" style={{ color: 'var(--roxo-escuro)' }}>
                  <i className="bi bi-sliders me-1" style={{ color: 'var(--roxo-primario)' }} />
                  Proporção
                </span>
                <button type="button" className="btn btn-sm btn-outline-secondary py-0 px-2" style={{ fontSize: '0.75rem' }}
                  onClick={() => onChange({ generoDistribuicao: { M: 50, F: 50 } })}>
                  50 / 50
                </button>
              </div>
              <div className="d-flex gap-2">
                {[
                  { key: 'M', label: 'Masculino', icone: 'bi-gender-male', cor: '#1565c0', setter: setM },
                  { key: 'F', label: 'Feminino', icone: 'bi-gender-female', cor: '#ad1457', setter: setF },
                ].map(({ key, label, icone, cor, setter }) => {
                  const pct = dist[key] ?? 0;
                  const abs = Math.round((pct / 100) * total);
                  return (
                    <div key={key} className="flex-fill">
                      <div className="d-flex align-items-center gap-1 mb-1">
                        <i className={`bi ${icone}`} style={{ color: cor, fontSize: '0.9rem' }} />
                        <span style={{ color: cor, fontWeight: 600 }}>{label}</span>
                      </div>
                      <div className="d-flex align-items-center gap-1">
                        <input type="number" min={0} max={100} value={pct}
                          onChange={(e) => setter(e.target.value)}
                          className="form-control form-control-sm"
                          style={{ width: 64, fontSize: '0.83rem' }} />
                        <span style={{ color: 'var(--texto-terciario)' }}>%</span>
                        <span style={{ color: 'var(--texto-terciario)', marginLeft: 4 }}>≈ {abs.toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {!ok && (
                <div className="mt-2" style={{ color: 'var(--erro, #c62828)', fontSize: '0.78rem' }}>
                  <i className="bi bi-exclamation-circle-fill me-1" />
                  A soma deve ser 100% (atual: {soma}%)
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Faixa etária */}
      <div className="mb-3">
        <label className="form-label fw-semibold" style={{ color: 'var(--roxo-escuro)' }}>
          Faixa Etária
          <span className="badge-filtro ms-2">{valores.idadeMin ?? 18} – {valores.idadeMax ?? 70} anos</span>
        </label>
        <div className="row g-2">
          <div className="col-6">
            <label className="form-label small" style={{ color: 'var(--texto-terciario)' }}>Mínima</label>
            <input type="number" className="form-control form-control-sm" min={18} max={valores.idadeMax ?? 70}
              value={valores.idadeMin ?? 18} onChange={(e) => onChange({ idadeMin: Number(e.target.value) })} />
          </div>
          <div className="col-6">
            <label className="form-label small" style={{ color: 'var(--texto-terciario)' }}>Máxima</label>
            <input type="number" className="form-control form-control-sm" min={valores.idadeMin ?? 18} max={100}
              value={valores.idadeMax ?? 70} onChange={(e) => onChange({ idadeMax: Number(e.target.value) })} />
          </div>
        </div>
      </div>

      {/* E-mail */}
      <div className="mb-3">
        <label className="form-label fw-semibold" style={{ color: 'var(--roxo-escuro)' }}>E-mail</label>
        <div className="d-flex flex-column gap-1">
          {[
            { valor: 'nao_filtrar', label: 'Não filtrar', descricao: 'Com ou sem e-mail' },
            { valor: 'obrigatorio', label: 'Obrigatório', descricao: 'Somente com e-mail válido' },
          ].map(({ valor, label, descricao }) => {
            const ativo = (valores.email || 'nao_filtrar') === valor;
            return (
              <label key={valor} className="d-flex align-items-center gap-2 p-2 rounded"
                style={{ cursor: 'pointer', background: ativo ? 'var(--roxo-claro)' : 'transparent',
                  border: `1px solid ${ativo ? 'var(--roxo-primario)' : 'transparent'}`,
                  borderRadius: 'var(--radius-sm)', transition: 'all 0.15s' }}>
                <input type="radio" name="email" value={valor} checked={ativo}
                  onChange={() => onChange({ email: valor })}
                  className="form-check-input mt-0" style={{ accentColor: 'var(--roxo-primario)' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--roxo-escuro)' }}>{label}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--texto-terciario)' }}>{descricao}</div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Profissão (CBO) — dropdown com grupos */}
      <div className="mb-1" ref={dropdownRef} onBlur={handleBlur}>
        <label className="form-label fw-semibold" style={{ color: 'var(--roxo-escuro)' }}>
          Profissão
          {totalSelecionadas > 0 && (
            <span className="badge-filtro ms-2">{totalSelecionadas} CBO(s)</span>
          )}
        </label>

        {/* Trigger */}
        <div
          tabIndex={0}
          onClick={() => setAberto((v) => !v)}
          onKeyDown={(e) => e.key === 'Enter' && setAberto((v) => !v)}
          style={{
            border: `1.5px solid ${aberto ? 'var(--roxo-primario)' : 'var(--borda)'}`,
            borderRadius: 'var(--radius-sm)', padding: '0.45rem 0.75rem', cursor: 'pointer',
            background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            minHeight: '42px', flexWrap: 'wrap', gap: '0.3rem',
            boxShadow: aberto ? '0 0 0 0.2rem rgba(123,31,162,0.15)' : 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
        >
          {tags.length === 0 ? (
            <span style={{ color: 'var(--texto-terciario)', fontSize: '0.9rem' }}>
              Todas as profissões (sem filtro)
            </span>
          ) : (
            <div className="d-flex flex-wrap gap-1" style={{ flex: 1 }}>
              {tags.map((tag, i) => (
                <span key={i} style={{
                  background: tag.tipo === 'grupo' ? 'var(--roxo-primario)' : 'var(--roxo-escuro)',
                  color: '#fff', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600,
                  padding: '0.1rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem',
                }}>
                  {tag.tipo === 'grupo' && <i className="bi bi-collection-fill" style={{ fontSize: '0.7rem' }} />}
                  {tag.label}
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); remover(tag.cbos); }}
                    style={{ background: 'none', border: 'none', color: '#fff', padding: 0, cursor: 'pointer', lineHeight: 1 }}>
                    <i className="bi bi-x" style={{ fontSize: '0.9rem' }} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="d-flex align-items-center gap-2 ms-1">
            {totalSelecionadas > 0 && (
              <button type="button"
                onClick={(e) => { e.stopPropagation(); onChange({ profissoes: [] }); }}
                style={{ background: 'none', border: 'none', color: 'var(--texto-terciario)', padding: 0, cursor: 'pointer', fontSize: '0.85rem' }}>
                <i className="bi bi-x-circle" />
              </button>
            )}
            <i className={`bi bi-chevron-${aberto ? 'up' : 'down'}`}
              style={{ color: 'var(--texto-terciario)', fontSize: '0.8rem', flexShrink: 0 }} />
          </div>
        </div>

        {/* Painel dropdown */}
        {aberto && (
          <div style={{
            position: 'absolute', zIndex: 100, background: '#fff',
            border: '1.5px solid var(--roxo-primario)', borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-hover)', width: '100%', maxWidth: '480px', marginTop: '4px',
          }}>
            {/* Busca */}
            <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--borda)' }}>
              <input type="text" className="form-control form-control-sm"
                placeholder="Buscar grupo ou profissão..."
                value={busca} onChange={(e) => setBusca(e.target.value)}
                autoFocus onClick={(e) => e.stopPropagation()} />
            </div>

            {/* Lista de grupos */}
            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {gruposFiltrados.length === 0 ? (
                <div style={{ padding: '0.75rem 1rem', color: 'var(--texto-terciario)', fontSize: '0.85rem' }}>
                  Nenhuma profissão encontrada
                </div>
              ) : (
                gruposFiltrados.map((g) => {
                  const est = estadoGrupo(g);
                  const expandido = busca.trim() ? true : !!expandidos[g.grupo];
                  return (
                    <div key={g.grupo}>
                      {/* Cabeçalho do grupo */}
                      <div
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.45rem 0.75rem', background: 'var(--fundo-secundario)',
                          borderBottom: '1px solid var(--borda)', userSelect: 'none',
                        }}
                      >
                        <Checkbox estado={est} onClick={(e) => { e.stopPropagation(); toggleGrupo(g); }} />
                        <span
                          style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--roxo-escuro)', flex: 1, cursor: 'pointer' }}
                          onClick={(e) => { e.stopPropagation(); toggleGrupo(g); }}
                        >
                          {g.grupo}
                        </span>
                        {est !== 'none' && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--roxo-primario)', fontWeight: 600 }}>
                            {g.cbos.filter((p) => selecionadas.includes(p.cbo)).length}/{g.cbos.length}
                          </span>
                        )}
                        <button type="button"
                          onClick={(e) => { e.stopPropagation(); if (!busca.trim()) toggleExpand(g.grupo); }}
                          style={{ background: 'none', border: 'none', color: 'var(--texto-terciario)', padding: 0, cursor: 'pointer', fontSize: '0.8rem' }}>
                          <i className={`bi bi-chevron-${expandido ? 'up' : 'down'}`} />
                        </button>
                      </div>

                      {/* Profissões individuais */}
                      {expandido && g.cbos.map(({ cbo, nome }) => {
                        const ativo = selecionadas.includes(cbo);
                        return (
                          <div key={cbo}
                            onClick={(e) => { e.stopPropagation(); toggleCbo(cbo); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.6rem',
                              padding: '0.38rem 0.75rem 0.38rem 2rem', cursor: 'pointer',
                              background: ativo ? 'var(--roxo-claro)' : '#fff',
                              borderLeft: ativo ? '3px solid var(--roxo-primario)' : '3px solid transparent',
                              borderBottom: '1px solid var(--borda)',
                            }}
                            onMouseEnter={(e) => { if (!ativo) e.currentTarget.style.background = '#fafafa'; }}
                            onMouseLeave={(e) => { if (!ativo) e.currentTarget.style.background = '#fff'; }}
                          >
                            <Checkbox estado={ativo ? 'all' : 'none'} onClick={(e) => { e.stopPropagation(); toggleCbo(cbo); }} size={15} />
                            <span style={{ color: 'var(--texto-secundario)', fontSize: '0.84rem', flex: 1 }}>{nome}</span>
                            <span style={{ color: 'var(--texto-terciario)', fontSize: '0.72rem', fontFamily: 'monospace' }}>{cbo}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            {/* Rodapé */}
            <div style={{ padding: '0.4rem 0.75rem', borderTop: '1px solid var(--borda)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--texto-terciario)' }}>
                {totalSelecionadas === 0 ? 'Nenhuma selecionada' : `${totalSelecionadas} CBO(s) selecionado(s)`}
              </span>
              {totalSelecionadas > 0 && (
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); onChange({ profissoes: [] }); }}
                  style={{ background: 'none', border: 'none', color: 'var(--roxo-primario)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                  Limpar tudo
                </button>
              )}
            </div>
          </div>
        )}
        <small style={{ color: 'var(--texto-terciario)' }}>Sem seleção = todas as profissões</small>
      </div>
    </div>
  );
}
