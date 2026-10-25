/**
 * Funções puras da seção Closet (sem React): filtros extras, sugestões,
 * conversão formulário ↔ peça. Testadas em util.test.ts.
 */
import { filtrarPecas } from '../../db/repo';
import {
  agoraISO,
  novoId,
  type Categoria,
  type Desconforto,
  type Disponibilidade,
  type Elasticidade,
  type Estacao,
  type Estrutura,
  type MedidaPeca,
  type NovaPeca,
  type Ocasiao,
  type OrigemDado,
  type Peca,
  type RegiaoMedida,
  type TipoMedida,
  type TipoMidiaPeca,
  type VesteBem,
} from '../../db/schema';

// ---------------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------------

/** Minúsculas, sem acento e sem espaços extras (para comparar textos). */
export function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Texto aparado ou undefined se vazio. */
export function textoOuNada(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t ? t : undefined;
}

// ---------------------------------------------------------------------------
// Filtros da lista
// ---------------------------------------------------------------------------

/** Valor especial do filtro de "veste bem" para peças ainda sem avaliação. */
export const SEM_AVALIACAO = 'sem_avaliacao';
/** Valor especial do filtro de localização para peças sem localização. */
export const SEM_LOCALIZACAO = '__sem_localizacao__';

export interface FiltrosCloset {
  busca: string;
  categorias: Categoria[];
  ocasiao?: Ocasiao;
  disponibilidades: Disponibilidade[];
  vesteBem?: VesteBem | typeof SEM_AVALIACAO;
  /** Localização exata (comparada sem acento) ou SEM_LOCALIZACAO. */
  localizacao?: string;
  somenteFavoritas: boolean;
}

export const FILTROS_VAZIOS: FiltrosCloset = {
  busca: '',
  categorias: [],
  disponibilidades: [],
  somenteFavoritas: false,
};

/** Quantos filtros (fora a busca) estão ativos. */
export function contarFiltrosAtivos(f: FiltrosCloset): number {
  return (
    (f.categorias.length ? 1 : 0) +
    (f.ocasiao ? 1 : 0) +
    (f.disponibilidades.length ? 1 : 0) +
    (f.vesteBem ? 1 : 0) +
    (f.localizacao ? 1 : 0) +
    (f.somenteFavoritas ? 1 : 0)
  );
}

/** Aplica busca (sem acento, via repo) e todos os filtros da tela. */
export function aplicarFiltros(pecas: Peca[], f: FiltrosCloset): Peca[] {
  const base = filtrarPecas(pecas, {
    busca: f.busca.trim() || undefined,
    categoria: f.categorias.length ? f.categorias : undefined,
    disponibilidade: f.disponibilidades.length ? f.disponibilidades : undefined,
    ocasiao: f.ocasiao,
    somenteFavoritas: f.somenteFavoritas || undefined,
  });
  const loc = f.localizacao && f.localizacao !== SEM_LOCALIZACAO ? semAcento(f.localizacao) : undefined;
  return base.filter((p) => {
    if (f.vesteBem === SEM_AVALIACAO && p.vesteBem) return false;
    if (f.vesteBem && f.vesteBem !== SEM_AVALIACAO && p.vesteBem !== f.vesteBem) return false;
    if (f.localizacao === SEM_LOCALIZACAO && textoOuNada(p.localizacao)) return false;
    if (loc && semAcento(p.localizacao ?? '') !== loc) return false;
    return true;
  });
}

/** Ordena: mais recentes primeiro. */
export function ordenarRecentes(pecas: Peca[]): Peca[] {
  return [...pecas].sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));
}

// ---------------------------------------------------------------------------
// Sugestões (valores já usados)
// ---------------------------------------------------------------------------

/**
 * Valores distintos já usados em um campo de texto, do mais usado para o menos usado.
 * Variações só de acento/maiúsculas contam como o mesmo valor (fica a grafia mais recente).
 */
export function valoresUsados(pecas: Peca[], campo: (p: Peca) => string | undefined): string[] {
  const mapa = new Map<string, { texto: string; n: number; quando: string }>();
  for (const p of pecas) {
    const t = textoOuNada(campo(p));
    if (!t) continue;
    const chave = semAcento(t);
    const atual = mapa.get(chave);
    if (!atual) mapa.set(chave, { texto: t, n: 1, quando: p.atualizadaEm });
    else {
      atual.n += 1;
      if (p.atualizadaEm > atual.quando) {
        atual.texto = t;
        atual.quando = p.atualizadaEm;
      }
    }
  }
  return [...mapa.values()]
    .sort((a, b) => b.n - a.n || a.texto.localeCompare(b.texto, 'pt-BR'))
    .map((v) => v.texto);
}

