/**
 * Backup completo (B12): exporta TODOS os dados e fotos para um .zip e restaura a partir dele.
 *
 * Formato (versaoFormato 1):
 *   manifesto.json        { formato, versaoFormato, versaoBanco, criadoEm, contagens }
 *   dados.json            todas as tabelas; mídias sem os blobs, com o caminho dos arquivos
 *   midias/<id>/original.<ext>  e  midias/<id>/miniatura.jpg      (fotos de peças/looks/compras)
 *   corpo/<id>/original.<ext>   e  corpo/<id>/miniatura.jpg       (fotos do corpo, área separada)
 */
import JSZip from 'jszip';
import { db, type ClosetDB } from '../db/db';
import {
  agoraISO,
  TABELAS,
  type CompraCandidata,
  type Look,
  type MedidaCorporal,
  type Meta,
  type Midia,
  type MidiaCorpo,
  type Peca,
  type Perfil,
  type Semana,
} from '../db/schema';

export const FORMATO_BACKUP = 'closet-jsa-backup';
export const VERSAO_FORMATO_BACKUP = 1;

export interface ManifestoBackup {
  formato: typeof FORMATO_BACKUP;
  versaoFormato: number;
  versaoBanco: number;
  criadoEm: string;
  contagens: Record<string, number>;
}

type SemBlobs<T> = Omit<T, 'original' | 'miniatura'> & { arquivoOriginal: string; arquivoMiniatura: string };

interface DadosBackup {
  pecas: Peca[];
  looks: Look[];
  semanas: Semana[];
  perfil: Perfil[];
  medidasCorporais: MedidaCorporal[];
  compras: CompraCandidata[];
  meta: Meta[];
  midias: SemBlobs<Midia>[];
  midiasCorpo: SemBlobs<MidiaCorpo>[];
}

const EXTENSOES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

function extensao(mime: string): string {
  return EXTENSOES[mime] ?? 'bin';
}

async function bytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

function paraBlob(dados: Uint8Array, tipo: string): Blob {
  // cópia em ArrayBuffer próprio (evita problemas de tipo/visão compartilhada)
  const copia = new Uint8Array(dados.byteLength);
  copia.set(dados);
  return new Blob([copia.buffer], { type: tipo });
}

/** Nome sugerido do arquivo: closet-jsa-backup-AAAA-MM-DD-HHMM.zip */
export function nomeArquivoBackup(data = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `closet-jsa-backup-${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}-${p(data.getHours())}${p(data.getMinutes())}.zip`;
}

/**
 * Gera o .zip com tudo. Registra a data em meta "ultimoBackup" (a menos que
 * `registrar` seja false).
 */
export async function exportarBackup(
  opcoes: { banco?: ClosetDB; registrar?: boolean } = {},
): Promise<{ blob: Blob; manifesto: ManifestoBackup; nomeArquivo: string }> {
  const banco = opcoes.banco ?? db;
  const zip = new JSZip();
  const criadoEm = agoraISO();

  const [pecas, looks, semanas, perfil, medidasCorporais, compras, meta, midias, midiasCorpo] = await banco.transaction(
    'r',
    [banco.pecas, banco.looks, banco.semanas, banco.perfil, banco.medidasCorporais, banco.compras, banco.meta, banco.midias, banco.midiasCorpo],
    () =>
      Promise.all([
        banco.pecas.toArray(),
        banco.looks.toArray(),
        banco.semanas.toArray(),
        banco.perfil.toArray(),
        banco.medidasCorporais.toArray(),
        banco.compras.toArray(),
        banco.meta.toArray(),
        banco.midias.toArray(),
        banco.midiasCorpo.toArray(),
      ]),
  );

  const dados: DadosBackup = {
    pecas,
    looks,
    semanas,
    perfil,
    medidasCorporais,
    compras,
    meta,
    midias: [],
    midiasCorpo: [],
  };

  for (const m of midias) {
    const { original, miniatura, ...resto } = m;
    const arquivoOriginal = `midias/${m.id}/original.${extensao(m.mime)}`;
    const arquivoMiniatura = `midias/${m.id}/miniatura.jpg`;
    zip.file(arquivoOriginal, await bytes(original), { binary: true });
    zip.file(arquivoMiniatura, await bytes(miniatura), { binary: true });
    dados.midias.push({ ...resto, arquivoOriginal, arquivoMiniatura });
  }
  for (const m of midiasCorpo) {
    const { original, miniatura, ...resto } = m;
    const arquivoOriginal = `corpo/${m.id}/original.${extensao(m.mime)}`;
    const arquivoMiniatura = `corpo/${m.id}/miniatura.jpg`;
    zip.file(arquivoOriginal, await bytes(original), { binary: true });
    zip.file(arquivoMiniatura, await bytes(miniatura), { binary: true });
    dados.midiasCorpo.push({ ...resto, arquivoOriginal, arquivoMiniatura });
  }

  const manifesto: ManifestoBackup = {
    formato: FORMATO_BACKUP,
    versaoFormato: VERSAO_FORMATO_BACKUP,
    versaoBanco: banco.verno,
    criadoEm,
    contagens: Object.fromEntries(Object.entries(dados).map(([k, v]) => [k, (v as unknown[]).length])),
  };

  zip.file('manifesto.json', JSON.stringify(manifesto, null, 2));
  zip.file('dados.json', JSON.stringify(dados));

  // Fotos já são comprimidas: STORE evita gastar CPU; JSON é pequeno.
  const conteudo = await zip.generateAsync({ type: 'uint8array', compression: 'STORE' });
  const blob = paraBlob(conteudo, 'application/zip');

  if (opcoes.registrar !== false) {
    await banco.meta.put({ chave: 'ultimoBackup', valor: criadoEm, atualizadoEm: criadoEm });
  }
  return { blob, manifesto, nomeArquivo: nomeArquivoBackup(new Date(criadoEm)) };
}

