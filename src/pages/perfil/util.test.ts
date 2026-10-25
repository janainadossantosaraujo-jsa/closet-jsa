import { beforeEach, describe, expect, it, vi } from 'vitest';
import { limparBanco, miniaturaFalsa } from '../../test/util';

vi.mock('../../lib/images', () => ({ gerarMiniatura: miniaturaFalsa }));

import {
  conferirRegistroMedida,
  obterMedidaCorporal,
  obterPerfil,
  registrarMedidaCorporal,
  registroAtual,
  resolverConflitoMedida,
  salvarPerfil,
} from '../../db/repo';
import { PREFERENCIA_NAO_JUSTA_EM_CIMA, REGIOES_MEDIDA } from '../../db/schema';
import { COMO_MEDIR } from './comoMedir';
import {
  adicionarItem,
  adicionarTipoCompromisso,
  atualizarTipoCompromisso,
  definirFolga,
  diaParaISO,
  formatarCm,
  hojeDia,
  normalizarCor,
  removerFolga,
  removerItem,
  removerTipoCompromisso,
} from './util';

describe('util do perfil', () => {
  it('formata centímetros com vírgula', () => {
    expect(formatarCm(98.5)).toBe('98,5 cm');
    expect(formatarCm(110)).toBe('110 cm');
    expect(formatarCm(98.56)).toBe('98,6 cm');
  });

  it('converte dia em ISO sem trocar de dia', () => {
    const iso = diaParaISO('2026-03-10');
    const d = new Date(iso);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(10);
    expect(new Date(diaParaISO(hojeDia())).getDate()).toBe(new Date().getDate());
  });

  it('adiciona itens sem repetir e sem espaços extras', () => {
    let l = adicionarItem([], '  Casual ');
    l = adicionarItem(l, 'casual');
    l = adicionarItem(l, '');
    l = adicionarItem(l, 'Salto   alto');
    expect(l).toEqual(['Casual', 'Salto alto']);
    expect(removerItem(l, 'Casual')).toEqual(['Salto alto']);
  });

  it('normaliza cores', () => {
    expect(normalizarCor('#ABC')).toBe('#aabbcc');
    expect(normalizarCor('1F6F5C')).toBe('#1f6f5c');
    expect(normalizarCor('  terracota ')).toBe('terracota');
    expect(normalizarCor('  ')).toBeUndefined();
  });

  it('define e remove preferência de folga por região', () => {
    const base = [{ ...PREFERENCIA_NAO_JUSTA_EM_CIMA, data: 'x' }];
    const comBusto = definirFolga(base, { regiao: 'busto', preferencia: 'solta', evitarJusta: true, origem: 'informado', data: 'y' });
    expect(comBusto).toHaveLength(2);
    const trocada = definirFolga(comBusto, { regiao: 'parte_de_cima', preferencia: 'bem_solta', evitarJusta: true, origem: 'informado', data: 'z' });
    expect(trocada).toHaveLength(2);
    expect(trocada[0].preferencia).toBe('bem_solta');
    expect(removerFolga(trocada, 'busto')).toHaveLength(1);
  });

  it('adiciona, renomeia e remove tipos de compromisso', () => {
    let l = adicionarTipoCompromisso([], ' Audiência ', 'formal');
    l = adicionarTipoCompromisso(l, '   ');
    expect(l).toHaveLength(1);
    expect(l[0].nome).toBe('Audiência');
    const id = l[0].id;
    l = atualizarTipoCompromisso(l, id, { nome: 'Audiência criminal' });
    expect(l[0].nome).toBe('Audiência criminal');
    expect(l[0].formalidade).toBe('formal');
    l = atualizarTipoCompromisso(l, id, { nome: '  ' });
    expect(l[0].nome).toBe('Audiência criminal');
    expect(removerTipoCompromisso(l, id)).toEqual([]);
  });

  it('tem ajuda de "como medir" para todas as regiões', () => {
    for (const r of REGIOES_MEDIDA) expect(COMO_MEDIR[r.valor].length).toBeGreaterThan(10);
  });
});

describe('fluxos usados pelas telas do perfil', () => {
  beforeEach(limparBanco);

  it('perfil padrão já traz "não gosta de justa em cima" e salvar mantém', async () => {
    const p = await obterPerfil();
    expect(p.preferenciasFolga.some((f) => f.regiao === 'parte_de_cima' && f.evitarJusta)).toBe(true);
    await salvarPerfil({ tiposCompromisso: adicionarTipoCompromisso([], 'Plantão', 'intermediario') });
    const salvo = await obterPerfil();
    expect(salvo.tiposCompromisso[0].nome).toBe('Plantão');
    expect(salvo.preferenciasFolga.some((f) => f.regiao === 'parte_de_cima' && f.evitarJusta)).toBe(true);
  });

  it('conflito exige escolha explícita e não sobrescreve o conferido', async () => {
    await registrarMedidaCorporal('busto', 120, 'conferido');
    const r = await registrarMedidaCorporal('busto', 125, 'informado', { data: diaParaISO(hojeDia()) });
    expect(r.virouAtual).toBe(false);
    expect(r.conflito).toBeDefined();
    expect(registroAtual(r.medida)?.valor).toBe(120);
    await resolverConflitoMedida('busto', 'usar_novo');
    const m = await obterMedidaCorporal('busto');
    expect(registroAtual(m)?.valor).toBe(125);
    expect(m?.conflito).toBeUndefined();
    await conferirRegistroMedida('busto', registroAtual(m)!.id);
    expect(registroAtual(await obterMedidaCorporal('busto'))?.origem).toBe('conferido');
  });
});