/** Sugestões que combinam com o que já foi digitado (sem acento), excluindo o próprio texto. */
export function sugestoesPara(digitado: string, valores: string[], limite = 6): string[] {
  const d = semAcento(digitado);
  return valores.filter((v) => semAcento(v) !== d && (!d || semAcento(v).includes(d))).slice(0, limite);
}

// ---------------------------------------------------------------------------
// Fotos
// ---------------------------------------------------------------------------

/** Tipo sugerido para a foto pela posição: 1ª frente, 2ª costas, demais detalhe. */
export function tipoFotoPadrao(indice: number): TipoMidiaPeca {
  if (indice === 0) return 'frente';
  if (indice === 1) return 'costas';
  return 'detalhe';
}

/** Move um item de posição (devolve nova lista). */
export function mover<T>(lista: readonly T[], de: number, para: number): T[] {
  if (de < 0 || de >= lista.length || para < 0 || para >= lista.length || de === para) return [...lista];
  const nova = [...lista];
  const [item] = nova.splice(de, 1);
  nova.splice(para, 0, item);
  return nova;
}

// ---------------------------------------------------------------------------
// Medidas
// ---------------------------------------------------------------------------

const REGIOES_LINEARES: readonly RegiaoMedida[] = ['comprimento', 'comprimento_manga', 'entrepernas', 'gancho', 'altura', 'pe'];

/** Tipo de medida mais provável para a região (comprimentos são lineares; o resto, largura aberta). */
export function tipoMedidaPadrao(regiao: RegiaoMedida): TipoMedida {
  return REGIOES_LINEARES.includes(regiao) ? 'linear' : 'largura_aberta';
}

/** Volta aproximada de uma largura aberta (peça deitada: frente + costas = ×2). */
export function voltaDaLarguraAberta(valor: number): number {
  return Math.round(valor * 2 * 10) / 10;
}

