/**
 * Armazenamento persistente: pede ao navegador para não apagar os dados por falta de
 * espaço e informa uso/cota. Tudo local; nenhuma chamada de rede.
 */

export interface SituacaoArmazenamento {
  /** API disponível neste navegador. */
  suportado: boolean;
  /** O armazenamento já é persistente. */
  persistente: boolean;
  /** Bytes usados (estimativa do navegador). */
  usoBytes?: number;
  /** Cota total disponível para o app (estimativa do navegador). */
  cotaBytes?: number;
}

export async function armazenamentoPersistente(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false;
  } catch {
    return false;
  }
}

/** Pede armazenamento persistente. Retorna true se concedido (ou já concedido). */
export async function pedirArmazenamentoPersistente(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function situacaoArmazenamento(): Promise<SituacaoArmazenamento> {
  const suportado = typeof navigator !== 'undefined' && !!navigator.storage;
  if (!suportado) return { suportado: false, persistente: false };
  const persistente = await armazenamentoPersistente();
  try {
    const est = await navigator.storage.estimate();
    return { suportado, persistente, usoBytes: est.usage, cotaBytes: est.quota };
  } catch {
    return { suportado, persistente };
  }
}

/** Formata bytes em pt-BR, ex.: "1,5 GB". */
export function formatarBytes(bytes: number | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return '—';
  const unidades = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < unidades.length - 1) {
    v /= 1024;
    i++;
  }
  const casas = i === 0 || v >= 100 ? 0 : 1;
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: casas, minimumFractionDigits: 0 })} ${unidades[i]}`;
}
