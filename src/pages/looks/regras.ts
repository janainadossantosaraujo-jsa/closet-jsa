/**
 * Regras puras (sem React e sem banco) usadas por Looks e Semana:
 * agrupamento da prancha, avisos de conforto e alertas das regras da semana.
 */
import {
  DISPONIBILIDADES,
  GRUPO_DA_CATEGORIA,
  rotuloDe,
  type DiaISO,
  type DiaSemana,
  type GrupoCategoria,
  type ID,
  type Look,
  type Peca,
  type RegrasSemana,
} from '../../db/schema';

// ---------------------------------------------------------------------------
// Prancha: grupos de peças
// ---------------------------------------------------------------------------

/** Ordem e rótulos dos grupos na prancha (complemento aparece como "Acessórios"). */
export const GRUPOS_PRANCHA: readonly { valor: GrupoCategoria; rotulo: string }[] = [
  { valor: 'parte_de_cima', rotulo: 'Parte de cima' },
  { valor: 'parte_de_baixo', rotulo: 'Parte de baixo' },
  { valor: 'corpo_inteiro', rotulo: 'Peça única' },
  { valor: 'calcado', rotulo: 'Calçado' },
  { valor: 'complemento', rotulo: 'Acessórios' },
];

export interface GrupoPrancha {
  grupo: GrupoCategoria;
  rotulo: string;
  pecas: Peca[];
}

/** Agrupa as peças por região do corpo, na ordem da prancha; omite grupos vazios. */
export function agruparPecas(pecas: readonly Peca[]): GrupoPrancha[] {
  return GRUPOS_PRANCHA.map((g) => ({
    grupo: g.valor,
    rotulo: g.rotulo,
    pecas: pecas.filter((p) => (GRUPO_DA_CATEGORIA[p.categoria] ?? 'complemento') === g.valor),
  })).filter((g) => g.pecas.length > 0);
}

// ---------------------------------------------------------------------------
// Avisos de conforto e disponibilidade
// ---------------------------------------------------------------------------

export interface AvisoConforto {
  pecaId: ID;
  nome: string;
  motivos: string[];
}

/** Motivos de conforto da peça que merecem aviso (D25): justa em cima ou "veste bem: não". */
export function motivosConforto(p: Peca): string[] {
  const m: string[] = [];
  if (p.desconfortos?.includes('justa_em_cima')) m.push('justa na parte de cima');
  if (p.vesteBem === 'nao') m.push('marcada como “veste bem: não”');
  return m;
}

export function avisosConforto(pecas: readonly Peca[]): AvisoConforto[] {
  return pecas
    .map((p) => ({ pecaId: p.id, nome: p.nome, motivos: motivosConforto(p) }))
    .filter((a) => a.motivos.length > 0);
}

export function estaDisponivel(p: Peca): boolean {
  return p.disponibilidade === 'disponivel';
}

export function rotuloDisponibilidade(p: Peca): string {
  return rotuloDe(DISPONIBILIDADES, p.disponibilidade);
}

// ---------------------------------------------------------------------------
// Datas simples (sem fuso: tratadas como UTC só para contar dias)
// ---------------------------------------------------------------------------

const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function diaUTC(dia: DiaISO): number {
  const [a, m, d] = dia.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
}

/** Diferença em dias de calendário (b − a). */
export function diferencaDias(a: DiaISO, b: DiaISO): number {
  return Math.round((diaUTC(b) - diaUTC(a)) / 86_400_000);
}

/** "seg", "ter"… */
export function diaCurto(dia: DiaISO): string {
  return DIAS_CURTOS[new Date(diaUTC(dia)).getUTCDay()];
}

// ---------------------------------------------------------------------------
// Alertas da semana
// ---------------------------------------------------------------------------

export type NivelAlerta = 'alerta' | 'info';
export type TipoAlerta = 'indisponivel' | 'repeticao' | 'intervalo' | 'lavagem';

export interface AlertaSemana {
  dia: DiaISO;
  pecaId: ID;
  tipo: TipoAlerta;
  nivel: NivelAlerta;
  mensagem: string;
}

