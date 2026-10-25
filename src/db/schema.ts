/**
 * Modelo de dados do Closet JSA (ARQUITETURA-MVP.md, seção B2; decisões D06, D24, D25).
 *
 * ATENÇÃO: este arquivo é compartilhado por todas as telas. Não edite sem necessidade;
 * mudanças aqui exigem nova versão do banco em db.ts e revisão do backup.
 *
 * Convenções:
 * - IDs: string gerada por `novoId()` (crypto.randomUUID()).
 * - Datas: string ISO 8601 (`agoraISO()`); datas sem hora (dia da semana) em "AAAA-MM-DD".
 * - Medidas sempre em centímetros (unidade "cm"), com origem do dado.
 * - Campos opcionais podem ser preenchidos aos poucos; obrigatórios marcados no comentário.
 */

// ---------------------------------------------------------------------------
// Utilitários básicos
// ---------------------------------------------------------------------------

export type ID = string;
/** Data/hora em ISO 8601, ex.: "2026-10-24T13:45:00.000Z". */
export type DataISO = string;
/** Data sem hora, ex.: "2026-10-24". */
export type DiaISO = string;

export function novoId(): ID {
  return crypto.randomUUID();
}

export function agoraISO(): DataISO {
  return new Date().toISOString();
}

/** Opção de lista com rótulo em português para as telas. */
export interface Opcao<T extends string> {
  readonly valor: T;
  readonly rotulo: string;
}

/** Busca o rótulo em português de um valor de lista. */
export function rotuloDe<T extends string>(
  lista: readonly Opcao<T>[],
  valor: T | undefined | null,
): string {
  if (valor == null) return '';
  return lista.find((o) => o.valor === valor)?.rotulo ?? valor;
}

/** Extrai os valores de uma lista de opções (útil para validação). */
export function valoresDe<T extends string>(lista: readonly Opcao<T>[]): T[] {
  return lista.map((o) => o.valor);
}

// ---------------------------------------------------------------------------
// Origem do dado (informado / estimado / conferido)
// ---------------------------------------------------------------------------

export type OrigemDado = 'informado' | 'estimado' | 'conferido';

export const ORIGENS_DADO: readonly Opcao<OrigemDado>[] = [
  { valor: 'informado', rotulo: 'Informado' },
  { valor: 'estimado', rotulo: 'Estimado' },
  { valor: 'conferido', rotulo: 'Conferido' },
];

export type UnidadeMedida = 'cm';

export const UNIDADES_MEDIDA: readonly Opcao<UnidadeMedida>[] = [
  { valor: 'cm', rotulo: 'cm' },
];

// ---------------------------------------------------------------------------
// Listas de valores da peça
// ---------------------------------------------------------------------------

export type Categoria =
  | 'blusa'
  | 'camisa'
  | 'camiseta'
  | 'regata'
  | 'calca'
  | 'bermuda_short'
  | 'saia'
  | 'vestido'
  | 'macacao'
  | 'casaco_blazer'
  | 'sapato'
  | 'sandalia'
  | 'bolsa'
  | 'acessorio'
  | 'joia_bijuteria'
  | 'roupa_intima'
  | 'pijama'
  | 'moda_praia'
  | 'outro';

/** Categorias propostas (podem mudar após os primeiros testes — D25). */
export const CATEGORIAS: readonly Opcao<Categoria>[] = [
  { valor: 'blusa', rotulo: 'Blusa' },
  { valor: 'camisa', rotulo: 'Camisa' },
  { valor: 'camiseta', rotulo: 'Camiseta' },
  { valor: 'regata', rotulo: 'Regata' },
  { valor: 'calca', rotulo: 'Calça' },
  { valor: 'bermuda_short', rotulo: 'Bermuda / short' },
  { valor: 'saia', rotulo: 'Saia' },
  { valor: 'vestido', rotulo: 'Vestido' },
  { valor: 'macacao', rotulo: 'Macacão' },
  { valor: 'casaco_blazer', rotulo: 'Casaco / blazer' },
  { valor: 'sapato', rotulo: 'Sapato' },
  { valor: 'sandalia', rotulo: 'Sandália' },
  { valor: 'bolsa', rotulo: 'Bolsa' },
  { valor: 'acessorio', rotulo: 'Acessório' },
  { valor: 'joia_bijuteria', rotulo: 'Joia / bijuteria' },
  { valor: 'roupa_intima', rotulo: 'Roupa íntima' },
  { valor: 'pijama', rotulo: 'Pijama' },
  { valor: 'moda_praia', rotulo: 'Moda praia' },
  { valor: 'outro', rotulo: 'Outro' },
];

