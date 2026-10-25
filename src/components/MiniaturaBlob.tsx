import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { useMidia } from '../db/hooks';
import type { ID } from '../db/schema';

/**
 * Cria um object URL para o Blob e o revoga ao trocar de Blob ou desmontar.
 * Retorna undefined enquanto não há Blob.
 */
export function useObjectUrl(blob: Blob | undefined | null): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

export interface MiniaturaBlobProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  blob: Blob | undefined | null;
  alt: string;
  /** Texto quando não há imagem. */
  vazio?: string;
}

/** Mostra uma imagem a partir de um Blob (miniatura ou original), com revogação do URL. */
export function MiniaturaBlob({ blob, alt, vazio = 'Sem foto', className, ...resto }: MiniaturaBlobProps) {
  const url = useObjectUrl(blob);
  const classes = ['miniatura', className ?? ''].filter(Boolean).join(' ');
  if (!url) {
    return (
      <div className={`${classes} miniatura-vazia`} role="img" aria-label={alt}>
        {blob === undefined || blob === null ? vazio : ''}
      </div>
    );
  }
  return <img src={url} alt={alt} className={classes} loading="lazy" decoding="async" {...resto} />;
}

export interface MiniaturaMidiaProps extends Omit<MiniaturaBlobProps, 'blob'> {
  /** ID da mídia na tabela `midias` (fotos de peças/looks/compras). */
  midiaId: ID | undefined;
  /** Mostrar o original em vez da miniatura (ex.: tela cheia, prancha). */
  original?: boolean;
}

/** Atalho: carrega a mídia pelo ID e mostra a miniatura (ou o original). */
export function MiniaturaMidia({ midiaId, original, ...resto }: MiniaturaMidiaProps) {
  const midia = useMidia(midiaId);
  return <MiniaturaBlob blob={midia ? (original ? midia.original : midia.miniatura) : undefined} {...resto} />;
}
