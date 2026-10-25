/**
 * Estimativa de caimento (B15; D16, D24, D25). Funções puras, sem acesso ao banco.
 *
 * É uma estimativa, não garantia: os limiares (./limiares.ts) são heurística inicial a
 * calibrar com o feedback real de conforto.
 *
 * Regras principais:
 * - Largura aberta (peça deitada) ×2 ≈ circunferência (exceto ombros, que é largura).
 * - Medidas lineares (comprimento, manga, entrepernas…) não entram na folga; aparecem
 *   em `informativas`.
 * - Medida da peça: folga = peça − corpo. Tabela de medidas do CORPO da loja: margem =
 *   medida recomendada − sua medida (a loja já embutiu a folga da modelagem).
 * - A pior região define o nível (não há média que compense aperto).
 * - Faltando medida essencial da categoria (sua ou da peça) → indeterminado.
 * - Preferência "evitar justa" (D25): "justa" vira problema (nível baixo) na região.
 */

import {
  GRUPO_DA_CATEGORIA,
  REGIOES_MEDIDA,
  REGIOES_PARTE_DE_CIMA,
  agoraISO,
  rotuloDe,
} from '../../db/schema';
import type {
  Categoria,
  DataISO,
  Elasticidade,
  GrupoCategoria,
  LinhaTabelaTamanhos,
  MedidaCorporal,
  NivelCaimento,
  PreferenciaFolga,
  PreferenciaFolgaRegiao,
  RegiaoFolga,
  RegiaoMedida,
  ResultadoCaimento,
  ResultadoMedidaCaimento,
  SituacaoFolga,
  TipoMedida,
  UnidadeMedida,
} from '../../db/schema';
import {
  AJUSTE_LIMIAR_POR_REGIAO,
  DESLOCAMENTO_PREFERENCIA,
  ELASTICIDADE_PADRAO,
  LIMIARES_FOLGA_PECA,
  LIMIARES_OMBROS,
  LIMIARES_TABELA_CORPO,
} from './limiares';
import type { LimiaresFolga } from './limiares';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Uma medida de peça ou de linha de tabela (MedidaPeca e LinhaTabelaTamanhos servem). */
export interface MedidaEntrada {
  regiao: RegiaoMedida;
  valor: number;
  unidade: UnidadeMedida;
  tipo: TipoMedida;
}

/**
 * De onde vêm as medidas a comparar:
 * - medidas_peca: medidas da própria peça (closet ou anúncio);
 * - tabela_peca: linha de tabela da loja com medidas DA PEÇA;
 * - tabela_corpo: linha de tabela da loja com medidas DO CORPO recomendadas para o tamanho.
 */
export type FonteMedidas =
  | { tipo: 'medidas_peca'; medidas: readonly MedidaEntrada[] }
  | { tipo: 'tabela_peca'; linha: LinhaTabelaTamanhos }
  | { tipo: 'tabela_corpo'; linha: LinhaTabelaTamanhos };

export type TipoFonteMedidas = FonteMedidas['tipo'];

/** Medidas corporais: registros do banco ou um mapa simples região → cm. */
export type MedidasCorpoEntrada = readonly MedidaCorporal[] | Partial<Record<RegiaoMedida, number>>;

export interface EntradaCaimento {
  corpo: MedidasCorpoEntrada;
  categoria: Categoria;
  /** Não informada → considerada "nenhuma" (conservador). */
  elasticidade?: Elasticidade;
  preferencias?: readonly PreferenciaFolgaRegiao[];
  fonte: FonteMedidas;
  /** Data do cálculo (para testes); padrão: agora. */
  agora?: DataISO;
}

export type NivelRegiao = Exclude<NivelCaimento, 'indeterminado'>;

