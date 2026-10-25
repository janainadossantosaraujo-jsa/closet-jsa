import { useId, type ReactNode } from 'react';
import type { Opcao } from '../db/schema';

export interface SelecaoProps<T extends string> {
  rotulo: string;
  opcoes: readonly Opcao<T>[];
  valor: T | undefined;
  aoMudar: (valor: T | undefined) => void;
  /** Texto da opção vazia; se omitido e `obrigatorio`, não há opção vazia. */
  vazio?: string;
  obrigatorio?: boolean;
  dica?: ReactNode;
  desabilitado?: boolean;
}

/** Select nativo (no celular abre o seletor do sistema). Use com as listas de schema.ts. */
export function Selecao<T extends string>({
  rotulo,
  opcoes,
  valor,
  aoMudar,
  vazio = 'Selecione…',
  obrigatorio,
  dica,
  desabilitado,
}: SelecaoProps<T>) {
  const id = useId();
  return (
    <div className="campo">
      <label className="campo-rotulo" htmlFor={id}>{rotulo}</label>
      <select
        id={id}
        value={valor ?? ''}
        required={obrigatorio}
        disabled={desabilitado}
        onChange={(e) => aoMudar(e.target.value === '' ? undefined : (e.target.value as T))}
      >
        {(!obrigatorio || valor === undefined) && <option value="">{vazio}</option>}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>{o.rotulo}</option>
        ))}
      </select>
      {dica && <span className="campo-dica">{dica}</span>}
    </div>
  );
}
