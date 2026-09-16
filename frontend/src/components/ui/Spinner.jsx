/**
 * components/ui/Spinner.jsx
 */

export default function Spinner({ mensagem = 'Carregando...' }) {
  return (
    <div className="text-center py-4">
      <div
        className="spinner-border"
        style={{ color: 'var(--roxo-primario)', width: '2.5rem', height: '2.5rem' }}
        role="status"
      >
        <span className="visually-hidden">{mensagem}</span>
      </div>
      {mensagem && (
        <p className="mt-2 mb-0" style={{ color: 'var(--texto-terciario)', fontSize: 'var(--font-size-sm)' }}>
          {mensagem}
        </p>
      )}
    </div>
  );
}