/** Grupo de região do corpo a que a categoria se refere (para caimento e looks). */
export type GrupoCategoria = 'parte_de_cima' | 'parte_de_baixo' | 'corpo_inteiro' | 'calcado' | 'complemento';

export const GRUPO_DA_CATEGORIA: Readonly<Record<Categoria, GrupoCategoria>> = {
  blusa: 'parte_de_cima',
  camisa: 'parte_de_cima',
  camiseta: 'parte_de_cima',
  regata: 'parte_de_cima',
  casaco_blazer: 'parte_de_cima',
  calca: 'parte_de_baixo',
  bermuda_short: 'parte_de_baixo',
  saia: 'parte_de_baixo',
  vestido: 'corpo_inteiro',
  macacao: 'corpo_inteiro',
  pijama: 'corpo_inteiro',
  moda_praia: 'corpo_inteiro',
  roupa_intima: 'corpo_inteiro',
  sapato: 'calcado',
  sandalia: 'calcado',
  bolsa: 'complemento',
  acessorio: 'complemento',
  joia_bijuteria: 'complemento',
  outro: 'complemento',
};

export const GRUPOS_CATEGORIA: readonly Opcao<GrupoCategoria>[] = [
  { valor: 'parte_de_cima', rotulo: 'Parte de cima' },
  { valor: 'parte_de_baixo', rotulo: 'Parte de baixo' },
  { valor: 'corpo_inteiro', rotulo: 'Peça única' },
  { valor: 'calcado', rotulo: 'Calçado' },
  { valor: 'complemento', rotulo: 'Complemento' },
];

export type Ocasiao =
  | 'trabalho'
  | 'audiencia_solenidade'
  | 'reuniao'
  | 'lazer'
  | 'casa'
  | 'evento_social'
  | 'viagem'
  | 'exercicio';

/** Ocasiões propostas (podem mudar após os primeiros testes). */
export const OCASIOES: readonly Opcao<Ocasiao>[] = [
  { valor: 'trabalho', rotulo: 'Trabalho' },
  { valor: 'audiencia_solenidade', rotulo: 'Audiência / solenidade' },
  { valor: 'reuniao', rotulo: 'Reunião' },
  { valor: 'lazer', rotulo: 'Lazer' },
  { valor: 'casa', rotulo: 'Casa' },
  { valor: 'evento_social', rotulo: 'Evento social' },
  { valor: 'viagem', rotulo: 'Viagem' },
  { valor: 'exercicio', rotulo: 'Exercício' },
];

export type Estacao = 'calor_forte' | 'calor' | 'meia_estacao' | 'frio' | 'chuva' | 'qualquer';

export const ESTACOES: readonly Opcao<Estacao>[] = [
  { valor: 'calor_forte', rotulo: 'Calor forte' },
  { valor: 'calor', rotulo: 'Calor' },
  { valor: 'meia_estacao', rotulo: 'Meia-estação' },
  { valor: 'frio', rotulo: 'Frio' },
  { valor: 'chuva', rotulo: 'Chuva' },
  { valor: 'qualquer', rotulo: 'Qualquer clima' },
];

export type Elasticidade = 'nenhuma' | 'pouca' | 'muita';

export const ELASTICIDADES: readonly Opcao<Elasticidade>[] = [
  { valor: 'nenhuma', rotulo: 'Nenhuma' },
  { valor: 'pouca', rotulo: 'Pouca' },
  { valor: 'muita', rotulo: 'Muita' },
];

export type Estrutura = 'leve' | 'media' | 'firme';