/** Peças "vestidas" no dia: as do look escolhido + as fixadas (alternativas não contam). */
export function pecasUsadasNoDia(dia: DiaSemana, looksPorId: ReadonlyMap<ID, Look>): ID[] {
  const doLook = dia.lookId ? (looksPorId.get(dia.lookId)?.pecaIds ?? []) : [];
  return [...new Set([...doLook, ...dia.pecasFixadasIds])];
}

function precisaLavarEntreUsos(p: Peca, regras: RegrasSemana): boolean {
  return regras.pecasLavarEntreUsosIds.includes(p.id) || regras.categoriasLavarEntreUsos.includes(p.categoria);
}

/**
 * Alertas das regras da semana:
 * - peça indisponível (para lavar, emprestada, conserto, guardada) usada num dia a partir de `hoje`;
 * - repetição de peça quando a repetição está desligada;
 * - repetição antes do intervalo mínimo (dias sem usar entre dois usos);
 * - peça que precisa ser lavada entre usos usada em dias seguidos (alerta) ou repetida (lembrete).
 */
export function alertasSemana(
  semana: { dias: readonly DiaSemana[]; regras: RegrasSemana },
  looks: readonly Look[],
  pecas: readonly Peca[],
  hoje?: DiaISO,
): AlertaSemana[] {
  const looksPorId = new Map(looks.map((l) => [l.id, l]));
  const pecasPorId = new Map(pecas.map((p) => [p.id, p]));
  const { regras } = semana;
  const alertas: AlertaSemana[] = [];
  const usos = new Map<ID, DiaISO[]>();

  const dias = [...semana.dias].sort((a, b) => a.data.localeCompare(b.data));
  for (const dia of dias) {
    for (const id of pecasUsadasNoDia(dia, looksPorId)) {
      const p = pecasPorId.get(id);
      if (!p) continue;
      usos.set(id, [...(usos.get(id) ?? []), dia.data]);
      if (!estaDisponivel(p) && (!hoje || dia.data >= hoje)) {
        const situacao = p.disponibilidade === 'para_lavar' ? 'está marcada “para lavar”' : `está indisponível (${rotuloDisponibilidade(p).toLowerCase()})`;
        alertas.push({ dia: dia.data, pecaId: id, tipo: 'indisponivel', nivel: 'alerta', mensagem: `${p.nome} ${situacao}.` });
      }
    }
  }

  for (const [id, datas] of usos) {
    const p = pecasPorId.get(id)!;
    for (let i = 1; i < datas.length; i++) {
      const anterior = datas[i - 1];
      const atual = datas[i];
      const diasEntre = diferencaDias(anterior, atual) - 1;
      if (!regras.repeticaoPermitida) {
        alertas.push({
          dia: atual,
          pecaId: id,
          tipo: 'repeticao',
          nivel: 'alerta',
          mensagem: `${p.nome} repete (já usada ${diaCurto(anterior)}), e a repetição está desligada nesta semana.`,
        });
        continue;
      }
      if (regras.intervaloMinimoDias && diasEntre < regras.intervaloMinimoDias) {
        alertas.push({
          dia: atual,
          pecaId: id,
          tipo: 'intervalo',
          nivel: 'alerta',
          mensagem: `${p.nome} repete com ${diasEntre} dia(s) de intervalo desde ${diaCurto(anterior)} (mínimo: ${regras.intervaloMinimoDias}).`,
        });
      }
      if (precisaLavarEntreUsos(p, regras)) {
        if (diasEntre < 1) {
          alertas.push({
            dia: atual,
            pecaId: id,
            tipo: 'lavagem',
            nivel: 'alerta',
            mensagem: `${p.nome} precisa ser lavada entre usos e foi usada no dia anterior (${diaCurto(anterior)}).`,
          });
        } else {
          alertas.push({
            dia: atual,
            pecaId: id,
            tipo: 'lavagem',
            nivel: 'info',
            mensagem: `Lembrete: lavar ${p.nome} depois de ${diaCurto(anterior)}.`,
          });
        }
      }
    }
  }

  return alertas.sort((a, b) => a.dia.localeCompare(b.dia) || (a.nivel === b.nivel ? 0 : a.nivel === 'alerta' ? -1 : 1));
}
