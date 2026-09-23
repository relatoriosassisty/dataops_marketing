/**
 * utils/bairroChave.js
 * Bairros de nomes iguais existem em cidades diferentes (ex: "CENTRO" em
 * várias capitais). Para não misturar seleções quando várias cidades estão
 * marcadas, cada bairro é identificado internamente por "CIDADE::BAIRRO".
 */

export const SEPARADOR_BAIRRO = '::';

export function chaveBairro(cidade, bairro) {
  return `${cidade}${SEPARADOR_BAIRRO}${bairro}`;
}

/** Retorna { cidade, bairro } a partir de uma chave "CIDADE::BAIRRO". */
export function partesBairro(chave) {
  const i = chave.indexOf(SEPARADOR_BAIRRO);
  if (i === -1) return { cidade: null, bairro: chave };
  return { cidade: chave.slice(0, i), bairro: chave.slice(i + SEPARADOR_BAIRRO.length) };
}

export function nomeBairro(chave) {
  return partesBairro(chave).bairro;
}