export const ESTRUTURAS: readonly Opcao<Estrutura>[] = [
  { valor: 'leve', rotulo: 'Leve (molinha)' },
  { valor: 'media', rotulo: 'Média' },
  { valor: 'firme', rotulo: 'Firme (estruturada)' },
];

export type VesteBem = 'sim' | 'nao' | 'talvez';

export const VESTE_BEM: readonly Opcao<VesteBem>[] = [
  { valor: 'sim', rotulo: 'Sim' },
  { valor: 'talvez', rotulo: 'Talvez' },
  { valor: 'nao', rotulo: 'Não' },
];

export type Desconforto =
  | 'pinica'
  | 'aquece'
  | 'cos_incomoda_sentada'
  | 'limita_movimento'
  | 'transparencia'
  | 'justa_em_cima'
  | 'aperta_cintura'
  | 'aperta_quadril_coxa'
  | 'marca_ou_enrola'
  | 'amassa_facil'
  | 'machuca_pe'
  | 'outro';

export const DESCONFORTOS: readonly Opcao<Desconforto>[] = [
  { valor: 'pinica', rotulo: 'Pinica' },
  { valor: 'aquece', rotulo: 'Esquenta / aquece' },
  { valor: 'cos_incomoda_sentada', rotulo: 'Cós incomoda sentada' },
  { valor: 'limita_movimento', rotulo: 'Limita o movimento' },
  { valor: 'transparencia', rotulo: 'Transparência' },
  { valor: 'justa_em_cima', rotulo: 'Justa na parte de cima' },
  { valor: 'aperta_cintura', rotulo: 'Aperta na cintura' },
  { valor: 'aperta_quadril_coxa', rotulo: 'Aperta no quadril / coxa' },
  { valor: 'marca_ou_enrola', rotulo: 'Marca ou enrola no corpo' },
  { valor: 'amassa_facil', rotulo: 'Amassa fácil' },
  { valor: 'machuca_pe', rotulo: 'Machuca o pé' },
  { valor: 'outro', rotulo: 'Outro' },
];

export type Disponibilidade = 'disponivel' | 'para_lavar' | 'emprestada' | 'conserto' | 'guardada';

export const DISPONIBILIDADES: readonly Opcao<Disponibilidade>[] = [
  { valor: 'disponivel', rotulo: 'Disponível' },
  { valor: 'para_lavar', rotulo: 'Para lavar' },
  { valor: 'emprestada', rotulo: 'Emprestada' },
  { valor: 'conserto', rotulo: 'No conserto' },
  { valor: 'guardada', rotulo: 'Guardada (fora de uso)' },
];

/** Regiões de medida (peça e corpo usam a mesma lista para permitir comparação). */
export type RegiaoMedida =
  | 'busto'
  | 'ombros'
  | 'braco'
  | 'cava'
  | 'cintura'
  | 'barriga'
  | 'quadril'
  | 'coxa'
  | 'panturrilha'
  | 'comprimento'
  | 'comprimento_manga'
  | 'entrepernas'
  | 'gancho'
  | 'barra'
  | 'pescoco'
  | 'altura'
  | 'pe';

export const REGIOES_MEDIDA: readonly Opcao<RegiaoMedida>[] = [
  { valor: 'busto', rotulo: 'Busto' },
  { valor: 'ombros', rotulo: 'Ombros' },
  { valor: 'braco', rotulo: 'Braço' },
  { valor: 'cava', rotulo: 'Cava' },
  { valor: 'cintura', rotulo: 'Cintura' },
  { valor: 'barriga', rotulo: 'Barriga' },
  { valor: 'quadril', rotulo: 'Quadril' },
  { valor: 'coxa', rotulo: 'Coxa' },
  { valor: 'panturrilha', rotulo: 'Panturrilha' },
  { valor: 'comprimento', rotulo: 'Comprimento' },
  { valor: 'comprimento_manga', rotulo: 'Comprimento da manga' },
  { valor: 'entrepernas', rotulo: 'Entrepernas' },
  { valor: 'gancho', rotulo: 'Gancho' },
  { valor: 'barra', rotulo: 'Barra' },
  { valor: 'pescoco', rotulo: 'Pescoço' },
  { valor: 'altura', rotulo: 'Altura' },
  { valor: 'pe', rotulo: 'Pé' },
];

