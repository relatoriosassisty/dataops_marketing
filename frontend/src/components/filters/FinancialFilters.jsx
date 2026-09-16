/**
 * components/filters/FinancialFilters.jsx
 * Filtros de tipo de lista e dados financeiros (venda).
 */

export default function FinancialFilters({ valores, onChange }) {
  const handleTipoListaChange = (e) => {
    onChange({ tipoLista: e.target.value });
  };

  const handleNomeClienteChange = (e) => {
    onChange({ nomeCliente: e.target.value });
  };

  const handleValorListaChange = (e) => {
    onChange({ valorLista: parseFloat(e.target.value) || 0 });
  };

  const handleParceladoChange = (e) => {
    const parcelado = e.target.checked;
    onChange({
      parcelado,
      ...(parcelado
        ? { numParcelas: Math.max(2, valores.numParcelas || 2) }
        : { numParcelas: 1, valorParcela: 0 })
    });
  };

  const handleNumParcelasChange = (e) => {
    const num = Math.max(2, parseInt(e.target.value) || 2);
    onChange({ numParcelas: num });
  };

  const handleValorParcelaChange = (e) => {
    onChange({ valorParcela: parseFloat(e.target.value) || 0 });
  };

  const mostraFinanceiro = valores.tipoLista === 'venda';
  const valorTotal = (valores.valorLista || 0).toLocaleString('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  });

  return (
    <div>
      <h6 className="mb-3" style={{ color: 'var(--roxo-escuro)', fontWeight: 600 }}>
        <i className="bi bi-receipt me-2" />
        Tipo de Lista
      </h6>

      {/* Tipo de Lista */}
      <div className="mb-4">
        <div className="d-flex gap-3">
          {['consulta_disponibilidade', 'teste', 'venda'].map((tipo) => (
            <div key={tipo} className="form-check">
              <input
                className="form-check-input"
                type="radio"
                id={`tipo-${tipo}`}
                name="tipoLista"
                value={tipo}
                checked={valores.tipoLista === tipo}
                onChange={handleTipoListaChange}
              />
              <label className="form-check-label" htmlFor={`tipo-${tipo}`}>
                {tipo === 'consulta_disponibilidade'
                  ? 'Consulta de Disponibilidade'
                  : tipo === 'teste'
                  ? 'Teste'
                  : 'Venda'}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Campos Financeiros — visível apenas quando tipo = 'venda' */}
      {mostraFinanceiro && (
        <div className="border-top pt-4">
          <h6 className="mb-3" style={{ color: 'var(--roxo-escuro)', fontWeight: 600 }}>
            <i className="bi bi-credit-card me-2" />
            Dados Financeiros
          </h6>

          {/* Nome do Cliente */}
          <div className="mb-3">
            <label htmlFor="nomeCliente" className="form-label">
              Nome do Cliente <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              id="nomeCliente"
              className="form-control"
              placeholder="Ex: ACME Corporation"
              value={valores.nomeCliente || ''}
              onChange={handleNomeClienteChange}
              maxLength={150}
            />
            <small className="text-muted">
              {(valores.nomeCliente || '').length}/150 caracteres
            </small>
          </div>

          {/* Valor da Lista */}
          <div className="mb-3">
            <label htmlFor="valorLista" className="form-label">
              Valor da Lista <span className="text-danger">*</span>
            </label>
            <div className="input-group">
              <span className="input-group-text">R$</span>
              <input
                type="number"
                id="valorLista"
                className="form-control"
                placeholder="0,00"
                value={valores.valorLista || 0}
                onChange={handleValorListaChange}
                step="0.01"
                min="0"
              />
            </div>
            <small className="text-muted">Total: {valorTotal}</small>
          </div>

          {/* Parcelado */}
          <div className="mb-3">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="parcelado"
                checked={valores.parcelado || false}
                onChange={handleParceladoChange}
              />
              <label className="form-check-label" htmlFor="parcelado">
                Parcelado
              </label>
            </div>
          </div>

          {/* Campos Condicionais — mostrados apenas se parcelado = true */}
          {valores.parcelado && (
            <>
              {/* Número de Parcelas */}
              <div className="mb-3">
                <label htmlFor="numParcelas" className="form-label">
                  Número de Parcelas <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  id="numParcelas"
                  className="form-control"
                  value={valores.numParcelas || 2}
                  onChange={handleNumParcelasChange}
                  min="2"
                  max="120"
                />
              </div>

              {/* Valor da Parcela */}
              <div className="mb-3">
                <label htmlFor="valorParcela" className="form-label">
                  Valor da Parcela (opcional)
                </label>
                <div className="input-group">
                  <span className="input-group-text">R$</span>
                  <input
                    type="number"
                    id="valorParcela"
                    className="form-control"
                    placeholder="0,00"
                    value={valores.valorParcela || 0}
                    onChange={handleValorParcelaChange}
                    step="0.01"
                    min="0"
                  />
                </div>
                <small className="text-muted">
                  {valores.numParcelas && valores.valorParcela
                    ? `Total com parcelas: ${(
                        valores.valorParcela * valores.numParcelas
                      ).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}`
                    : 'Calcula automaticamente se não informado'}
                </small>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
