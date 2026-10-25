/**
 * Funções de acesso aos dados (CRUD tipado). As telas devem usar estas funções
 * (e os hooks de ./hooks) em vez de acessar `db` diretamente.
 */
import { db } from './db';
import { gerarMiniatura } from '../lib/images';
import {
  agoraISO,
  novoId,
  PERFIL_ID,
  PREFERENCIA_NAO_JUSTA_EM_CIMA,
  type Categoria,
  type CompraCandidata,
  type ConflitoMedida,
  type DiaISO,
  type DiaSemana,
  type Disponibilidade,
  type ID,
  type Look,
  type MedidaCorporal,
  type Meta,
  type ChaveMeta,
  type Midia,
  type MidiaCorpo,
  type NovaPeca,
  type NovoLook,
  type Ocasiao,
  type OrigemDado,
  type Peca,
  type Perfil,
  type RegiaoMedida,
  type RegistroMedidaCorporal,
  type RegistroUsoLook,
  type Semana,
  type TipoDonoMidia,
  type TipoMidiaCorpo,
  type TipoMidiaPeca,
} from './schema';

// ---------------------------------------------------------------------------
// Mídias
// ---------------------------------------------------------------------------

export interface FotoEntrada {
  arquivo: Blob;
  tipo?: TipoMidiaPeca;
}

/** Prepara a mídia (gera miniatura) fora de transação. */
async function prepararMidia(
  foto: FotoEntrada,
  donoTipo: TipoDonoMidia,
  donoId: ID,
): Promise<Midia> {
  const { miniatura, largura, altura } = await gerarMiniatura(foto.arquivo);
  return {
    id: novoId(),
    donoTipo,
    donoId,
    tipo: foto.tipo ?? 'frente',
    original: foto.arquivo,
    miniatura,
    mime: foto.arquivo.type || 'application/octet-stream',
    nomeArquivo: foto.arquivo instanceof File ? foto.arquivo.name : undefined,
    largura,
    altura,
    tamanhoBytes: foto.arquivo.size,
    criadaEm: agoraISO(),
  };
}

export function obterMidia(id: ID): Promise<Midia | undefined> {
  return db.midias.get(id);
}

export function listarMidiasDoDono(donoTipo: TipoDonoMidia, donoId: ID): Promise<Midia[]> {
  return db.midias.where('[donoTipo+donoId]').equals([donoTipo, donoId]).toArray();
}

/** Adiciona fotos a um look ou compra candidata (para peças use adicionarFotosPeca). */
export async function adicionarMidias(
  donoTipo: Exclude<TipoDonoMidia, 'peca'>,
  donoId: ID,
  fotos: FotoEntrada[],
): Promise<Midia[]> {
  const midias = await Promise.all(fotos.map((f) => prepararMidia(f, donoTipo, donoId)));
  await db.transaction('rw', db.midias, db.compras, async () => {
    await db.midias.bulkAdd(midias);
    if (donoTipo === 'compra') {
      const c = await db.compras.get(donoId);
      if (c) await db.compras.update(donoId, { midiaIds: [...c.midiaIds, ...midias.map((m) => m.id)], atualizadaEm: agoraISO() });
    }
  });
  return midias;
}

/** Apaga uma mídia (original + miniatura) e a remove da peça/compra dona. */
export async function apagarMidia(id: ID): Promise<void> {
  await db.transaction('rw', db.midias, db.pecas, db.compras, async () => {
    const m = await db.midias.get(id);
    if (!m) return;
    await db.midias.delete(id);
    if (m.donoTipo === 'peca') {
      const p = await db.pecas.get(m.donoId);
      if (p) await db.pecas.update(p.id, { midiaIds: p.midiaIds.filter((x) => x !== id), atualizadaEm: agoraISO() });
    } else if (m.donoTipo === 'compra') {
      const c = await db.compras.get(m.donoId);
      if (c) await db.compras.update(c.id, { midiaIds: c.midiaIds.filter((x) => x !== id), atualizadaEm: agoraISO() });
    }
  });
}

export async function alterarTipoMidia(id: ID, tipo: TipoMidiaPeca): Promise<void> {
  await db.midias.update(id, { tipo });
}