/** Lê e valida o manifesto de um backup sem alterar nada (para a tela de confirmação). */
export async function lerManifestoBackup(arquivo: Blob): Promise<ManifestoBackup> {
  const zip = await JSZip.loadAsync(await arquivo.arrayBuffer());
  return validarManifesto(zip);
}

async function validarManifesto(zip: JSZip): Promise<ManifestoBackup> {
  const f = zip.file('manifesto.json');
  if (!f) throw new Error('Arquivo não é um backup do Closet JSA (manifesto ausente).');
  let manifesto: ManifestoBackup;
  try {
    manifesto = JSON.parse(await f.async('string')) as ManifestoBackup;
  } catch {
    throw new Error('Manifesto do backup está corrompido.');
  }
  if (manifesto.formato !== FORMATO_BACKUP) throw new Error('Arquivo não é um backup do Closet JSA.');
  if (manifesto.versaoFormato > VERSAO_FORMATO_BACKUP) {
    throw new Error('Este backup foi feito por uma versão mais nova do app. Atualize o app antes de restaurar.');
  }
  return manifesto;
}

/**
 * Restaura o backup SUBSTITUINDO todo o banco. A confirmação deve ser feita na tela antes.
 * Tudo é lido e validado antes de apagar; a gravação ocorre numa única transação
 * (se falhar, nada é alterado).
 */
export async function restaurarBackup(
  arquivo: Blob,
  opcoes: { banco?: ClosetDB } = {},
): Promise<ManifestoBackup> {
  const banco = opcoes.banco ?? db;
  const zip = await JSZip.loadAsync(await arquivo.arrayBuffer());
  const manifesto = await validarManifesto(zip);
  const fDados = zip.file('dados.json');
  if (!fDados) throw new Error('Backup incompleto (dados.json ausente).');
  const dados = JSON.parse(await fDados.async('string')) as DadosBackup;

  async function lerArquivo(caminho: string, tipo: string): Promise<Blob> {
    const f = zip.file(caminho);
    if (!f) throw new Error(`Backup incompleto: falta o arquivo ${caminho}.`);
    return paraBlob(await f.async('uint8array'), tipo);
  }

  const midias: Midia[] = [];
  for (const { arquivoOriginal, arquivoMiniatura, ...m } of dados.midias ?? []) {
    midias.push({
      ...m,
      original: await lerArquivo(arquivoOriginal, m.mime),
      miniatura: await lerArquivo(arquivoMiniatura, 'image/jpeg'),
    });
  }
  const midiasCorpo: MidiaCorpo[] = [];
  for (const { arquivoOriginal, arquivoMiniatura, ...m } of dados.midiasCorpo ?? []) {
    midiasCorpo.push({
      ...m,
      original: await lerArquivo(arquivoOriginal, m.mime),
      miniatura: await lerArquivo(arquivoMiniatura, 'image/jpeg'),
    });
  }

  const tabelas = TABELAS.map((t) => banco.table(t));
  const agora = agoraISO();
  await banco.transaction('rw', tabelas, async () => {
    await Promise.all(tabelas.map((t) => t.clear()));
    await banco.pecas.bulkAdd(dados.pecas ?? []);
    await banco.looks.bulkAdd(dados.looks ?? []);
    await banco.semanas.bulkAdd(dados.semanas ?? []);
    await banco.perfil.bulkAdd(dados.perfil ?? []);
    await banco.medidasCorporais.bulkAdd(dados.medidasCorporais ?? []);
    await banco.compras.bulkAdd(dados.compras ?? []);
    await banco.meta.bulkAdd(dados.meta ?? []);
    await banco.midias.bulkAdd(midias);
    await banco.midiasCorpo.bulkAdd(midiasCorpo);
    await banco.meta.put({ chave: 'ultimoBackup', valor: manifesto.criadoEm, atualizadoEm: agora });
    await banco.meta.put({ chave: 'ultimaRestauracao', valor: agora, atualizadoEm: agora });
  });
  return manifesto;
}

/** Dispara o download do blob no navegador (sem rede: object URL local). */
export function baixarArquivo(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