/** Formata número em pt-BR (vírgula decimal, até 1 casa). */
export function formatarCm(valor: number): string {
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} cm`;
}

// ---------------------------------------------------------------------------
// Formulário
// ---------------------------------------------------------------------------

export interface LinhaMedida {
  /** ID da medida (existente ou novo). */
  id: string;
  regiao?: RegiaoMedida;
  valor?: number;
  tipo: TipoMedida;
  origem: OrigemDado;
  observacao: string;
  /** Data original (medidas existentes). */
  data?: string;
}

export interface FormPecaEstado {
  nome: string;
  categoria?: Categoria;
  cor: string;
  estampa: string;
  tecido: string;
  composicao: string;
  elasticidade?: Elasticidade;
  estrutura?: Estrutura;
  tamanhoEtiqueta: string;
  marca: string;
  medidas: LinhaMedida[];
  ocasioes: Ocasiao[];
  estacoes: Estacao[];
  vesteBem?: VesteBem;
  desconfortos: Desconforto[];
  observacoesConforto: string;
  localizacao: string;
  disponibilidade: Disponibilidade;
  favorita: boolean;
  observacoes: string;
}

export function formVazio(): FormPecaEstado {
  return {
    nome: '',
    cor: '',
    estampa: '',
    tecido: '',
    composicao: '',
    tamanhoEtiqueta: '',
    marca: '',
    medidas: [],
    ocasioes: [],
    estacoes: [],
    desconfortos: [],
    observacoesConforto: '',
    localizacao: '',
    disponibilidade: 'disponivel',
    favorita: false,
    observacoes: '',
  };
}

export function novaLinhaMedida(): LinhaMedida {
  return { id: novoId(), tipo: 'largura_aberta', origem: 'conferido', observacao: '' };
}

export function formDePeca(p: Peca): FormPecaEstado {
  return {
    nome: p.nome,
    categoria: p.categoria,
    cor: p.cor ?? '',
    estampa: p.estampa ?? '',
    tecido: p.tecido ?? '',
    composicao: p.composicao ?? '',
    elasticidade: p.elasticidade,
    estrutura: p.estrutura,
    tamanhoEtiqueta: p.tamanhoEtiqueta ?? '',
    marca: p.marca ?? '',
    medidas: p.medidas.map((m) => ({
      id: m.id,
      regiao: m.regiao,
      valor: m.valor,
      tipo: m.tipo,
      origem: m.origem,
      observacao: m.observacao ?? '',
      data: m.data,
    })),
    ocasioes: [...p.ocasioes],
    estacoes: [...p.estacoes],
    vesteBem: p.vesteBem,
    desconfortos: [...p.desconfortos],
    observacoesConforto: p.observacoesConforto ?? '',
    localizacao: p.localizacao ?? '',
    disponibilidade: p.disponibilidade,
    favorita: !!p.favorita,
    observacoes: p.observacoes ?? '',
  };
}

export interface ErrosForm {
  nome?: string;
  categoria?: string;
}

export function validarForm(f: FormPecaEstado): ErrosForm {
  const e: ErrosForm = {};
  if (!f.nome.trim()) e.nome = 'Dê um nome à peça (ex.: "Blusa azul de linho").';
  if (!f.categoria) e.categoria = 'Escolha a categoria.';
  return e;
}

/** Linha de medida completa (região e valor > 0)? */
export function medidaCompleta(l: LinhaMedida): l is LinhaMedida & { regiao: RegiaoMedida; valor: number } {
  return !!l.regiao && l.valor !== undefined && Number.isFinite(l.valor) && l.valor > 0;
}

/**
 * Converte as linhas do formulário em medidas da peça (descarta linhas incompletas).
 * Mantém a data das medidas não alteradas; atualiza a data das alteradas.
 */
export function medidasDoForm(linhas: LinhaMedida[], anteriores: MedidaPeca[] = []): MedidaPeca[] {
  const agora = agoraISO();
  const porId = new Map(anteriores.map((m) => [m.id, m]));
  return linhas.filter(medidaCompleta).map((l) => {
    const obs = textoOuNada(l.observacao);
    const ant = porId.get(l.id);
    const igual =
      ant &&
      ant.regiao === l.regiao &&
      ant.valor === l.valor &&
      ant.tipo === l.tipo &&
      ant.origem === l.origem &&
      (ant.observacao ?? undefined) === obs;
    const m: MedidaPeca = {
      id: l.id,
      regiao: l.regiao,
      valor: l.valor,
      unidade: 'cm',
      tipo: l.tipo,
      origem: l.origem,
      data: igual && ant ? ant.data : agora,
    };
    if (obs) m.observacao = obs;
    return m;
  });
}

/**
 * Dados da peça a partir do formulário (pressupõe formulário válido).
 * Campos de texto vazios viram `undefined` (em edição, o Dexie remove a propriedade).
 */
export function dadosDoForm(f: FormPecaEstado, medidasAnteriores: MedidaPeca[] = []): NovaPeca & Required<Pick<NovaPeca, 'medidas' | 'ocasioes' | 'estacoes' | 'desconfortos' | 'disponibilidade'>> {
  if (!f.categoria) throw new Error('Escolha a categoria.');
  return {
    nome: f.nome.trim(),
    categoria: f.categoria,
    cor: textoOuNada(f.cor),
    estampa: textoOuNada(f.estampa),
    tecido: textoOuNada(f.tecido),
    composicao: textoOuNada(f.composicao),
    elasticidade: f.elasticidade,
    estrutura: f.estrutura,
    tamanhoEtiqueta: textoOuNada(f.tamanhoEtiqueta),
    marca: textoOuNada(f.marca),
    medidas: medidasDoForm(f.medidas, medidasAnteriores),
    ocasioes: [...f.ocasioes],
    estacoes: [...f.estacoes],
    vesteBem: f.vesteBem,
    desconfortos: [...f.desconfortos],
    observacoesConforto: textoOuNada(f.observacoesConforto),
    localizacao: textoOuNada(f.localizacao),
    disponibilidade: f.disponibilidade,
    favorita: f.favorita || undefined,
    observacoes: textoOuNada(f.observacoes),
  };
}

/** Remove chaves com valor undefined (para criar peça sem propriedades vazias). */
export function semIndefinidos<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

/** Quantas informações opcionais uma seção do formulário tem preenchidas (para o resumo da seção). */
export function preenchidos(...valores: unknown[]): number {
  return valores.filter((v) => (Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim() !== '' : v !== undefined && v !== false)).length;
}
