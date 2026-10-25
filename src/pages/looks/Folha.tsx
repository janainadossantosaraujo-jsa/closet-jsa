import { useEffect, useId, type ReactNode } from 'react';
import './looks.css';

export interface FolhaProps {
  aberto: boolean;
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
  /** Botões fixos no rodapé. */
  rodape?: ReactNode;
}

/** Painel em tela cheia (seletores e formulários), acima da barra de navegação. Fecha com Esc. */
export function Folha({ aberto, titulo, aoFechar, children, rodape }: FolhaProps) {
  const idTitulo = useId();
  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar();
    };
    document.addEventListener('keydown', tecla);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', tecla);
      document.body.style.overflow = overflow;
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;
  return (
    <div className="lk-folha" role="dialog" aria-modal="true" aria-labelledby={idTitulo}>
      <header className="lk-folha-cabecalho">
        <h2 id={idTitulo}>{titulo}</h2>
        <button type="button" className="lk-folha-fechar" aria-label="Fechar" onClick={aoFechar}>
          ×
        </button>
      </header>
      <div className="lk-folha-corpo">{children}</div>
      {rodape && <footer className="lk-folha-rodape">{rodape}</footer>}
    </div>
  );
}