/** Regiões da "parte de cima" (D25: pouca folga aqui reduz o nível de caimento). */
export const REGIOES_PARTE_DE_CIMA: readonly RegiaoMedida[] = ['busto', 'ombros', 'braco', 'cava'];

/**
 * Tipo de medida da peça:
 * - circunferencia: volta completa (ex.: busto medido em volta);
 * - largura_aberta: peça deitada, de lado a lado (normalmente ×2 para comparar com o corpo);
 * - linear: comprimento simples (comprimento, manga, entrepernas).
 */
export type TipoMedida = 'circunferencia' | 'largura_aberta' | 'linear';

export const TIPOS_MEDIDA: readonly Opcao<TipoMedida>[] = [
  { valor: 'circunferencia', rotulo: 'Circunferência (volta inteira)' },
  { valor: 'largura_aberta', rotulo: 'Largura aberta (peça deitada)' },
  { valor: 'linear', rotulo: 'Comprimento' },
];

// ---------------------------------------------------------------------------
// Peça
// ---------------------------------------------------------------------------

export interface MedidaPeca {
  id: ID;
  regiao: RegiaoMedida;
  /** Valor numérico na unidade indicada. */
  valor: number;
  unidade: UnidadeMedida;
  tipo: TipoMedida;
  origem: OrigemDado;
  observacao?: string;
  data: DataISO;
}

export interface Peca {
  /** Obrigatório. */
  id: ID;
  /** Obrigatório. */
  nome: string;
  /** Obrigatório. */
  categoria: Categoria;
  /** IDs das mídias (fotos) da peça, na ordem de exibição. A primeira é a capa. */
  midiaIds: ID[];

  cor?: string;
  estampa?: string;
  tecido?: string;
  composicao?: string;
  elasticidade?: Elasticidade;
  estrutura?: Estrutura;

  tamanhoEtiqueta?: string;
  marca?: string;
  medidas: MedidaPeca[];

  ocasioes: Ocasiao[];
  estacoes: Estacao[];

  vesteBem?: VesteBem;
  desconfortos: Desconforto[];
  observacoesConforto?: string;

  /** Ex.: "armário do quarto, gaveta 2, cabide". */
  localizacao?: string;
  /** Obrigatório (padrão "disponivel"). */
  disponibilidade: Disponibilidade;

  observacoes?: string;
  favorita?: boolean;
  /** Data de cadastro. */
  criadaEm: DataISO;
  atualizadaEm: DataISO;
}

/** Dados para criar uma peça: id, datas e mídias são preenchidos pelo repositório. */
export type NovaPeca = Omit<Peca, 'id' | 'criadaEm' | 'atualizadaEm' | 'midiaIds' | 'medidas' | 'ocasioes' | 'estacoes' | 'desconfortos' | 'disponibilidade'> &
  Partial<Pick<Peca, 'medidas' | 'ocasioes' | 'estacoes' | 'desconfortos' | 'disponibilidade'>>;

// ---------------------------------------------------------------------------
// Mídia (fotos). Fotos do corpo ficam em tabela separada (privacidade).
// ---------------------------------------------------------------------------

export type TipoMidiaPeca = 'frente' | 'costas' | 'detalhe' | 'etiqueta' | 'vestida' | 'outra';
export type TipoMidiaCorpo = 'corpo_frente' | 'corpo_costas' | 'corpo_perfil' | 'corpo_outra';
export type TipoMidia = TipoMidiaPeca | TipoMidiaCorpo;

export const TIPOS_MIDIA_PECA: readonly Opcao<TipoMidiaPeca>[] = [
  { valor: 'frente', rotulo: 'Frente' },
  { valor: 'costas', rotulo: 'Costas' },
  { valor: 'detalhe', rotulo: 'Detalhe' },
  { valor: 'etiqueta', rotulo: 'Etiqueta' },
  { valor: 'vestida', rotulo: 'Vestida (sem corpo inteiro)' },
  { valor: 'outra', rotulo: 'Outra' },
];