/** Resultado por região, estendendo o tipo do schema. */
export interface ResultadoMedidaCaimentoDetalhado extends ResultadoMedidaCaimento {
  /** Nível desta região (ausente quando sem dado). */
  nivel?: NivelRegiao;
  /** Com que a sua medida foi comparada. */
  base: 'medida_peca' | 'tabela_corpo';
  /** Valor como informado, antes de converter (ex.: largura aberta 52). */
  valorInformadoCm?: number;
  tipoInformado?: TipoMedida;
  /** Só tabela_corpo: medida de corpo recomendada pela loja para o tamanho. */
  medidaTabelaCorpoCm?: number;
  /** Só tabela_corpo: medida da tabela − sua medida. */
  diferencaCm?: number;
  /** A preferência pede evitar roupa justa nesta região (D25). */
  evitarJusta: boolean;
}

/** Medida que não entra no cálculo de folga (comprimentos etc.), mostrada só para informação. */
export interface MedidaInformativa {
  regiao: RegiaoMedida;
  valorCm: number;
  tipo: TipoMedida;
  medidaCorpoCm?: number;
  explicacao: string;
}

/**
 * Resultado completo. Estende `ResultadoCaimento` do schema (pode ser salvo em
 * `CompraCandidata.estimativaCaimento` sem conversão).
 */
export interface ResultadoCaimentoDetalhado extends ResultadoCaimento {
  porMedida: ResultadoMedidaCaimentoDetalhado[];
  fonte: TipoFonteMedidas;
  tamanho?: string;
  informativas: MedidaInformativa[];
  elasticidadeConsiderada: Elasticidade;
  elasticidadeInformada: boolean;
  regioesEssenciais: RegiaoMedida[];
}

// ---------------------------------------------------------------------------
// Constantes de regras
// ---------------------------------------------------------------------------

/** Regiões essenciais por grupo de categoria; calçado e complemento não são estimados. */
export const REGIOES_ESSENCIAIS: Readonly<Record<GrupoCategoria, readonly RegiaoMedida[]>> = {
  parte_de_cima: ['busto'],
  parte_de_baixo: ['cintura', 'quadril'],
  corpo_inteiro: ['busto', 'quadril'],
  calcado: [],
  complemento: [],
};

/** Regiões medidas em volta (circunferência): largura aberta ×2. */
export const REGIOES_CIRCUNFERENCIA: readonly RegiaoMedida[] = [
  'busto',
  'braco',
  'cava',
  'cintura',
  'barriga',
  'quadril',
  'coxa',
  'panturrilha',
  'pescoco',
];

/** Regiões comparadas como largura (sem ×2). */
export const REGIOES_LARGURA: readonly RegiaoMedida[] = ['ombros'];

/** Fator para converter largura aberta (peça deitada) em circunferência. */
export const FATOR_LARGURA_ABERTA = 2;

/** Região de medida → região de preferência de folga. */
const REGIAO_FOLGA_DE: Readonly<Partial<Record<RegiaoMedida, RegiaoFolga>>> = {
  busto: 'busto',
  ombros: 'ombros',
  braco: 'bracos_cava',
  cava: 'bracos_cava',
  cintura: 'cintura',
  barriga: 'barriga',
  quadril: 'quadril',
  coxa: 'coxas',
  panturrilha: 'pernas',
};

const PREPOSICAO: Readonly<Partial<Record<RegiaoMedida, string>>> = {
  busto: 'no busto',
  ombros: 'nos ombros',
  braco: 'no braço',
  cava: 'na cava',
  cintura: 'na cintura',
  barriga: 'na barriga',
  quadril: 'no quadril',
  coxa: 'na coxa',
  panturrilha: 'na panturrilha',
  pescoco: 'no pescoço',
};

const ORDEM_NIVEL: Readonly<Record<NivelRegiao, number>> = { baixo: 0, medio: 1, alto: 2 };

const ROTULO_SITUACAO: Readonly<Record<SituacaoFolga, string>> = {
  apertada: 'apertada',
  justa: 'justa',
  confortavel: 'confortável',
  folgada: 'folgada',
  sem_dado: 'sem dado',
};

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

