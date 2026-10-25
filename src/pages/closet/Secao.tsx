import type { ReactNode } from 'react';

interface SecaoProps {
  titulo: string;
  /** Resumo curto ao lado do título (ex.: "2 preenchidos"). */
  resumo?: string;
  aberta?: boolean;
  children: ReactNode;
}

/** Seção recolhível (details/summary nativo: acessível e sem JS extra). */
export function Secao({ titulo, resumo, aberta, children }: SecaoProps) {
  return (
    <details className="closet-secao" open={aberta}>
      <summary>
        <span className="closet-secao-titulo">{titulo}</span>
        {resumo && <span className="closet-secao-resumo">{resumo}</span>}
      </summary>
      <div className="closet-secao-corpo">{children}</div>
    </details>
  );
}