export const TIPOS_MIDIA_CORPO: readonly Opcao<TipoMidiaCorpo>[] = [
  { valor: 'corpo_frente', rotulo: 'Corpo — frente' },
  { valor: 'corpo_costas', rotulo: 'Corpo — costas' },
  { valor: 'corpo_perfil', rotulo: 'Corpo — perfil' },
  { valor: 'corpo_outra', rotulo: 'Corpo — outra' },
];

export const TIPOS_MIDIA: readonly Opcao<TipoMidia>[] = [...TIPOS_MIDIA_PECA, ...TIPOS_MIDIA_CORPO];

/** A quem a mídia pertence. */
export type TipoDonoMidia = 'peca' | 'look' | 'compra';

interface MidiaBase {
  id: ID;
  /** Arquivo original, intacto. */
  original: Blob;
  /** Miniatura JPEG (~400 px no lado maior) para listas. */
  miniatura: Blob;
  mime: string;
  nomeArquivo?: string;
  largura?: number;
  altura?: number;
  tamanhoBytes: number;
  criadaEm: DataISO;
}

/** Foto de peça, de look (prancha/provador) ou de compra candidata. Tabela `midias`. */
export interface Midia extends MidiaBase {
  donoTipo: TipoDonoMidia;
  /** ID da peça/look/compra dona da mídia. */
  donoId: ID;
  tipo: TipoMidiaPeca;
}

/** Foto do corpo da usuária. Tabela separada `midiasCorpo`, nunca misturada às de peças. */
export interface MidiaCorpo extends MidiaBase {
  /** Sempre o perfil único. */
  perfilId: ID;
  tipo: TipoMidiaCorpo;
  observacao?: string;
}

// ---------------------------------------------------------------------------
// Look
// ---------------------------------------------------------------------------

export type FeedbackLook = 'gostei' | 'desconfortavel' | 'repetir' | 'nao_repetir' | 'neutro';

export const FEEDBACKS_LOOK: readonly Opcao<FeedbackLook>[] = [
  { valor: 'gostei', rotulo: 'Gostei' },
  { valor: 'repetir', rotulo: 'Repetir' },
  { valor: 'neutro', rotulo: 'Indiferente' },
  { valor: 'desconfortavel', rotulo: 'Desconfortável' },
  { valor: 'nao_repetir', rotulo: 'Não repetir' },
];

/** Posição de uma peça na prancha do look (coordenadas relativas 0–1). */
export interface PosicaoPrancha {
  pecaId: ID;
  x: number;
  y: number;
  escala: number;
  rotacao: number;
  camada: number;
}

export interface RegistroUsoLook {
  id: ID;
  dia: DiaISO;
  feedbacks: FeedbackLook[];
  desconfortos: Desconforto[];
  observacao?: string;
  criadoEm: DataISO;
}

/** Resultado do provador (etapa D). Preparado; sem uso no MVP. */
export type SituacaoProvador = 'aprovado' | 'rejeitado' | 'pendente';

export const SITUACOES_PROVADOR: readonly Opcao<SituacaoProvador>[] = [
  { valor: 'pendente', rotulo: 'Pendente' },
  { valor: 'aprovado', rotulo: 'Aprovado' },
  { valor: 'rejeitado', rotulo: 'Rejeitado' },
];

export interface ResultadoProvador {
  id: ID;
  /** Mídia gerada (tabela `midias`, donoTipo "look"). */
  midiaId: ID;
  fornecedor?: string;
  configuracao?: string;
  situacao: SituacaoProvador;
  motivoRejeicao?: string;
  custoCreditos?: number;
  criadoEm: DataISO;
}

export interface Look {
  /** Obrigatório. */
  id: ID;
  /** Obrigatório: apenas IDs de peças existentes. */
  pecaIds: ID[];
  nome?: string;
  ocasiao?: Ocasiao;
  observacoes?: string;
  prancha?: PosicaoPrancha[];
  resultadosProvador: ResultadoProvador[];
  usos: RegistroUsoLook[];
  favorito?: boolean;
  criadoEm: DataISO;
  atualizadoEm: DataISO;
}

