import type { ButtonHTMLAttributes, Ref } from 'react';

export type VarianteBotao = 'primario' | 'secundario' | 'perigo' | 'fantasma';

export interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
  variante?: VarianteBotao;
  /** Ocupa a largura toda. */
  bloco?: boolean;
  /** Mostra "Aguarde…" e desabilita. */
  carregando?: boolean;
}

export function Botao({
  variante = 'primario',
  bloco,
  carregando,
  className,
  children,
  disabled,
  type = 'button',
  ...resto
}: BotaoProps) {
  const classes = ['botao', `botao-${variante}`, bloco ? 'botao-bloco' : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <button type={type} className={classes} disabled={disabled || carregando} aria-busy={carregando || undefined} {...resto}>
      {carregando ? 'Aguarde…' : children}
    </button>
  );
}
