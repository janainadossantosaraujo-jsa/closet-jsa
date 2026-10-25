import { useLiveQuery } from 'dexie-react-hooks';
import { obterPeca } from '../../db/repo';
import type { ID, Peca } from '../../db/schema';

/**
 * Como `usePeca`, mas distingue "carregando" (undefined) de "não existe" (null).
 * (O `usePeca` de db/hooks devolve undefined nos dois casos.)
 */
export function usePecaOuNula(id: ID | undefined): Peca | null | undefined {
  return useLiveQuery(async () => (id ? ((await obterPeca(id)) ?? null) : null), [id]);
}
