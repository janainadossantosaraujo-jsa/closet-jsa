import { beforeEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';

vi.mock('./images', async () => {
  const { miniaturaFalsa } = await import('../test/util');
  return { gerarMiniatura: miniaturaFalsa };
});

import { db } from '../db/db';
import {
  adicionarFotoCorpo,
  criarLook,
  criarPeca,
  definirMeta,
  obterOuCriarSemana,
  registrarMedidaCorporal,
  salvarPerfil,
} from '../db/repo';
import { TABELAS } from '../db/schema';
import { bytesDe, imagemFalsa, limparBanco } from '../test/util';
import { exportarBackup, FORMATO_BACKUP, lerManifestoBackup, restaurarBackup } from './backup';

async function popular() {
  const blusa = await criarPeca(
    {
      nome: 'Blusa de linho',
      categoria: 'blusa',
      cor: 'Terracota',
      elasticidade: 'nenhuma',
      medidas: [{ id: 'm1', regiao: 'busto', valor: 62, unidade: 'cm', tipo: 'largura_aberta', origem: 'conferido', data: '2026-10-24T10:00:00.000Z' }],
      ocasioes: ['trabalho', 'lazer'],
      desconfortos: ['justa_em_cima'],
    },
    [
      { arquivo: imagemFalsa(1, 5000), tipo: 'frente' },
      { arquivo: imagemFalsa(2, 3000, 'image/png'), tipo: 'etiqueta' },
    ],
  );
  const calca = await criarPeca({ nome: 'Calça pantalona', categoria: 'calca' }, [{ arquivo: imagemFalsa(3), tipo: 'frente' }]);
  await criarLook({ pecaIds: [blusa.id, calca.id], nome: 'Trabalho leve', ocasiao: 'trabalho' });
  const semana = await obterOuCriarSemana('2026-10-19');
  expect(semana.dias).toHaveLength(7);
  await salvarPerfil({ nome: 'J', coresPreferidas: ['verde'] });
  await registrarMedidaCorporal('busto', 120, 'conferido');
  await registrarMedidaCorporal('busto', 115, 'estimado');
  await adicionarFotoCorpo(imagemFalsa(9, 4000), 'corpo_frente');
  await definirMeta('qualquer', { a: 1 });
}

async function instantaneo() {
  const r: Record<string, unknown[]> = {};
  for (const t of TABELAS) {
    const linhas = await db.table(t).toArray();
    r[t] = await Promise.all(
      linhas.map(async (l: Record<string, unknown>) => {
        const c: Record<string, unknown> = { ...l };
        if (c.original instanceof Blob) c.original = { tipo: c.original.type, bytes: await bytesDe(c.original) };
        if (c.miniatura instanceof Blob) c.miniatura = { tipo: c.miniatura.type, bytes: await bytesDe(c.miniatura) };
        return c;
      }),
    );
    r[t].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  return r;
}

describe('backup', () => {
  beforeEach(limparBanco);

  it('ida e volta: exportar → limpar → importar mantém dados e blobs', async () => {
    await popular();
    const { blob, manifesto, nomeArquivo } = await exportarBackup();
    expect(nomeArquivo).toMatch(/^closet-jsa-backup-\d{4}-\d{2}-\d{2}-\d{4}\.zip$/);
    expect(manifesto.formato).toBe(FORMATO_BACKUP);
    expect(manifesto.contagens.pecas).toBe(2);
    expect(manifesto.contagens.midias).toBe(3);
    expect(manifesto.contagens.midiasCorpo).toBe(1);

    const antes = await instantaneo();
    expect((antes.meta as { chave: string }[]).some((m) => m.chave === 'ultimoBackup')).toBe(true);

    await limparBanco();
    expect(await db.pecas.count()).toBe(0);
    expect(await db.midias.count()).toBe(0);

    const m = await restaurarBackup(blob);
    expect(m.criadoEm).toBe(manifesto.criadoEm);

    const depois = await instantaneo();
    // meta ganha "ultimaRestauracao"; o resto deve ser idêntico
    const semRestauracao = (l: unknown[]) => l.filter((x) => (x as { chave: string }).chave !== 'ultimaRestauracao');
    for (const t of TABELAS) {
      if (t === 'meta') continue;
      expect(depois[t], `tabela ${t}`).toEqual(antes[t]);
    }
    const metaAntes = (antes.meta as { chave: string; valor: unknown }[]).map(({ chave, valor }) => ({ chave, valor }));
    const metaDepois = (semRestauracao(depois.meta) as { chave: string; valor: unknown }[]).map(({ chave, valor }) => ({ chave, valor }));
    expect(metaDepois).toEqual(metaAntes);

    // blobs voltam como Blob com tipo correto
    const midias = await db.midias.toArray();
    expect(midias.every((x) => x.original instanceof Blob && x.miniatura instanceof Blob)).toBe(true);
    expect(midias.find((x) => x.tipo === 'etiqueta')?.original.type).toBe('image/png');
  });

  it('fotos do corpo ficam em pasta separada no zip', async () => {
    await popular();
    const { blob } = await exportarBackup({ registrar: false });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const nomes = Object.keys(zip.files);
    expect(nomes.filter((n) => n.startsWith('corpo/') && n.endsWith('original.jpg'))).toHaveLength(1);
    expect(nomes.filter((n) => n.startsWith('midias/') && n.includes('original'))).toHaveLength(3);
    const dados = JSON.parse(await zip.file('dados.json')!.async('string'));
    expect(JSON.stringify(dados)).not.toContain('"original"');
  });

  it('restaurar substitui dados existentes', async () => {
    await popular();
    const { blob } = await exportarBackup();
    await criarPeca({ nome: 'Peça nova depois do backup', categoria: 'saia' });
    expect(await db.pecas.count()).toBe(3);
    await restaurarBackup(blob);
    expect(await db.pecas.count()).toBe(2);
    expect(await db.pecas.where('nome').equals('Peça nova depois do backup').count()).toBe(0);
  });

  it('rejeita arquivo que não é backup e não altera o banco', async () => {
    await popular();
    const zip = new JSZip();
    zip.file('qualquer.txt', 'oi');
    const falso = new Blob([await zip.generateAsync({ type: 'uint8array' }) as Uint8Array<ArrayBuffer>]);
    await expect(lerManifestoBackup(falso)).rejects.toThrow(/não é um backup/);
    await expect(restaurarBackup(falso)).rejects.toThrow();
    expect(await db.pecas.count()).toBe(2);
  });

  it('backup incompleto (falta foto) não apaga nada', async () => {
    await popular();
    const { blob } = await exportarBackup();
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const primeiro = Object.keys(zip.files).find((n) => n.startsWith('midias/') && n.includes('original'))!;
    zip.remove(primeiro);
    const quebrado = new Blob([await zip.generateAsync({ type: 'uint8array' }) as Uint8Array<ArrayBuffer>]);
    await expect(restaurarBackup(quebrado)).rejects.toThrow(/incompleto/);
    expect(await db.midias.count()).toBe(3);
  });
});