// ---------------------------------------------------------------------------
// Peças
// ---------------------------------------------------------------------------

export interface FiltroPecas {
  categoria?: Categoria | Categoria[];
  disponibilidade?: Disponibilidade | Disponibilidade[];
  ocasiao?: Ocasiao;
  /** Busca por texto em nome, cor, estampa, tecido, marca, localização e observações. */
  busca?: string;
  somenteFavoritas?: boolean;
}

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function comoLista<T>(v: T | T[] | undefined): T[] | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v : [v];
}

/** Aplica o filtro em memória (útil também para listas já carregadas). */
export function filtrarPecas(pecas: Peca[], filtro: FiltroPecas = {}): Peca[] {
  const cats = comoLista(filtro.categoria);
  const disps = comoLista(filtro.disponibilidade);
  const termo = filtro.busca ? normalizar(filtro.busca) : '';
  return pecas.filter((p) => {
    if (cats && cats.length && !cats.includes(p.categoria)) return false;
    if (disps && disps.length && !disps.includes(p.disponibilidade)) return false;
    if (filtro.ocasiao && !p.ocasioes.includes(filtro.ocasiao)) return false;
    if (filtro.somenteFavoritas && !p.favorita) return false;
    if (termo) {
      const texto = normalizar(
        [p.nome, p.cor, p.estampa, p.tecido, p.composicao, p.marca, p.localizacao, p.observacoes, p.tamanhoEtiqueta]
          .filter(Boolean)
          .join(' '),
      );
      if (!termo.split(/\s+/).every((t) => texto.includes(t))) return false;
    }
    return true;
  });
}

/** Lista peças (mais recentes primeiro), com filtro opcional. */
export async function listarPecas(filtro: FiltroPecas = {}): Promise<Peca[]> {
  const cats = comoLista(filtro.categoria);
  const base =
    cats && cats.length ? await db.pecas.where('categoria').anyOf(cats).toArray() : await db.pecas.toArray();
  return filtrarPecas(base, filtro).sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));
}

export function obterPeca(id: ID): Promise<Peca | undefined> {
  return db.pecas.get(id);
}

/** Cria uma peça e salva as fotos (original + miniatura). Retorna a peça salva. */
export async function criarPeca(dados: NovaPeca, fotos: FotoEntrada[] = []): Promise<Peca> {
  if (!dados.nome?.trim()) throw new Error('Informe o nome da peça.');
  const id = novoId();
  const agora = agoraISO();
  const midias = await Promise.all(fotos.map((f) => prepararMidia(f, 'peca', id)));
  const peca: Peca = {
    ...dados,
    id,
    nome: dados.nome.trim(),
    midiaIds: midias.map((m) => m.id),
    medidas: dados.medidas ?? [],
    ocasioes: dados.ocasioes ?? [],
    estacoes: dados.estacoes ?? [],
    desconfortos: dados.desconfortos ?? [],
    disponibilidade: dados.disponibilidade ?? 'disponivel',
    criadaEm: agora,
    atualizadaEm: agora,
  };
  await db.transaction('rw', db.pecas, db.midias, async () => {
    await db.midias.bulkAdd(midias);
    await db.pecas.add(peca);
  });
  return peca;
}

/** Atualiza campos da peça (não altera id, criadaEm nem midiaIds — use as funções de fotos). */
export async function atualizarPeca(
  id: ID,
  alteracoes: Partial<Omit<Peca, 'id' | 'criadaEm' | 'midiaIds'>>,
): Promise<void> {
  const n = await db.pecas.update(id, { ...alteracoes, atualizadaEm: agoraISO() });
  if (!n) throw new Error('Peça não encontrada.');
}

/** Acrescenta fotos a uma peça existente. */
export async function adicionarFotosPeca(pecaId: ID, fotos: FotoEntrada[]): Promise<Midia[]> {
  const midias = await Promise.all(fotos.map((f) => prepararMidia(f, 'peca', pecaId)));
  await db.transaction('rw', db.pecas, db.midias, async () => {
    const p = await db.pecas.get(pecaId);
    if (!p) throw new Error('Peça não encontrada.');
    await db.midias.bulkAdd(midias);
    await db.pecas.update(pecaId, { midiaIds: [...p.midiaIds, ...midias.map((m) => m.id)], atualizadaEm: agoraISO() });
  });
  return midias;
}

