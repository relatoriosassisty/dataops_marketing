/**
 * components/ui/Toast.jsx
 * Notificações temporárias (sucesso, erro, aviso, info).
 * Uso: <Toast tipo="sucesso" mensagem="Lista gerada!" onClose={() => {}} />
 */

const ESTILOS = {
  sucesso: { bg: '#e8f5e9', borda: 'var(--sucesso)', icone: 'bi-check-circle-fill', cor: '#2e7d32' },
  erro:    { bg: '#ffebee', borda: 'var(--erro)',    icone: 'bi-x-circle-fill',     cor: '#c62828' },
  aviso:   { bg: '#fff8e1', borda: 'var(--aviso)',   icone: 'bi-exclamation-triangle-fill', cor: '#e65100' },
  info:    { bg: '#e3f2fd', borda: 'var(--info)',    icone: 'bi-info-circle-fill',  cor: '#1565c0' },
};

export default function Toast({ tipo = 'info', mensagem, onClose }) {
  const s = ESTILOS[tipo] || ESTILOS.info;

  return (
    <div
      style={{
        position: 'fixed',
        top: '1.25rem',
        right: '1.25rem',
        zIndex: 9999,
        background: s.bg,
        border: `1.5px solid ${s.borda}`,
        borderRadius: 'var(--radius-md)',
        padding: '0.85rem 1.1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        boxShadow: 'var(--shadow-hover)',
        minWidth: '280px',
        maxWidth: '420px',
        animation: 'slideIn 0.2s ease',
      }}
      role="alert"
    >
      <i className={`bi ${s.icone}`} style={{ color: s.cor, fontSize: '1.2rem', flexShrink: 0 }} />
      <span style={{ color: s.cor, flex: 1, fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
        {mensagem}
      </span>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: s.cor,
          padding: '0 0 0 0.4rem',
          fontSize: '1rem',
          opacity: 0.7,
        }}
        aria-label="Fechar"
      >
        <i className="bi bi-x-lg" />
      </button>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(30px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
