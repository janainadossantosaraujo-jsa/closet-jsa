import type { Opcao } from '../db/schema';

export interface ChipsProps<T extends string> {
  rotulo: string;
  opcoes: readonly Opcao<T>[];
  /** Valores marcados. */
  valor: readonly T[];
  aoMudar: (valor: T[]) => void;
  /** Se true, só permite um valor marcado (toque de novo desmarca). */
  unico?: boolean;
}

/** Chips de múltipla escolha (botões com aria-pressed). */
export function Chips<T extends string>({ rotulo, opcoes, valor, aoMudar, unico }: ChipsProps<T>) {
  function alternar(v: T) {
    const marcado = valor.includes(v);
    if (unico) aoMudar(marcado ? [] : [v]);
    else aoMudar(marcado ? valor.filter((x) => x !== v) : [...valor, v]);
  }
  return (
    <fieldset className="chips">
      <legend>{rotulo}</legend>
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          className="chip"
          aria-pressed={valor.includes(o.valor)}
          onClick={() => alternar(o.valor)}
        >
          {o.rotulo}
        </button>
      ))}
    </fieldset>
  );
}
