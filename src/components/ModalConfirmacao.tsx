import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Botao } from './Botao';

export interface ModalConfirmacaoProps {
  aberto: boolean;
  titulo: string;
  children?: ReactNode;
  textoConfirmar?: string;
  textoCancelar?: string;
  /** Botão de confirmar em vermelho (ações destrutivas). */
  perigoso?: boolean;
  carregando?: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}

/** Modal de confirmação (fecha com Esc ou tocando fora, exceto durante carregamento). */
export function ModalConfirmacao({
  aberto,
  titulo,
  children,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  perigoso,
  carregando,
  aoConfirmar,
  aoCancelar,
}: ModalConfirmacaoProps) {
  const idTitulo = useId();
  const refCancelar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    refCancelar.current?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !carregando) aoCancelar();
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [aberto, carregando, aoCancelar]);

  if (!aberto) return null;
  return (
    <div className="modal-fundo" onClick={() => !carregando && aoCancelar()}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={idTitulo}>{titulo}</h2>
        {children}
        <div className="modal-acoes">
          <Botao ref={refCancelar} variante="secundario" bloco onClick={aoCancelar} disabled={carregando}>
            {textoCancelar}
          </Botao>
          <Botao variante={perigoso ? 'perigo' : 'primario'} bloco onClick={aoConfirmar} carregando={carregando}>
            {textoConfirmar}
          </Botao>
        </div>
      </div>
    </div>
  );
}