export type NovoLook = Omit<Look, 'id' | 'criadoEm' | 'atualizadoEm' | 'resultadosProvador' | 'usos'> &
  Partial<Pick<Look, 'resultadosProvador' | 'usos'>>;

// ---------------------------------------------------------------------------
// Semana / Dia
// ---------------------------------------------------------------------------

export interface Compromisso {
  id: ID;
  /** ID de TipoCompromisso do perfil (ou texto livre em `descricao`). */
  tipoId?: ID;
  descricao?: string;
  /** "HH:MM", opcional. */
  horarioInicio?: string;
  horarioFim?: string;
  ocasiao?: Ocasiao;
  local?: string;
}

export interface DiaSemana {
  /** "AAAA-MM-DD". */
  data: DiaISO;
  compromissos: Compromisso[];
  /** Look escolhido para o dia. */
  lookId?: ID;
  /** Looks alternativos. */
  alternativasLookIds: ID[];
  /** Peças fixadas para o dia (independentes de look). */
  pecasFixadasIds: ID[];
  observacoes?: string;
}

export interface RegrasSemana {
  /** Permite repetir a mesma peça na semana. */
  repeticaoPermitida: boolean;
  /** Mínimo de dias entre dois usos da mesma peça (quando repete). */
  intervaloMinimoDias?: number;
  /** Peças que precisam ser lavadas entre usos. */
  pecasLavarEntreUsosIds: ID[];
  /** Ou: lavar entre usos tudo das categorias indicadas. */
  categoriasLavarEntreUsos: Categoria[];
}

export interface Semana {
  id: ID;
  /** Data da segunda-feira (ou do primeiro dia) da semana, "AAAA-MM-DD". Índice único. */
  inicio: DiaISO;
  dias: DiaSemana[];
  regras: RegrasSemana;
  observacoes?: string;
  criadaEm: DataISO;
  atualizadaEm: DataISO;
}

// ---------------------------------------------------------------------------
// Perfil (registro único)
// ---------------------------------------------------------------------------

/** ID fixo do perfil único da usuária. */
export const PERFIL_ID = 'perfil';

export type NivelFormalidade = 'muito_informal' | 'informal' | 'intermediario' | 'formal' | 'muito_formal';

export const NIVEIS_FORMALIDADE: readonly Opcao<NivelFormalidade>[] = [
  { valor: 'muito_informal', rotulo: 'Muito informal' },
  { valor: 'informal', rotulo: 'Informal' },
  { valor: 'intermediario', rotulo: 'Intermediário' },
  { valor: 'formal', rotulo: 'Formal' },
  { valor: 'muito_formal', rotulo: 'Muito formal' },
];

export interface TipoCompromisso {
  id: ID;
  nome: string;
  ocasiao?: Ocasiao;
  formalidade?: NivelFormalidade;
  observacoes?: string;
}

export type SensacaoCalor = 'sente_muito_calor' | 'sente_calor' | 'neutra' | 'sente_frio';

export const SENSACOES_CALOR: readonly Opcao<SensacaoCalor>[] = [
  { valor: 'sente_muito_calor', rotulo: 'Sente muito calor' },
  { valor: 'sente_calor', rotulo: 'Sente calor' },
  { valor: 'neutra', rotulo: 'Neutra' },
  { valor: 'sente_frio', rotulo: 'Sente frio' },
];

/** Regiões do corpo para preferência de folga. */
export type RegiaoFolga =
  | 'parte_de_cima'
  | 'busto'
  | 'ombros'
  | 'bracos_cava'
  | 'cintura'
  | 'barriga'
  | 'quadril'
  | 'coxas'
  | 'pernas';

export const REGIOES_FOLGA: readonly Opcao<RegiaoFolga>[] = [
  { valor: 'parte_de_cima', rotulo: 'Parte de cima (geral)' },
  { valor: 'busto', rotulo: 'Busto' },
  { valor: 'ombros', rotulo: 'Ombros' },
  { valor: 'bracos_cava', rotulo: 'Braços / cava' },
  { valor: 'cintura', rotulo: 'Cintura' },
  { valor: 'barriga', rotulo: 'Barriga' },
  { valor: 'quadril', rotulo: 'Quadril' },
  { valor: 'coxas', rotulo: 'Coxas' },
  { valor: 'pernas', rotulo: 'Pernas' },
];

