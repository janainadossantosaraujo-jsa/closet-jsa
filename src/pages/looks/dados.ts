import { useMemo } from 'react';
import { useLooks, usePecas } from '../../db/hooks';
import { OCASIOES, rotuloDe, type ID, type Look, type Peca } from '../../db/schema';
import { agruparPecas } from './regras';

/** Todas as peças indexadas por ID (undefined enquanto carrega). */
export function usePecasMapa(): ReadonlyMap<ID, Peca> | undefined {
  const pecas = usePecas();
  return useMemo(() => (pecas ? new Map(pecas.map((p) => [p.id, p])) : undefined), [pecas]);
}

/** Todos os looks indexados por ID (undefined enquanto carrega). */
export function useLooksMapa(): { lista: Look[]; mapa: ReadonlyMap<ID, Look> } | undefined {
  const looks = useLooks();
  return useMemo(() => (looks ? { lista: looks, mapa: new Map(looks.map((l) => [l.id, l])) } : undefined), [looks]);
}

/** Peças existentes do look, na ordem do look. */
export function pecasDoLook(look: Pick<Look, 'pecaIds'>, mapa: ReadonlyMap<ID, Peca>): Peca[] {
  return look.pecaIds.map((id) => mapa.get(id)).filter((p): p is Peca => !!p);
}

/** Nome para exibir: o nome dado, ou as peças. */
export function nomeDoLook(look: Look, mapa?: ReadonlyMap<ID, Peca>): string {
  if (look.nome?.trim()) return look.nome.trim();
  const nomes = mapa ? agruparPecas(pecasDoLook(look, mapa)).flatMap((g) => g.pecas.map((p) => p.nome)) : [];
  if (!nomes.length) return 'Look sem nome';
  return nomes.length > 3 ? `${nomes.slice(0, 3).join(' + ')}…` : nomes.join(' + ');
}

export function rotuloOcasiao(look: Look): string {
  return rotuloDe(OCASIOES, look.ocasiao);
}

/** "AAAA-MM-DD" válido? */
export function ehDiaISO(s: string | null | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

/** "20/10/2026" a partir de "2026-10-20". */
export function formatarDiaCurto(dia: string): string {
  const [a, m, d] = dia.split('-');
  return `${d}/${m}/${a}`;
}
