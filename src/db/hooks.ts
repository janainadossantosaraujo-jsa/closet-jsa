/**
 * Hooks React reativos (useLiveQuery): a tela atualiza sozinha quando o banco muda.
 * Retornam `undefined` enquanto carregam.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import {
  filtrarPecas,
  perfilPadrao,
  registroAtual,
  type FiltroPecas,
} from './repo';
import { PERFIL_ID, type ChaveMeta, type DiaISO, type ID, type Ocasiao, type TipoDonoMidia } from './schema';

/** Lista de peças (mais recentes primeiro), com filtro opcional. */
export function usePecas(filtro: FiltroPecas = {}) {
  const chave = JSON.stringify(filtro);
  return useLiveQuery(async () => {
    const todas = await db.pecas.toArray();
    return filtrarPecas(todas, filtro).sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));
  }, [chave]); // `chave` representa o filtro inteiro
}

export function usePeca(id: ID | undefined) {
  return useLiveQuery(() => (id ? db.pecas.get(id) : undefined), [id]);
}

/** Mídias de um dono (peça/look/compra). Para peças, respeita a ordem de `midiaIds`. */
export function useMidiasDoDono(donoTipo: TipoDonoMidia, donoId: ID | undefined) {
  return useLiveQuery(async () => {
    if (!donoId) return [];
    const midias = await db.midias.where('[donoTipo+donoId]').equals([donoTipo, donoId]).toArray();
    if (donoTipo === 'peca') {
      const p = await db.pecas.get(donoId);
      if (p) {
        const ordem = new Map(p.midiaIds.map((m, i) => [m, i]));
        midias.sort((a, b) => (ordem.get(a.id) ?? 999) - (ordem.get(b.id) ?? 999));
      }
    }
    return midias;
  }, [donoTipo, donoId]);
}

export function useMidia(id: ID | undefined) {
  return useLiveQuery(() => (id ? db.midias.get(id) : undefined), [id]);
}

export function useLooks(filtro: { ocasiao?: Ocasiao; pecaId?: ID } = {}) {
  const { ocasiao, pecaId } = filtro;
  return useLiveQuery(async () => {
    let looks = pecaId ? await db.looks.where('pecaIds').equals(pecaId).toArray() : await db.looks.toArray();
    if (ocasiao) looks = looks.filter((l) => l.ocasiao === ocasiao);
    return looks.sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
  }, [ocasiao, pecaId]);
}

export function useLook(id: ID | undefined) {
  return useLiveQuery(() => (id ? db.looks.get(id) : undefined), [id]);
}

/** Semana pelo dia inicial (segunda). `null` se ainda não existe (use obterOuCriarSemana). */
export function useSemana(inicio: DiaISO | undefined) {
  return useLiveQuery(
    async () => (inicio ? ((await db.semanas.where('inicio').equals(inicio).first()) ?? null) : null),
    [inicio],
  );
}

export function useSemanas() {
  return useLiveQuery(() => db.semanas.orderBy('inicio').reverse().toArray(), []);
}

/** Perfil salvo ou o perfil padrão (não gravado) com a preferência D25. */
export function usePerfil() {
  return useLiveQuery(async () => (await db.perfil.get(PERFIL_ID)) ?? perfilPadrao(), []);
}

export function useMedidasCorporais() {
  return useLiveQuery(() => db.medidasCorporais.toArray(), []);
}

/** Medidas corporais com o registro vigente já resolvido. */
export function useMedidasCorporaisAtuais() {
  return useLiveQuery(async () => {
    const todas = await db.medidasCorporais.toArray();
    return todas.map((m) => ({ medida: m, atual: registroAtual(m) }));
  }, []);
}

/** Fotos do corpo (tabela separada). */
export function useFotosCorpo() {
  return useLiveQuery(() => db.midiasCorpo.orderBy('criadaEm').toArray(), []);
}

export function useCompras() {
  return useLiveQuery(async () => (await db.compras.toArray()).sort((a, b) => b.criadaEm.localeCompare(a.criadaEm)), []);
}

export function useMeta<T = unknown>(chave: ChaveMeta) {
  return useLiveQuery(async () => (await db.meta.get(chave))?.valor as T | undefined, [chave]);
}

/** Contagens rápidas (ex.: tela de ajustes). */
export function useContagens() {
  return useLiveQuery(async () => ({
    pecas: await db.pecas.count(),
    midias: await db.midias.count(),
    midiasCorpo: await db.midiasCorpo.count(),
    looks: await db.looks.count(),
    semanas: await db.semanas.count(),
    compras: await db.compras.count(),
  }), []);
}
