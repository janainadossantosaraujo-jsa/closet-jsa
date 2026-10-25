/**
 * Ligação entre Looks e Semana: montar um look a partir de um dia da semana
 * e, ao salvar, colocá-lo no dia (como look escolhido ou alternativa).
 */
import { atualizarDia, obterOuCriarSemana } from '../../db/repo';
import type { DiaISO, DiaSemana, ID, Ocasiao } from '../../db/schema';
import { ehDiaISO } from './dados';

export type PapelNoDia = 'look' | 'alternativa';

export interface DestinoSemana {
  semana: DiaISO;
  dia: DiaISO;
  papel: PapelNoDia;
}

/** Caminho para montar um novo look já destinado a um dia da semana. */
export function caminhoNovoLookParaDia(destino: DestinoSemana, extra: { ocasiao?: Ocasiao; pecaIds?: ID[] } = {}): string {
  const q = new URLSearchParams({ semana: destino.semana, dia: destino.dia, papel: destino.papel });
  if (extra.ocasiao) q.set('ocasiao', extra.ocasiao);
  for (const id of extra.pecaIds ?? []) q.append('peca', id);
  return `/looks/novo?${q.toString()}`;
}

/** Lê o destino da URL (se houver e for válido). */
export function lerDestino(params: URLSearchParams): DestinoSemana | undefined {
  const semana = params.get('semana');
  const dia = params.get('dia');
  if (!ehDiaISO(semana) || !ehDiaISO(dia)) return undefined;
  return { semana, dia, papel: params.get('papel') === 'alternativa' ? 'alternativa' : 'look' };
}

export function caminhoDia(semana: DiaISO, dia: DiaISO): string {
  return `/semana/${semana}/${dia}`;
}

/** Coloca o look no dia (cria a semana se ainda não existir). */
export async function colocarLookNoDia(destino: DestinoSemana, lookId: ID): Promise<void> {
  const s = await obterOuCriarSemana(destino.semana);
  const atual: DiaSemana = s.dias.find((d) => d.data === destino.dia) ?? {
    data: destino.dia,
    compromissos: [],
    alternativasLookIds: [],
    pecasFixadasIds: [],
  };
  const novo: DiaSemana =
    destino.papel === 'alternativa'
      ? { ...atual, alternativasLookIds: atual.alternativasLookIds.includes(lookId) ? atual.alternativasLookIds : [...atual.alternativasLookIds, lookId] }
      : { ...atual, lookId, alternativasLookIds: atual.alternativasLookIds.filter((x) => x !== lookId) };
  await atualizarDia(s.id, novo);
}
