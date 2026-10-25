import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export interface CabecalhoProps {
  titulo: string;
  /** Mostra botão "voltar" (histórico, ou o caminho indicado). */
  voltar?: boolean | string;
  /** Ações à direita (ex.: botão "Salvar"). */
  acoes?: ReactNode;
}

/** Cabeçalho de página com título (h1), voltar opcional e ações. */
export function Cabecalho({ titulo, voltar, acoes }: CabecalhoProps) {
  const navegar = useNavigate();
  return (
    <header className="cabecalho">
      {voltar && (
        <button
          type="button"
          className="cabecalho-voltar"
          aria-label="Voltar"
          onClick={() => (typeof voltar === 'string' ? navegar(voltar) : navegar(-1))}
        >
          ←
        </button>
      )}
      <h1>{titulo}</h1>
      {acoes}
    </header>
  );
}
