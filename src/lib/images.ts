/**
 * Miniaturas de fotos. O original nunca é alterado: a miniatura é um novo Blob JPEG.
 */

export const LADO_MAIOR_MINIATURA = 400;
export const QUALIDADE_MINIATURA = 0.8;

export interface ResultadoMiniatura {
  miniatura: Blob;
  /** Dimensões do original (após orientação EXIF). */
  largura: number;
  altura: number;
}

interface FonteImagem {
  fonte: CanvasImageSource;
  largura: number;
  altura: number;
  liberar: () => void;
}

async function carregar(arquivo: Blob): Promise<FonteImagem> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
      return { fonte: bmp, largura: bmp.width, altura: bmp.height, liberar: () => bmp.close() };
    } catch {
      // cai para <img> (alguns formatos/navegadores)
    }
  }
  const url = URL.createObjectURL(arquivo);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return {
      fonte: img,
      largura: img.naturalWidth,
      altura: img.naturalHeight,
      liberar: () => URL.revokeObjectURL(url),
    };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw new Error('Não foi possível ler a imagem.', { cause: e });
  }
}

/** Calcula dimensões que cabem em `ladoMaior` sem ampliar. */
export function dimensoesMiniatura(largura: number, altura: number, ladoMaior = LADO_MAIOR_MINIATURA) {
  const escala = Math.min(1, ladoMaior / Math.max(largura, altura));
  return {
    largura: Math.max(1, Math.round(largura * escala)),
    altura: Math.max(1, Math.round(altura * escala)),
  };
}

/** Gera miniatura JPEG (~400 px no lado maior, qualidade 0,8) a partir de File/Blob. */
export async function gerarMiniatura(
  arquivo: Blob,
  ladoMaior = LADO_MAIOR_MINIATURA,
  qualidade = QUALIDADE_MINIATURA,
): Promise<ResultadoMiniatura> {
  const img = await carregar(arquivo);
  try {
    const { largura, altura } = dimensoesMiniatura(img.largura, img.altura, ladoMaior);
    let miniatura: Blob;
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(largura, altura);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas indisponível.');
      ctx.fillStyle = '#ffffff'; // fundo branco para PNG com transparência
      ctx.fillRect(0, 0, largura, altura);
      ctx.drawImage(img.fonte, 0, 0, largura, altura);
      miniatura = await canvas.convertToBlob({ type: 'image/jpeg', quality: qualidade });
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = largura;
      canvas.height = altura;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas indisponível.');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, largura, altura);
      ctx.drawImage(img.fonte, 0, 0, largura, altura);
      miniatura = await new Promise<Blob>((ok, erro) =>
        canvas.toBlob((b) => (b ? ok(b) : erro(new Error('Falha ao gerar miniatura.'))), 'image/jpeg', qualidade),
      );
    }
    return { miniatura, largura: img.largura, altura: img.altura };
  } finally {
    img.liberar();
  }
}