export type PreferenciaFolga = 'justa' | 'ajustada' | 'confortavel' | 'solta' | 'bem_solta';

export const PREFERENCIAS_FOLGA: readonly Opcao<PreferenciaFolga>[] = [
  { valor: 'justa', rotulo: 'Justa' },
  { valor: 'ajustada', rotulo: 'Ajustada' },
  { valor: 'confortavel', rotulo: 'Confortável' },
  { valor: 'solta', rotulo: 'Solta' },
  { valor: 'bem_solta', rotulo: 'Bem solta' },
];

export interface PreferenciaFolgaRegiao {
  regiao: RegiaoFolga;
  preferencia: PreferenciaFolga;
  /** Folga mínima desejada em cm (corpo × peça), opcional. */
  folgaMinimaCm?: number;
  /** Se verdadeiro, roupa justa nessa região é um desconforto (reduz o nível — D25). */
  evitarJusta: boolean;
  observacao?: string;
  origem: OrigemDado;
  data: DataISO;
}

/**
 * Preferência registrada (D25): não gosta de roupa muito justa na parte de cima.
 * Usada como valor inicial do perfil.
 */
export const PREFERENCIA_NAO_JUSTA_EM_CIMA: Readonly<Omit<PreferenciaFolgaRegiao, 'data'>> = {
  regiao: 'parte_de_cima',
  preferencia: 'confortavel',
  evitarJusta: true,
  observacao: 'Não gosta de roupa muito justa na parte de cima (busto, ombros, braços/cava).',
  origem: 'informado',
};

/** Uma leitura de medida corporal (cada nova medida vira um registro no histórico). */
export interface RegistroMedidaCorporal {
  id: ID;
  valor: number;
  unidade: UnidadeMedida;
  origem: OrigemDado;
  data: DataISO;
  observacao?: string;
}

/**
 * Medida corporal de uma região com histórico.
 * Tabela `medidasCorporais` (uma linha por região).
 * Regra (D06): valor conferido nunca é sobrescrito silenciosamente — `atualId` só
 * troca para um registro não conferido se a usuária confirmar; divergência entre
 * estimado e conferido marca `conflito`.
 */
export interface MedidaCorporal {
  /** Igual à região (uma linha por região). */
  regiao: RegiaoMedida;
  historico: RegistroMedidaCorporal[];
  /** ID do registro vigente no histórico. */
  atualId?: ID;
  /** Há leitura recente divergente do valor conferido, aguardando decisão. */
  conflito?: ConflitoMedida;
  atualizadaEm: DataISO;
}

export interface ConflitoMedida {
  /** Registro conferido vigente. */
  conferidoId: ID;
  /** Novo registro divergente (estimado ou informado). */
  divergenteId: ID;
  diferenca: number;
  detectadoEm: DataISO;
}

export interface Perfil {
  id: typeof PERFIL_ID;
  nome?: string;
  /** Tamanhos usuais por grupo, ex.: { parte_de_cima: "GG", parte_de_baixo: "48" }. */
  tamanhosUsuais: Partial<Record<GrupoCategoria, string>>;

  estilosPreferidos: string[];
  coresPreferidas: string[];
  coresEvitadas: string[];
  /** O que não usa (texto livre, ex.: "salto alto", "gola alta"). */
  naoUsa: string[];
  sensacaoCalor?: SensacaoCalor;

  tiposCompromisso: TipoCompromisso[];
  preferenciasFolga: PreferenciaFolgaRegiao[];
  /** Desconfortos a evitar nas sugestões (inclui "justa_em_cima" por padrão — D25). */
  desconfortosEvitar: Desconforto[];

  /** Paleta pessoal (quando informada), separada das cores das peças. */
  paletaPessoal?: PaletaPessoal;

  observacoes?: string;
  criadoEm: DataISO;
  atualizadoEm: DataISO;
}