function valido(n: number | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

function cm(n: number): string {
  const r = Math.round(n * 10) / 10;
  return `${String(r).replace('.', ',')} cm`;
}

function rotuloRegiao(r: RegiaoMedida): string {
  return rotuloDe(REGIOES_MEDIDA, r);
}

function minusculo(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function naRegiao(r: RegiaoMedida): string {
  return PREPOSICAO[r] ?? `em ${minusculo(rotuloRegiao(r))}`;
}

function listar(itens: string[]): string {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}

/** Valor vigente de uma medida corporal (registro `atualId`, ou o mais recente). */
export function valorAtualMedidaCorporal(m: MedidaCorporal): number | undefined {
  const atual = m.atualId ? m.historico.find((h) => h.id === m.atualId) : undefined;
  if (atual) return atual.valor;
  const ordenado = [...m.historico].sort((a, b) => b.data.localeCompare(a.data));
  return ordenado[0]?.valor;
}

/** Converte a entrada de medidas corporais num mapa região → cm (só valores válidos). */
export function mapaMedidasCorpo(corpo: MedidasCorpoEntrada): Partial<Record<RegiaoMedida, number>> {
  const mapa: Partial<Record<RegiaoMedida, number>> = {};
  if (Array.isArray(corpo)) {
    for (const m of corpo as readonly MedidaCorporal[]) {
      const v = valorAtualMedidaCorporal(m);
      if (valido(v)) mapa[m.regiao] = v;
    }
  } else {
    for (const [regiao, v] of Object.entries(corpo as Partial<Record<RegiaoMedida, number>>)) {
      if (valido(v)) mapa[regiao as RegiaoMedida] = v;
    }
  }
  return mapa;
}

interface PreferenciaAplicada {
  preferencia?: PreferenciaFolga;
  folgaMinimaCm?: number;
  evitarJusta: boolean;
}

/**
 * Preferência que vale para a região: a específica (ex.: busto) tem prioridade; nas
 * regiões da parte de cima, sem preferência específica, vale a de "parte_de_cima" (D25).
 */
export function preferenciaDaRegiao(
  regiao: RegiaoMedida,
  preferencias: readonly PreferenciaFolgaRegiao[] = [],
): PreferenciaAplicada {
  const rf = REGIAO_FOLGA_DE[regiao];
  const especifica = rf ? preferencias.find((p) => p.regiao === rf) : undefined;
  const geral = REGIOES_PARTE_DE_CIMA.includes(regiao)
    ? preferencias.find((p) => p.regiao === 'parte_de_cima')
    : undefined;
  const p = especifica ?? geral;
  if (!p) return { evitarJusta: false };
  return { preferencia: p.preferencia, folgaMinimaCm: p.folgaMinimaCm, evitarJusta: p.evitarJusta };
}

function limiaresPara(
  regiao: RegiaoMedida,
  base: 'medida_peca' | 'tabela_corpo',
  elasticidade: Elasticidade,
  pref: PreferenciaAplicada,
): LimiaresFolga {
  let l: LimiaresFolga;
  if (base === 'tabela_corpo') {
    l = { ...LIMIARES_TABELA_CORPO[elasticidade] };
  } else if (REGIOES_LARGURA.includes(regiao)) {
    l = { ...LIMIARES_OMBROS[elasticidade] };
  } else {
    l = { ...LIMIARES_FOLGA_PECA[elasticidade] };
    const aj = AJUSTE_LIMIAR_POR_REGIAO[regiao];
    if (aj) {
      l.justaAbaixoDe += aj.justa;
      l.folgadaAPartirDe += aj.folgada;
    }
  }
  if (pref.preferencia) {
    const d = DESLOCAMENTO_PREFERENCIA[pref.preferencia];
    l.justaAbaixoDe += d.justa;
    l.folgadaAPartirDe += d.folgada;
  }
  // Folga mínima desejada só faz sentido com medida da peça (folga real).
  if (base === 'medida_peca' && pref.folgaMinimaCm != null && Number.isFinite(pref.folgaMinimaCm)) {
    l.justaAbaixoDe = Math.max(l.justaAbaixoDe, pref.folgaMinimaCm);
  }
  // Mantém a ordem dos limites.
  l.justaAbaixoDe = Math.max(l.justaAbaixoDe, l.apertadaAbaixoDe);
  l.folgadaAPartirDe = Math.max(l.folgadaAPartirDe, l.justaAbaixoDe + 1);
  return l;
}

/** Classifica uma diferença (folga ou margem) com os limiares dados. */
export function classificarFolga(diferenca: number, l: LimiaresFolga): Exclude<SituacaoFolga, 'sem_dado'> {
  if (diferenca < l.apertadaAbaixoDe) return 'apertada';
  if (diferenca < l.justaAbaixoDe) return 'justa';
  if (diferenca < l.folgadaAPartirDe) return 'confortavel';
  return 'folgada';
}

function nivelDaSituacao(s: Exclude<SituacaoFolga, 'sem_dado'>, pref: PreferenciaAplicada): NivelRegiao {
  switch (s) {
    case 'confortavel':
      return 'alto';
    case 'folgada':
      return 'medio';
    case 'justa':
      if (pref.evitarJusta) return 'baixo';
      return pref.preferencia === 'justa' || pref.preferencia === 'ajustada' ? 'alto' : 'medio';
    case 'apertada':
      return 'baixo';
  }
}

// ---------------------------------------------------------------------------
// Estimativa
// ---------------------------------------------------------------------------

interface MedidaComparavel {
  valorCm: number;
  valorInformadoCm: number;
  tipo: TipoMedida;
}

/** Separa as medidas da fonte em comparáveis (por região) e informativas. */
function separarMedidas(
  medidas: readonly MedidaEntrada[],
  base: 'medida_peca' | 'tabela_corpo',
): { comparaveis: Map<RegiaoMedida, MedidaComparavel>; informativas: MedidaEntrada[] } {
  const comparaveis = new Map<RegiaoMedida, MedidaComparavel>();
  const informativas: MedidaEntrada[] = [];
  for (const m of medidas) {
    if (!valido(m.valor)) continue;
    let valorCm: number | undefined;
    const circ = REGIOES_CIRCUNFERENCIA.includes(m.regiao);
    const larg = REGIOES_LARGURA.includes(m.regiao);
    if (base === 'tabela_corpo') {
      // Medidas do corpo: a volta (circunferência) ou a largura dos ombros, sem conversão.
      if (circ && m.tipo === 'circunferencia') valorCm = m.valor;
      else if (larg && m.tipo !== 'circunferencia') valorCm = m.valor;
    } else if (circ) {
      if (m.tipo === 'circunferencia') valorCm = m.valor;
      else if (m.tipo === 'largura_aberta') valorCm = m.valor * FATOR_LARGURA_ABERTA;
    } else if (larg && m.tipo !== 'circunferencia') {
      valorCm = m.valor;
    }
    if (valorCm === undefined) {
      informativas.push(m);
    } else if (!comparaveis.has(m.regiao)) {
      comparaveis.set(m.regiao, { valorCm, valorInformadoCm: m.valor, tipo: m.tipo });
    }
  }
  return { comparaveis, informativas };
}

function textoFolgaPeca(folga: number): string {
  if (folga > 0) return `${cm(folga)} de folga`;
  if (folga === 0) return 'sem folga (mesma medida do corpo)';
  return `${cm(-folga)} menor que o corpo`;
}

function textoMargemTabela(dif: number): string {
  if (dif > 0) return `${cm(dif)} acima da sua medida`;
  if (dif === 0) return 'igual à sua medida';
  return `sua medida passa ${cm(-dif)}`;
}

const SUFIXO_EVITAR_JUSTA = '; você prefere evitar roupa justa aqui';

function explicarFaltante(regiao: RegiaoMedida, faltaCorpo: boolean, faltaPeca: boolean, base: string): string {
  const r = minusculo(rotuloRegiao(regiao));
  const quem = base === 'tabela_corpo' ? 'da tabela' : 'da peça';
  if (faltaCorpo && faltaPeca) return `Sem medida de ${r} (sua e ${quem}) — não dá para estimar`;
  if (faltaCorpo) return `Sem sua medida de ${r} — não dá para estimar`;
  return `Sem medida de ${r} ${quem} — não dá para estimar`;
}

/** Estima o caimento de uma peça (ou de um tamanho da tabela) no seu corpo atual. */
export function estimarCaimento(entrada: EntradaCaimento): ResultadoCaimentoDetalhado {
  const calculadoEm = entrada.agora ?? agoraISO();
  const elasticidadeInformada = entrada.elasticidade != null;
  const elasticidade = entrada.elasticidade ?? ELASTICIDADE_PADRAO;
  const grupo = GRUPO_DA_CATEGORIA[entrada.categoria];
  const essenciais = [...REGIOES_ESSENCIAIS[grupo]];
  const fonte = entrada.fonte;
  const base = fonte.tipo === 'tabela_corpo' ? 'tabela_corpo' : 'medida_peca';
  const medidasFonte = fonte.tipo === 'medidas_peca' ? fonte.medidas : fonte.linha.medidas;
  const tamanho = fonte.tipo === 'medidas_peca' ? undefined : fonte.linha.tamanho;
  const corpo = mapaMedidasCorpo(entrada.corpo);

  const { comparaveis, informativas: brutasInformativas } = separarMedidas(medidasFonte, base);

  const informativas: MedidaInformativa[] = brutasInformativas.map((m) => {
    const corpoCm = corpo[m.regiao];
    const rot = rotuloRegiao(m.regiao);
    const tipoTxt = m.tipo === 'largura_aberta' ? ' (largura aberta)' : '';
    const corpoTxt = valido(corpoCm) ? `; sua medida ${cm(corpoCm)}` : '';
    return {
      regiao: m.regiao,
      valorCm: m.valor,
      tipo: m.tipo,
      medidaCorpoCm: valido(corpoCm) ? corpoCm : undefined,
      explicacao: `${rot}: ${cm(m.valor)}${tipoTxt}${corpoTxt} — só informativo, não entra na folga`,
    };
  });

  if (essenciais.length === 0) {
    return {
      nivel: 'indeterminado',
      porMedida: [],
      explicacao: 'Esta categoria não tem estimativa de caimento por medidas.',
      faltando: [],
      calculadoEm,
      fonte: fonte.tipo,
      tamanho,
      informativas,
      elasticidadeConsiderada: elasticidade,
      elasticidadeInformada,
      regioesEssenciais: essenciais,
    };
  }

  // Regiões avaliadas: essenciais sempre; as demais quando a fonte traz medida comparável.
  const regioes: RegiaoMedida[] = [...essenciais];
  for (const r of comparaveis.keys()) if (!regioes.includes(r)) regioes.push(r);

  const porMedida: ResultadoMedidaCaimentoDetalhado[] = [];
  const faltando: RegiaoMedida[] = [];
  const faltantesTexto: string[] = [];

  for (const regiao of regioes) {
    const pref = preferenciaDaRegiao(regiao, entrada.preferencias);
    const corpoCm = corpo[regiao];
    const ref = comparaveis.get(regiao);
    if (!valido(corpoCm) || !ref) {
      if (essenciais.includes(regiao)) {
        faltando.push(regiao);
        const r = minusculo(rotuloRegiao(regiao));
        const quem = base === 'tabela_corpo' ? 'da tabela' : 'da peça';
        faltantesTexto.push(
          !valido(corpoCm) && !ref ? `${r} (sua e ${quem})` : !valido(corpoCm) ? `${r} (sua)` : `${r} (${quem})`,
        );
      }
      porMedida.push({
        regiao,
        medidaCorpoCm: valido(corpoCm) ? corpoCm : undefined,
        medidaPecaCm: base === 'medida_peca' ? ref?.valorCm : undefined,
        medidaTabelaCorpoCm: base === 'tabela_corpo' ? ref?.valorCm : undefined,
        situacao: 'sem_dado',
        explicacao: explicarFaltante(regiao, !valido(corpoCm), !ref, base),
        base,
        evitarJusta: pref.evitarJusta,
      });
      continue;
    }

    const limiares = limiaresPara(regiao, base, elasticidade, pref);
    const dif = ref.valorCm - corpoCm;
    const situacao = classificarFolga(dif, limiares);
    const nivel = nivelDaSituacao(situacao, pref);
    const rot = rotuloRegiao(regiao);
    const sufixo = situacao === 'justa' && pref.evitarJusta ? SUFIXO_EVITAR_JUSTA : '';

    if (base === 'tabela_corpo') {
      const tam = tamanho ? ` para o tamanho ${tamanho}` : '';
      porMedida.push({
        regiao,
        medidaCorpoCm: corpoCm,
        situacao,
        nivel,
        explicacao:
          `${rot}: tabela da loja indica ${cm(ref.valorCm)} de corpo${tam}, ` +
          `${textoMargemTabela(dif)} — ${ROTULO_SITUACAO[situacao]}${sufixo}`,
        base,
        medidaTabelaCorpoCm: ref.valorCm,
        diferencaCm: dif,
        valorInformadoCm: ref.valorInformadoCm,
        tipoInformado: ref.tipo,
        evitarJusta: pref.evitarJusta,
      });
    } else {
      const conv =
        ref.tipo === 'largura_aberta' && REGIOES_CIRCUNFERENCIA.includes(regiao)
          ? ` (peça ${cm(ref.valorCm)}: largura aberta ${cm(ref.valorInformadoCm)} × 2)`
          : '';
      porMedida.push({
        regiao,
        medidaCorpoCm: corpoCm,
        medidaPecaCm: ref.valorCm,
        folgaCm: dif,
        situacao,
        nivel,
        explicacao: `${rot}: ${textoFolgaPeca(dif)} — ${ROTULO_SITUACAO[situacao]}${sufixo}${conv}`,
        base,
        valorInformadoCm: ref.valorInformadoCm,
        tipoInformado: ref.tipo,
        evitarJusta: pref.evitarJusta,
      });
    }
  }

  const comum = {
    porMedida,
    faltando,
    calculadoEm,
    fonte: fonte.tipo,
    tamanho,
    informativas,
    elasticidadeConsiderada: elasticidade,
    elasticidadeInformada,
    regioesEssenciais: essenciais,
  };

  if (faltando.length > 0) {
    return {
      ...comum,
      nivel: 'indeterminado',
      explicacao: `Não dá para estimar: falta medida de ${listar(faltantesTexto)}.`,
    };
  }

  // A pior região define o nível.
  const avaliadas = porMedida.filter((m): m is ResultadoMedidaCaimentoDetalhado & { nivel: NivelRegiao } => !!m.nivel);
  let nivel: NivelRegiao = 'alto';
  for (const m of avaliadas) if (ORDEM_NIVEL[m.nivel] < ORDEM_NIVEL[nivel]) nivel = m.nivel;

  const partes: string[] = [];
  if (nivel === 'alto') {
    partes.push('Tende a servir bem (nível alto).');
  } else {
    const problemas = avaliadas
      .filter((m) => m.nivel === nivel)
      .map((m) => `${ROTULO_SITUACAO[m.situacao]} ${naRegiao(m.regiao)}`);
    const inicio = nivel === 'medio' ? 'Pode servir, com ressalvas (nível médio)' : 'Tende a não servir bem (nível baixo)';
    partes.push(`${inicio}: tende a ficar ${listar(problemas)}.`);
  }
  if (base === 'tabela_corpo') {
    partes.push('Comparação com a tabela de medidas do corpo da loja, não com a peça.');
  }
  if (!elasticidadeInformada) {
    partes.push('Elasticidade não informada; considerada sem elasticidade.');
  }
  partes.push('É uma estimativa, não garantia.');

  return { ...comum, nivel, explicacao: partes.join(' ') };
}

// ---------------------------------------------------------------------------
// Escolha de tamanho numa tabela
// ---------------------------------------------------------------------------

export interface EntradaEscolhaTamanho extends Omit<EntradaCaimento, 'fonte'> {
  tabela: readonly LinhaTabelaTamanhos[];
  /** "corpo": a tabela traz medidas do corpo recomendadas; "peca": medidas da peça. */
  tipoTabela: 'corpo' | 'peca';
}

export interface ResultadoTamanho {
  tamanho: string;
  resultado: ResultadoCaimentoDetalhado;
}

export interface ResultadoEscolhaTamanho {
  /** Tamanho que tende a servir melhor (só quando o nível é alto ou médio). */
  melhor?: string;
  nivelMelhor: NivelCaimento;
  /** Quando todos os tamanhos ficam com nível baixo: o menos problemático. */
  menosProblematico?: string;
  /** Na ordem da tabela. */
  porTamanho: ResultadoTamanho[];
  explicacao: string;
}

/** Centro da faixa confortável de cada região, para desempatar tamanhos do mesmo nível. */
function desvioDoConforto(r: ResultadoCaimentoDetalhado, entrada: EntradaEscolhaTamanho): number {
  const elasticidade = r.elasticidadeConsiderada;
  let pior = 0;
  for (const m of r.porMedida) {
    const dif = m.base === 'tabela_corpo' ? m.diferencaCm : m.folgaCm;
    if (dif === undefined) continue;
    const l = limiaresPara(m.regiao, m.base, elasticidade, preferenciaDaRegiao(m.regiao, entrada.preferencias));
    const centro = (l.justaAbaixoDe + l.folgadaAPartirDe) / 2;
    pior = Math.max(pior, Math.abs(dif - centro));
  }
  return pior;
}

/** Avalia cada tamanho da tabela e indica qual tende a servir melhor. */
export function escolherTamanho(entrada: EntradaEscolhaTamanho): ResultadoEscolhaTamanho {
  const { tabela, tipoTabela, ...resto } = entrada;
  const porTamanho: ResultadoTamanho[] = tabela.map((linha) => ({
    tamanho: linha.tamanho,
    resultado: estimarCaimento({
      ...resto,
      fonte: tipoTabela === 'corpo' ? { tipo: 'tabela_corpo', linha } : { tipo: 'tabela_peca', linha },
    }),
  }));

  const ordem: Record<NivelCaimento, number> = { indeterminado: -1, baixo: 0, medio: 1, alto: 2 };
  let escolhido: ResultadoTamanho | undefined;
  let chave: [number, number, number] | undefined;
  for (const t of porTamanho) {
    const r = t.resultado;
    if (r.nivel === 'indeterminado') continue;
    const confortaveis = r.porMedida.filter((m) => m.situacao === 'confortavel').length;
    const k: [number, number, number] = [ordem[r.nivel], confortaveis, -desvioDoConforto(r, entrada)];
    if (!chave || k[0] > chave[0] || (k[0] === chave[0] && (k[1] > chave[1] || (k[1] === chave[1] && k[2] > chave[2])))) {
      chave = k;
      escolhido = t;
    }
  }

  if (!escolhido) {
    return {
      nivelMelhor: 'indeterminado',
      porTamanho,
      explicacao: 'Não dá para indicar um tamanho: faltam medidas essenciais (suas ou da tabela).',
    };
  }
  const nivel = escolhido.resultado.nivel;
  if (nivel === 'baixo') {
    return {
      nivelMelhor: 'baixo',
      menosProblematico: escolhido.tamanho,
      porTamanho,
      explicacao: `Nenhum tamanho tende a servir bem; o menos problemático é o ${escolhido.tamanho}. É uma estimativa, não garantia.`,
    };
  }
  const nivelTxt = nivel === 'alto' ? 'nível alto' : 'nível médio';
  return {
    melhor: escolhido.tamanho,
    nivelMelhor: nivel,
    porTamanho,
    explicacao: `O tamanho ${escolhido.tamanho} tende a servir melhor (${nivelTxt}). É uma estimativa, não garantia.`,
  };
}
