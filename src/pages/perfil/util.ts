/**
 * Funções puras da seção Perfil (formatação e operações em listas do perfil).
 * Não acessam o banco: as telas gravam o resultado com `salvarPerfil`.
 */
import { paraDiaISO } from '../../db/repo';
import {
  agoraISO,
  novoId,
  type MedidaCorporal,
  type NivelFormalidade,
  type PreferenciaFolgaRegiao,
  type RegiaoFolga,
  type RegistroMedidaCorporal,
  type TipoCompromisso,
} from '../../db/schema';

// ---------------------------------------------------------------------------
// Datas e números
// ---------------------------------------------------------------------------

/** "24/10/2026" a partir de uma data ISO (ou vazio). */
export function formatarData(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** "98,5 cm". */
export function formatarCm(valor: number): string {
  const v = Math.round(valor * 10) / 10;
  return `${String(v).replace('.', ',')} cm`;
}

/** Dia de hoje em "AAAA-MM-DD" (fuso local). */
export function hojeDia(): string {
  return paraDiaISO(new Date());
}

/**
 * Converte o dia escolhido ("AAAA-MM-DD") em data ISO.
 * Hoje → agora; outro dia → meio-dia local daquele dia (evita trocar de dia pelo fuso).
 */
export function diaParaISO(dia: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || dia === hojeDia()) return agoraISO();
  const d = new Date(`${dia}T12:00:00`);
  return Number.isNaN(d.getTime()) ? agoraISO() : d.toISOString();
}

/** Histórico do mais recente para o mais antigo. */
export function historicoOrdenado(m: MedidaCorporal | undefined): RegistroMedidaCorporal[] {
  if (!m) return [];
  return [...m.historico].sort((a, b) => b.data.localeCompare(a.data));
}

// ---------------------------------------------------------------------------
// Listas de texto (estilos, cores, o que não usa)
// ---------------------------------------------------------------------------

/** Acrescenta um item (sem espaços extras e sem repetir, ignorando maiúsculas). */
export function adicionarItem(lista: readonly string[], item: string): string[] {
  const t = item.trim().replace(/\s+/g, ' ');
  if (!t) return [...lista];
  if (lista.some((x) => x.toLocaleLowerCase('pt-BR') === t.toLocaleLowerCase('pt-BR'))) return [...lista];
  return [...lista, t];
}

export function removerItem(lista: readonly string[], item: string): string[] {
  return lista.filter((x) => x !== item);
}

// ---------------------------------------------------------------------------
// Cores
// ---------------------------------------------------------------------------

export function ehHex(cor: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(cor);
}

/** "#ABC" → "#aabbcc"; "#AABBCC" → "#aabbcc"; nomes ficam como digitados (aparados). */
export function normalizarCor(texto: string): string | undefined {
  const t = texto.trim();
  if (!t) return undefined;
  const curto = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(t);
  if (curto) return `#${curto[1]}${curto[1]}${curto[2]}${curto[2]}${curto[3]}${curto[3]}`.toLowerCase();
  const longo = /^#?([0-9a-f]{6})$/i.exec(t);
  if (longo) return `#${longo[1]}`.toLowerCase();
  return t.replace(/\s+/g, ' ');
}

// ---------------------------------------------------------------------------
// Preferências de folga
// ---------------------------------------------------------------------------

/** Substitui (ou acrescenta) a preferência da região, mantendo a ordem das demais. */
export function definirFolga(
  lista: readonly PreferenciaFolgaRegiao[],
  pref: PreferenciaFolgaRegiao,
): PreferenciaFolgaRegiao[] {
  const i = lista.findIndex((p) => p.regiao === pref.regiao);
  if (i < 0) return [...lista, pref];
  return lista.map((p, j) => (j === i ? pref : p));
}

export function removerFolga(lista: readonly PreferenciaFolgaRegiao[], regiao: RegiaoFolga): PreferenciaFolgaRegiao[] {
  return lista.filter((p) => p.regiao !== regiao);
}

// ---------------------------------------------------------------------------
// Tipos de compromisso
// ---------------------------------------------------------------------------

export function adicionarTipoCompromisso(
  lista: readonly TipoCompromisso[],
  nome: string,
  formalidade?: NivelFormalidade,
): TipoCompromisso[] {
  const t = nome.trim().replace(/\s+/g, ' ');
  if (!t) return [...lista];
  return [...lista, { id: novoId(), nome: t, formalidade }];
}

export function atualizarTipoCompromisso(
  lista: readonly TipoCompromisso[],
  id: string,
  alteracoes: Partial<Omit<TipoCompromisso, 'id'>>,
): TipoCompromisso[] {
  return lista.map((t) => {
    if (t.id !== id) return t;
    const novo = { ...t, ...alteracoes };
    if (alteracoes.nome !== undefined) {
      const nome = alteracoes.nome.trim().replace(/\s+/g, ' ');
      novo.nome = nome || t.nome; // nome nunca fica vazio
    }
    return novo;
  });
}

export function removerTipoCompromisso(lista: readonly TipoCompromisso[], id: string): TipoCompromisso[] {
  return lista.filter((t) => t.id !== id);
}