export interface PaletaPessoal {
  /** Cores em hexadecimal "#rrggbb" ou nomes. */
  cores: string[];
  descricao?: string;
  origem: OrigemDado;
  data: DataISO;
}

// ---------------------------------------------------------------------------
// Estimativa de caimento (D24) — tipos de entrada/saída; função em src/lib (etapa B15)
// ---------------------------------------------------------------------------

export type SituacaoFolga = 'apertada' | 'justa' | 'confortavel' | 'folgada' | 'sem_dado';

export const SITUACOES_FOLGA: readonly Opcao<SituacaoFolga>[] = [
  { valor: 'apertada', rotulo: 'Apertada' },
  { valor: 'justa', rotulo: 'Justa' },
  { valor: 'confortavel', rotulo: 'Confortável' },
  { valor: 'folgada', rotulo: 'Folgada' },
  { valor: 'sem_dado', rotulo: 'Sem dado' },
];

export type NivelCaimento = 'alto' | 'medio' | 'baixo' | 'indeterminado';

export const NIVEIS_CAIMENTO: readonly Opcao<NivelCaimento>[] = [
  { valor: 'alto', rotulo: 'Alto' },
  { valor: 'medio', rotulo: 'Médio' },
  { valor: 'baixo', rotulo: 'Baixo' },
  { valor: 'indeterminado', rotulo: 'Indeterminado' },
];

export interface ResultadoMedidaCaimento {
  regiao: RegiaoMedida;
  medidaCorpoCm?: number;
  medidaPecaCm?: number;
  folgaCm?: number;
  situacao: SituacaoFolga;
  explicacao: string;
}

export interface ResultadoCaimento {
  nivel: NivelCaimento;
  porMedida: ResultadoMedidaCaimento[];
  explicacao: string;
  /** Medidas essenciais da categoria que faltaram. */
  faltando: RegiaoMedida[];
  calculadoEm: DataISO;
}

// ---------------------------------------------------------------------------
// Compra candidata (etapa E; nunca conta como peça do closet)
// ---------------------------------------------------------------------------

export interface LinhaTabelaTamanhos {
  tamanho: string;
  medidas: Array<{ regiao: RegiaoMedida; valor: number; unidade: UnidadeMedida; tipo: TipoMedida }>;
}

export type SituacaoCompra = 'pesquisando' | 'descartada' | 'comprada';

export const SITUACOES_COMPRA: readonly Opcao<SituacaoCompra>[] = [
  { valor: 'pesquisando', rotulo: 'Pesquisando' },
  { valor: 'descartada', rotulo: 'Descartada' },
  { valor: 'comprada', rotulo: 'Comprada' },
];

export interface CompraCandidata {
  id: ID;
  link: string;
  loja?: string;
  nome?: string;
  categoria?: Categoria;
  preco?: number;
  moeda?: 'BRL';
  /** Data em que o preço foi visto. */
  dataPreco?: DataISO;
  tamanho?: string;
  variante?: string;
  elasticidade?: Elasticidade;
  tabelaTamanhos?: LinhaTabelaTamanhos[];
  medidas?: MedidaPeca[];
  estimativaCaimento?: ResultadoCaimento;
  /** Mídias na tabela `midias` com donoTipo "compra". */
  midiaIds: ID[];
  situacao: SituacaoCompra;
  observacoes?: string;
  criadaEm: DataISO;
  atualizadaEm: DataISO;
}

// ---------------------------------------------------------------------------
// Metadados (chave-valor): último backup etc.
// ---------------------------------------------------------------------------

export type ChaveMeta = 'ultimoBackup' | 'ultimaRestauracao' | 'persistenciaSolicitada' | string;

export interface Meta {
  chave: ChaveMeta;
  valor: unknown;
  atualizadoEm: DataISO;
}

/** Nomes das tabelas do banco (usados também pelo backup). */
export const TABELAS = [
  'pecas',
  'midias',
  'midiasCorpo',
  'looks',
  'semanas',
  'perfil',
  'medidasCorporais',
  'compras',
  'meta',
] as const;
export type NomeTabela = (typeof TABELAS)[number];
