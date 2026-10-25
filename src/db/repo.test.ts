import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/images', async () => {
  const { miniaturaFalsa } = await import('../test/util');
  return { gerarMiniatura: miniaturaFalsa };
});

import { db } from './db';
import {
  adicionarFotosPeca,
  apagarLook,
  apagarMidia,
  apagarPeca,
  atualizarDia,
  criarLook,
  criarPeca,
  definirMedidaAtual,
  inicioDaSemana,
  listarMidiasDoDono,
  listarPecas,
  obterOuCriarSemana,
  obterPerfil,
  registrarMedidaCorporal,
  registroAtual,
  resolverConflitoMedida,
  salvarPerfil,
  adicionarFotoCorpo,
} from './repo';
import { imagemFalsa, limparBanco } from '../test/util';

describe('peças e mídias', () => {
  beforeEach(limparBanco);

  it('salva peça com fotos (original intacto + miniatura) e apaga tudo junto', async () => {
    const original = imagemFalsa(1, 5000);
    const p = await criarPeca({ nome: ' Vestido azul ', categoria: 'vestido' }, [{ arquivo: original, tipo: 'frente' }]);
    expect(p.nome).toBe('Vestido azul');
    expect(p.disponibilidade).toBe('disponivel');
    expect(p.midiaIds).toHaveLength(1);
    const [m] = await listarMidiasDoDono('peca', p.id);
    expect(m.original.size).toBe(5000);
    expect(m.miniatura.size).toBe(100);
    expect(m.tamanhoBytes).toBe(5000);

    await adicionarFotosPeca(p.id, [{ arquivo: imagemFalsa(2), tipo: 'costas' }]);
    expect((await db.pecas.get(p.id))!.midiaIds).toHaveLength(2);

    const outra = await criarPeca({ nome: 'Saia', categoria: 'saia' }, [{ arquivo: imagemFalsa(3) }]);
    const look = await criarLook({ pecaIds: [p.id, outra.id] });
    const semana = await obterOuCriarSemana('2026-10-19');
    await atualizarDia(semana.id, { ...semana.dias[0], lookId: look.id, pecasFixadasIds: [p.id] });

    await apagarPeca(p.id);
    expect(await db.pecas.get(p.id)).toBeUndefined();
    expect(await listarMidiasDoDono('peca', p.id)).toHaveLength(0);
    expect(await db.midias.count()).toBe(1); // só a da saia
    expect((await db.looks.get(look.id))!.pecaIds).toEqual([outra.id]);
    expect((await db.semanas.get(semana.id))!.dias[0].pecasFixadasIds).toEqual([]);

    await apagarLook(look.id);
    expect((await db.semanas.get(semana.id))!.dias[0].lookId).toBeUndefined();
  });

  it('apagar mídia remove da peça', async () => {
    const p = await criarPeca({ nome: 'Blusa', categoria: 'blusa' }, [{ arquivo: imagemFalsa(1) }, { arquivo: imagemFalsa(2) }]);
    await apagarMidia(p.midiaIds[0]);
    expect((await db.pecas.get(p.id))!.midiaIds).toEqual([p.midiaIds[1]]);
  });

  it('filtra por categoria, disponibilidade e busca sem acento', async () => {
    await criarPeca({ nome: 'Calça de linho', categoria: 'calca', cor: 'Bege' });
    await criarPeca({ nome: 'Blusa', categoria: 'blusa', disponibilidade: 'para_lavar' });
    expect(await listarPecas({ categoria: 'calca' })).toHaveLength(1);
    expect(await listarPecas({ disponibilidade: 'para_lavar' })).toHaveLength(1);
    expect(await listarPecas({ busca: 'calca bege' })).toHaveLength(1);
  });

  it('look só aceita peças existentes', async () => {
    await expect(criarLook({ pecaIds: ['nao-existe'] })).rejects.toThrow();
  });

  it('fotos do corpo ficam em tabela separada', async () => {
    await adicionarFotoCorpo(imagemFalsa(5), 'corpo_frente');
    expect(await db.midiasCorpo.count()).toBe(1);
    expect(await db.midias.count()).toBe(0);
  });
});

describe('semana', () => {
  it('início da semana é segunda-feira', () => {
    expect(inicioDaSemana(new Date(2026, 9, 24))).toBe('2026-10-19'); // sábado
    expect(inicioDaSemana(new Date(2026, 9, 25))).toBe('2026-10-19'); // domingo
    expect(inicioDaSemana(new Date(2026, 9, 26))).toBe('2026-10-26'); // segunda
  });
});

describe('perfil e medidas corporais', () => {
  beforeEach(limparBanco);

  it('perfil padrão traz a preferência "não justa em cima" (D25)', async () => {
    const p = await obterPerfil();
    expect(p.preferenciasFolga.some((f) => f.regiao === 'parte_de_cima' && f.evitarJusta)).toBe(true);
    expect(p.desconfortosEvitar).toContain('justa_em_cima');
    const salvo = await salvarPerfil({ nome: 'J' });
    expect(salvo.preferenciasFolga).toHaveLength(1);
  });

  it('estimado não sobrescreve conferido: guarda histórico e marca conflito', async () => {
    const r1 = await registrarMedidaCorporal('busto', 120, 'conferido');
    expect(r1.virouAtual).toBe(true);

    const r2 = await registrarMedidaCorporal('busto', 112, 'estimado');
    expect(r2.virouAtual).toBe(false);
    expect(r2.conflito?.diferenca).toBe(8);
    let m = (await db.medidasCorporais.get('busto'))!;
    expect(m.historico).toHaveLength(2);
    expect(registroAtual(m)!.valor).toBe(120);
    expect(m.conflito?.divergenteId).toBe(r2.registro.id);

    await resolverConflitoMedida('busto', 'manter_conferido');
    m = (await db.medidasCorporais.get('busto'))!;
    expect(m.conflito).toBeUndefined();
    expect(registroAtual(m)!.valor).toBe(120);
    expect(m.historico).toHaveLength(2);
  });

  it('estimado próximo do conferido não gera conflito; novo conferido substitui', async () => {
    await registrarMedidaCorporal('cintura', 100, 'conferido');
    const r = await registrarMedidaCorporal('cintura', 100.5, 'estimado');
    expect(r.conflito).toBeUndefined();
    const r3 = await registrarMedidaCorporal('cintura', 98, 'conferido');
    expect(r3.virouAtual).toBe(true);
    const m = (await db.medidasCorporais.get('cintura'))!;
    expect(registroAtual(m)!.valor).toBe(98);
    expect(m.historico).toHaveLength(3);
  });

  it('usar o novo valor no conflito e escolha manual do vigente', async () => {
    const c = await registrarMedidaCorporal('quadril', 140, 'conferido');
    await registrarMedidaCorporal('quadril', 146, 'informado');
    await resolverConflitoMedida('quadril', 'usar_novo');
    let m = (await db.medidasCorporais.get('quadril'))!;
    expect(registroAtual(m)!.valor).toBe(146);
    await definirMedidaAtual('quadril', c.registro.id);
    m = (await db.medidasCorporais.get('quadril'))!;
    expect(registroAtual(m)!.valor).toBe(140);
  });

  it('informado substitui estimado; estimado não substitui informado', async () => {
    await registrarMedidaCorporal('ombros', 44, 'estimado');
    const r = await registrarMedidaCorporal('ombros', 46, 'informado');
    expect(r.virouAtual).toBe(true);
    const r2 = await registrarMedidaCorporal('ombros', 43, 'estimado');
    expect(r2.virouAtual).toBe(false);
    expect(r2.conflito).toBeUndefined();
  });
});
