import { useMemo } from 'react';
import { useSemana } from '../../db/hooks';
import { atualizarDia, atualizarSemana, deDiaISO, obterOuCriarSemana, paraDiaISO } from '../../db/repo';
import type { DiaISO, DiaSemana, RegrasSemana, Semana } from '../../db/schema';

export const REGRAS_PADRAO: RegrasSemana = { repeticaoPermitida: true, pecasLavarEntreUsosIds: [], categoriasLavarEntreUsos: [] };

export function somarDias(dia: DiaISO, n: number): DiaISO {
  const d = deDiaISO(dia);
  d.setDate(d.getDate() + n);
  return paraDiaISO(d);
}

export function diaVazio(data: DiaISO): DiaSemana {
  return { data, compromissos: [], alternativasLookIds: [], pecasFixadasIds: [] };
}

/** Os 7 dias (segunda a domingo), usando os gravados quando existirem. */
export function seteDias(inicio: DiaISO, gravados: readonly DiaSemana[] = []): DiaSemana[] {
  return Array.from({ length: 7 }, (_, i) => {
    const data = somarDias(inicio, i);
    return gravados.find((d) => d.data === data) ?? diaVazio(data);
  });
}

export interface SemanaVista {
  inicio: DiaISO;
  /** Semana gravada, se já existe (é criada sob demanda na primeira alteração). */
  gravada?: Semana;
  dias: DiaSemana[];
  regras: RegrasSemana;
}

/** Semana gravada ou "virtual" (ainda não criada). undefined enquanto carrega. */
export function useSemanaVista(inicio: DiaISO): SemanaVista | undefined {
  const s = useSemana(inicio);
  return useMemo(() => {
    if (s === undefined) return undefined;
    return { inicio, gravada: s ?? undefined, dias: seteDias(inicio, s?.dias), regras: s?.regras ?? REGRAS_PADRAO };
  }, [s, inicio]);
}

/** Salva um dia (cria a semana se preciso). */
export async function salvarDia(inicio: DiaISO, dia: DiaSemana): Promise<void> {
  const s = await obterOuCriarSemana(inicio);
  await atualizarDia(s.id, dia);
}

export async function salvarRegras(inicio: DiaISO, regras: RegrasSemana): Promise<void> {
  const s = await obterOuCriarSemana(inicio);
  await atualizarSemana(s.id, { regras });
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Segunda-feira, 20/10". */
export function nomeDia(dia: DiaISO): string {
  return capitalizar(deDiaISO(dia).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }));
}

/** "Seg" */
export function nomeDiaCurto(dia: DiaISO): string {
  return capitalizar(deDiaISO(dia).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''));
}

/** "20 a 26 de out. de 2026" (formato simples). */
export function rotuloSemana(inicio: DiaISO): string {
  const a = deDiaISO(inicio);
  const b = deDiaISO(somarDias(inicio, 6));
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${fmt(a)} a ${fmt(b)}/${b.getFullYear()}`;
}
