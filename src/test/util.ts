import { db } from '../db/db';
import { TABELAS } from '../db/schema';

/** Limpa todas as tabelas do banco de teste. */
export async function limparBanco(): Promise<void> {
  await db.transaction('rw', TABELAS.map((t) => db.table(t)), async () => {
    await Promise.all(TABELAS.map((t) => db.table(t).clear()));
  });
}

/** Blob de "imagem" falsa com bytes determinísticos. */
export function imagemFalsa(semente: number, tamanho = 2048, tipo = 'image/jpeg'): Blob {
  const b = new Uint8Array(tamanho);
  for (let i = 0; i < tamanho; i++) b[i] = (i * 31 + semente * 17) % 256;
  return new Blob([b], { type: tipo });
}

export async function bytesDe(blob: Blob): Promise<number[]> {
  return Array.from(new Uint8Array(await blob.arrayBuffer()));
}

/** Mock de gerarMiniatura (não há canvas no Node): miniatura = primeiros 100 bytes. */
export const miniaturaFalsa = async (arquivo: Blob) => ({
  miniatura: new Blob([await arquivo.slice(0, 100).arrayBuffer()], { type: 'image/jpeg' }),
  largura: 4000,
  altura: 3000,
});