/** Define a ordem das fotos da peça (a primeira é a capa). */
export async function reordenarFotosPeca(pecaId: ID, midiaIds: ID[]): Promise<void> {
  await db.transaction('rw', db.pecas, async () => {
    const p = await db.pecas.get(pecaId);
    if (!p) throw new Error('Peça não encontrada.');
    const validos = midiaIds.filter((m) => p.midiaIds.includes(m));
    const resto = p.midiaIds.filter((m) => !validos.includes(m));
    await db.pecas.update(pecaId, { midiaIds: [...validos, ...resto], atualizadaEm: agoraISO() });
  });
}

/**
 * Apaga a peça, todas as suas mídias (originais e miniaturas) e as referências
 * a ela em looks (pecaIds/prancha) e semanas (peças fixadas, regras de lavagem).
 */
export async function apagarPeca(id: ID): Promise<void> {
  await db.transaction('rw', [db.pecas, db.midias, db.looks, db.semanas], async () => {
    await db.midias.where('[donoTipo+donoId]').equals(['peca', id]).delete();
    await db.pecas.delete(id);
    const looks = await db.looks.where('pecaIds').equals(id).toArray();
    for (const l of looks) {
      await db.looks.update(l.id, {
        pecaIds: l.pecaIds.filter((p) => p !== id),
        prancha: l.prancha?.filter((p) => p.pecaId !== id),
        atualizadoEm: agoraISO(),
      });
    }
    const semanas = await db.semanas.toArray();
    for (const s of semanas) {
      const usa =
        s.regras.pecasLavarEntreUsosIds.includes(id) || s.dias.some((d) => d.pecasFixadasIds.includes(id));
      if (!usa) continue;
      await db.semanas.update(s.id, {
        dias: s.dias.map((d) => ({ ...d, pecasFixadasIds: d.pecasFixadasIds.filter((p) => p !== id) })),
        regras: { ...s.regras, pecasLavarEntreUsosIds: s.regras.pecasLavarEntreUsosIds.filter((p) => p !== id) },
        atualizadaEm: agoraISO(),
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Looks
// ---------------------------------------------------------------------------

async function validarPecas(pecaIds: ID[]): Promise<void> {
  if (!pecaIds.length) throw new Error('O look precisa de pelo menos uma peça.');
  const existentes = await db.pecas.bulkGet(pecaIds);
  const faltando = pecaIds.filter((_, i) => !existentes[i]);
  if (faltando.length) throw new Error('O look contém peças que não existem no closet.');
}

export async function criarLook(dados: NovoLook): Promise<Look> {
  await validarPecas(dados.pecaIds);
  const agora = agoraISO();
  const look: Look = {
    ...dados,
    id: novoId(),
    pecaIds: [...new Set(dados.pecaIds)],
    resultadosProvador: dados.resultadosProvador ?? [],
    usos: dados.usos ?? [],
    criadoEm: agora,
    atualizadoEm: agora,
  };
  await db.looks.add(look);
  return look;
}

export async function atualizarLook(id: ID, alteracoes: Partial<Omit<Look, 'id' | 'criadoEm'>>): Promise<void> {
  if (alteracoes.pecaIds) {
    await validarPecas(alteracoes.pecaIds);
    alteracoes = { ...alteracoes, pecaIds: [...new Set(alteracoes.pecaIds)] };
  }
  const n = await db.looks.update(id, { ...alteracoes, atualizadoEm: agoraISO() });
  if (!n) throw new Error('Look não encontrado.');
}

export function obterLook(id: ID): Promise<Look | undefined> {
  return db.looks.get(id);
}

export async function listarLooks(filtro: { ocasiao?: Ocasiao; pecaId?: ID } = {}): Promise<Look[]> {
  let looks: Look[];
  if (filtro.pecaId) looks = await db.looks.where('pecaIds').equals(filtro.pecaId).toArray();
  else looks = await db.looks.toArray();
  if (filtro.ocasiao) looks = looks.filter((l) => l.ocasiao === filtro.ocasiao);
  return looks.sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
}

/** Registra uso do look (feedback após usar). */
export async function registrarUsoLook(
  lookId: ID,
  uso: Omit<RegistroUsoLook, 'id' | 'criadoEm'>,
): Promise<RegistroUsoLook> {
  const registro: RegistroUsoLook = { ...uso, id: novoId(), criadoEm: agoraISO() };
  await db.transaction('rw', db.looks, async () => {
    const l = await db.looks.get(lookId);
    if (!l) throw new Error('Look não encontrado.');
    await db.looks.update(lookId, { usos: [...l.usos, registro], atualizadoEm: agoraISO() });
  });
  return registro;
}

/** Apaga o look, suas mídias (prancha/provador) e as referências nas semanas. */
export async function apagarLook(id: ID): Promise<void> {
  await db.transaction('rw', db.looks, db.midias, db.semanas, async () => {
    await db.midias.where('[donoTipo+donoId]').equals(['look', id]).delete();
    await db.looks.delete(id);
    const semanas = await db.semanas.toArray();
    for (const s of semanas) {
      if (!s.dias.some((d) => d.lookId === id || d.alternativasLookIds.includes(id))) continue;
      await db.semanas.update(s.id, {
        dias: s.dias.map((d) => ({
          ...d,
          lookId: d.lookId === id ? undefined : d.lookId,
          alternativasLookIds: d.alternativasLookIds.filter((x) => x !== id),
        })),
        atualizadaEm: agoraISO(),
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Semanas
// ---------------------------------------------------------------------------

/** Converte Date para "AAAA-MM-DD" no fuso local. */
export function paraDiaISO(d: Date): DiaISO {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Converte "AAAA-MM-DD" em Date (meia-noite local). */
export function deDiaISO(dia: DiaISO): Date {
  const [a, m, d] = dia.split('-').map(Number);
  return new Date(a, m - 1, d);
}

/** Segunda-feira da semana da data indicada. */
export function inicioDaSemana(data: Date = new Date()): DiaISO {
  const d = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  const dow = (d.getDay() + 6) % 7; // segunda = 0
  d.setDate(d.getDate() - dow);
  return paraDiaISO(d);
}

function diasDaSemana(inicio: DiaISO): DiaSemana[] {
  const base = deDiaISO(inicio);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return { data: paraDiaISO(d), compromissos: [], alternativasLookIds: [], pecasFixadasIds: [] };
  });
}

export function obterSemanaPorInicio(inicio: DiaISO): Promise<Semana | undefined> {
  return db.semanas.where('inicio').equals(inicio).first();
}

/** Busca a semana pelo dia inicial; cria vazia (7 dias) se não existir. */
export async function obterOuCriarSemana(inicio: DiaISO): Promise<Semana> {
  return db.transaction('rw', db.semanas, async () => {
    const existente = await db.semanas.where('inicio').equals(inicio).first();
    if (existente) return existente;
    const agora = agoraISO();
    const semana: Semana = {
      id: novoId(),
      inicio,
      dias: diasDaSemana(inicio),
      regras: { repeticaoPermitida: true, pecasLavarEntreUsosIds: [], categoriasLavarEntreUsos: [] },
      criadaEm: agora,
      atualizadaEm: agora,
    };
    await db.semanas.add(semana);
    return semana;
  });
}

export async function atualizarSemana(id: ID, alteracoes: Partial<Omit<Semana, 'id' | 'criadaEm' | 'inicio'>>): Promise<void> {
  const n = await db.semanas.update(id, { ...alteracoes, atualizadaEm: agoraISO() });
  if (!n) throw new Error('Semana não encontrada.');
}

/** Substitui um dia da semana (identificado por `dia.data`). */
export async function atualizarDia(semanaId: ID, dia: DiaSemana): Promise<void> {
  await db.transaction('rw', db.semanas, async () => {
    const s = await db.semanas.get(semanaId);
    if (!s) throw new Error('Semana não encontrada.');
    const existe = s.dias.some((d) => d.data === dia.data);
    const dias = existe ? s.dias.map((d) => (d.data === dia.data ? dia : d)) : [...s.dias, dia].sort((a, b) => a.data.localeCompare(b.data));
    await db.semanas.update(semanaId, { dias, atualizadaEm: agoraISO() });
  });
}

export async function listarSemanas(): Promise<Semana[]> {
  return db.semanas.orderBy('inicio').reverse().toArray();
}

export async function apagarSemana(id: ID): Promise<void> {
  await db.semanas.delete(id);
}

// ---------------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------------

/** Perfil inicial (não gravado), já com a preferência D25 "não justa em cima". */
export function perfilPadrao(): Perfil {
  const agora = agoraISO();
  return {
    id: PERFIL_ID,
    tamanhosUsuais: {},
    estilosPreferidos: [],
    coresPreferidas: [],
    coresEvitadas: [],
    naoUsa: [],
    tiposCompromisso: [],
    preferenciasFolga: [{ ...PREFERENCIA_NAO_JUSTA_EM_CIMA, data: agora }],
    desconfortosEvitar: ['justa_em_cima'],
    criadoEm: agora,
    atualizadoEm: agora,
  };
}

/** Lê o perfil; se não existir, devolve o padrão (sem gravar). */
export async function obterPerfil(): Promise<Perfil> {
  return (await db.perfil.get(PERFIL_ID)) ?? perfilPadrao();
}

/** Atualiza (ou cria) o perfil. */
export async function salvarPerfil(alteracoes: Partial<Omit<Perfil, 'id' | 'criadoEm'>>): Promise<Perfil> {
  return db.transaction('rw', db.perfil, async () => {
    const atual = (await db.perfil.get(PERFIL_ID)) ?? perfilPadrao();
    const novo: Perfil = { ...atual, ...alteracoes, id: PERFIL_ID, atualizadoEm: agoraISO() };
    await db.perfil.put(novo);
    return novo;
  });
}

// ---------------------------------------------------------------------------
// Fotos do corpo (tabela separada)
// ---------------------------------------------------------------------------

export async function adicionarFotoCorpo(
  arquivo: Blob,
  tipo: TipoMidiaCorpo = 'corpo_frente',
  observacao?: string,
): Promise<MidiaCorpo> {
  const { miniatura, largura, altura } = await gerarMiniatura(arquivo);
  const midia: MidiaCorpo = {
    id: novoId(),
    perfilId: PERFIL_ID,
    tipo,
    observacao,
    original: arquivo,
    miniatura,
    mime: arquivo.type || 'application/octet-stream',
    nomeArquivo: arquivo instanceof File ? arquivo.name : undefined,
    largura,
    altura,
    tamanhoBytes: arquivo.size,
    criadaEm: agoraISO(),
  };
  await db.midiasCorpo.add(midia);
  return midia;
}

export function listarFotosCorpo(): Promise<MidiaCorpo[]> {
  return db.midiasCorpo.orderBy('criadaEm').toArray();
}

export function obterFotoCorpo(id: ID): Promise<MidiaCorpo | undefined> {
  return db.midiasCorpo.get(id);
}

export async function apagarFotoCorpo(id: ID): Promise<void> {
  await db.midiasCorpo.delete(id);
}

// ---------------------------------------------------------------------------
// Medidas corporais com histórico (D06)
// ---------------------------------------------------------------------------

/** Diferença (cm) a partir da qual um valor diverge do conferido. */
export const TOLERANCIA_CONFLITO_CM = 1;

const PESO_ORIGEM: Record<OrigemDado, number> = { estimado: 0, informado: 1, conferido: 2 };

/** Registro vigente de uma medida corporal. */
export function registroAtual(m: MedidaCorporal | undefined): RegistroMedidaCorporal | undefined {
  if (!m) return undefined;
  return m.historico.find((r) => r.id === m.atualId);
}

export interface ResultadoRegistroMedida {
  medida: MedidaCorporal;
  registro: RegistroMedidaCorporal;
  /** O novo registro passou a ser o valor vigente? */
  virouAtual: boolean;
  /** Conflito criado com um valor conferido (aguarda decisão da usuária). */
  conflito?: ConflitoMedida;
}

/**
 * Registra uma nova leitura de medida corporal. Nunca apaga o histórico.
 * Regras:
 * - "conferido" sempre vira o valor vigente (e encerra conflito pendente);
 * - sobre um vigente "conferido", um valor "informado"/"estimado" NÃO o substitui:
 *   fica no histórico e, se divergir mais que a tolerância, marca `conflito`;
 * - sobre um vigente "informado", um "estimado" não o substitui (fica no histórico);
 * - nos demais casos, o novo valor vira o vigente.
 */
export async function registrarMedidaCorporal(
  regiao: RegiaoMedida,
  valor: number,
  origem: OrigemDado,
  opcoes: { data?: string; observacao?: string } = {},
): Promise<ResultadoRegistroMedida> {
  if (!Number.isFinite(valor) || valor <= 0) throw new Error('Informe um valor de medida válido.');
  return db.transaction('rw', db.medidasCorporais, async () => {
    const agora = agoraISO();
    const existente = await db.medidasCorporais.get(regiao);
    const registro: RegistroMedidaCorporal = {
      id: novoId(),
      valor,
      unidade: 'cm',
      origem,
      data: opcoes.data ?? agora,
      observacao: opcoes.observacao,
    };
    const medida: MedidaCorporal = existente
      ? { ...existente, historico: [...existente.historico, registro], atualizadaEm: agora }
      : { regiao, historico: [registro], atualizadaEm: agora };
    const atual = registroAtual(existente);

    let virouAtual = false;
    let conflito: ConflitoMedida | undefined;
    if (!atual || PESO_ORIGEM[origem] >= PESO_ORIGEM[atual.origem]) {
      medida.atualId = registro.id;
      virouAtual = true;
      if (origem === 'conferido') medida.conflito = undefined;
    } else if (atual.origem === 'conferido') {
      const diferenca = Math.abs(valor - atual.valor);
      if (diferenca > TOLERANCIA_CONFLITO_CM) {
        conflito = { conferidoId: atual.id, divergenteId: registro.id, diferenca, detectadoEm: agora };
        medida.conflito = conflito;
      }
    }
    await db.medidasCorporais.put(medida);
    return { medida, registro, virouAtual, conflito };
  });
}

/** Resolve o conflito: manter o conferido, ou adotar o divergente como vigente. */
export async function resolverConflitoMedida(regiao: RegiaoMedida, escolha: 'manter_conferido' | 'usar_novo'): Promise<void> {
  await db.transaction('rw', db.medidasCorporais, async () => {
    const m = await db.medidasCorporais.get(regiao);
    if (!m?.conflito) return;
    const atualId = escolha === 'usar_novo' ? m.conflito.divergenteId : m.conflito.conferidoId;
    await db.medidasCorporais.put({ ...m, atualId, conflito: undefined, atualizadaEm: agoraISO() });
  });
}

/** Escolha explícita da usuária de qual registro do histórico é o vigente. */
export async function definirMedidaAtual(regiao: RegiaoMedida, registroId: ID): Promise<void> {
  await db.transaction('rw', db.medidasCorporais, async () => {
    const m = await db.medidasCorporais.get(regiao);
    if (!m || !m.historico.some((r) => r.id === registroId)) throw new Error('Registro não encontrado.');
    await db.medidasCorporais.put({ ...m, atualId: registroId, conflito: undefined, atualizadaEm: agoraISO() });
  });
}

/** Marca um registro existente como conferido (e o torna vigente). */
export async function conferirRegistroMedida(regiao: RegiaoMedida, registroId: ID): Promise<void> {
  await db.transaction('rw', db.medidasCorporais, async () => {
    const m = await db.medidasCorporais.get(regiao);
    if (!m) throw new Error('Medida não encontrada.');
    const historico = m.historico.map((r) => (r.id === registroId ? { ...r, origem: 'conferido' as const } : r));
    await db.medidasCorporais.put({ ...m, historico, atualId: registroId, conflito: undefined, atualizadaEm: agoraISO() });
  });
}

/** Remove um registro do histórico (ação explícita). Se era o vigente, assume o mais recente de maior origem. */
export async function removerRegistroMedida(regiao: RegiaoMedida, registroId: ID): Promise<void> {
  await db.transaction('rw', db.medidasCorporais, async () => {
    const m = await db.medidasCorporais.get(regiao);
    if (!m) return;
    const historico = m.historico.filter((r) => r.id !== registroId);
    if (!historico.length) {
      await db.medidasCorporais.delete(regiao);
      return;
    }
    let atualId = m.atualId;
    if (atualId === registroId) {
      const melhor = [...historico].sort(
        (a, b) => PESO_ORIGEM[b.origem] - PESO_ORIGEM[a.origem] || b.data.localeCompare(a.data),
      )[0];
      atualId = melhor.id;
    }
    const conflito =
      m.conflito && (m.conflito.conferidoId === registroId || m.conflito.divergenteId === registroId) ? undefined : m.conflito;
    await db.medidasCorporais.put({ ...m, historico, atualId, conflito, atualizadaEm: agoraISO() });
  });
}

export function listarMedidasCorporais(): Promise<MedidaCorporal[]> {
  return db.medidasCorporais.toArray();
}

export function obterMedidaCorporal(regiao: RegiaoMedida): Promise<MedidaCorporal | undefined> {
  return db.medidasCorporais.get(regiao);
}

/** Mapa região → valor vigente (cm), para a estimativa de caimento. */
export async function medidasCorporaisAtuais(): Promise<Partial<Record<RegiaoMedida, RegistroMedidaCorporal>>> {
  const todas = await db.medidasCorporais.toArray();
  const r: Partial<Record<RegiaoMedida, RegistroMedidaCorporal>> = {};
  for (const m of todas) {
    const atual = registroAtual(m);
    if (atual) r[m.regiao] = atual;
  }
  return r;
}

// ---------------------------------------------------------------------------
// Compras candidatas (etapa E)
// ---------------------------------------------------------------------------

export async function criarCompra(
  dados: Omit<CompraCandidata, 'id' | 'criadaEm' | 'atualizadaEm' | 'midiaIds' | 'situacao'> &
    Partial<Pick<CompraCandidata, 'situacao'>>,
): Promise<CompraCandidata> {
  const agora = agoraISO();
  const compra: CompraCandidata = {
    ...dados,
    id: novoId(),
    midiaIds: [],
    situacao: dados.situacao ?? 'pesquisando',
    criadaEm: agora,
    atualizadaEm: agora,
  };
  await db.compras.add(compra);
  return compra;
}

export async function atualizarCompra(id: ID, alteracoes: Partial<Omit<CompraCandidata, 'id' | 'criadaEm' | 'midiaIds'>>): Promise<void> {
  const n = await db.compras.update(id, { ...alteracoes, atualizadaEm: agoraISO() });
  if (!n) throw new Error('Compra não encontrada.');
}

export function obterCompra(id: ID): Promise<CompraCandidata | undefined> {
  return db.compras.get(id);
}

export async function listarCompras(): Promise<CompraCandidata[]> {
  return (await db.compras.toArray()).sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));
}

export async function apagarCompra(id: ID): Promise<void> {
  await db.transaction('rw', db.compras, db.midias, async () => {
    await db.midias.where('[donoTipo+donoId]').equals(['compra', id]).delete();
    await db.compras.delete(id);
  });
}

// ---------------------------------------------------------------------------
// Metadados
// ---------------------------------------------------------------------------

export async function obterMeta<T = unknown>(chave: ChaveMeta): Promise<T | undefined> {
  return (await db.meta.get(chave))?.valor as T | undefined;
}

export async function definirMeta(chave: ChaveMeta, valor: unknown): Promise<void> {
  const m: Meta = { chave, valor, atualizadoEm: agoraISO() };
  await db.meta.put(m);
}

/** Data ISO do último backup exportado (ou undefined). */
export function obterUltimoBackup(): Promise<string | undefined> {
  return obterMeta<string>('ultimoBackup');
}
