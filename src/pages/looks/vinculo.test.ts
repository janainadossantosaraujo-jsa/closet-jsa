import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/images', async () => {
  const { miniaturaFalsa } = await import('../../test/util');
  return { gerarMiniatura: miniaturaFalsa };
});

import { criarLook, criarPeca, obterSemanaPorInicio } from '../../db/repo';
import { limparBanco } from '../../test/util';
import { caminhoNovoLookParaDia, colocarLookNoDia, lerDestino } from './vinculo';

beforeEach(limparBanco);

describe('vínculo look ↔ semana', () => {
  it('monta e lê o destino pela URL', () => {
    const c = caminhoNovoLookParaDia({ semana: '2026-10-19', dia: '2026-10-21', papel: 'alternativa' }, { ocasiao: 'trabalho' });
    const q = new URLSearchParams(c.split('?')[1]);
    expect(lerDestino(q)).toEqual({ semana: '2026-10-19', dia: '2026-10-21', papel: 'alternativa' });
    expect(q.get('ocasiao')).toBe('trabalho');
    expect(lerDestino(new URLSearchParams('semana=x&dia=2026-10-21'))).toBeUndefined();
  });

  it('cria a semana sob demanda e põe o look como escolhido ou alternativa', async () => {
    const p = await criarPeca({ nome: 'Blusa', categoria: 'blusa' });
    const l1 = await criarLook({ pecaIds: [p.id] });
    const l2 = await criarLook({ pecaIds: [p.id] });
    expect(await obterSemanaPorInicio('2026-10-19')).toBeUndefined();

    await colocarLookNoDia({ semana: '2026-10-19', dia: '2026-10-21', papel: 'alternativa' }, l1.id);
    await colocarLookNoDia({ semana: '2026-10-19', dia: '2026-10-21', papel: 'look' }, l2.id);
    let dia = (await obterSemanaPorInicio('2026-10-19'))!.dias.find((d) => d.data === '2026-10-21')!;
    expect(dia.lookId).toBe(l2.id);
    expect(dia.alternativasLookIds).toEqual([l1.id]);

    // promover a alternativa tira ela da lista de alternativas
    await colocarLookNoDia({ semana: '2026-10-19', dia: '2026-10-21', papel: 'look' }, l1.id);
    dia = (await obterSemanaPorInicio('2026-10-19'))!.dias.find((d) => d.data === '2026-10-21')!;
    expect(dia.lookId).toBe(l1.id);
    expect(dia.alternativasLookIds).toEqual([]);
  });
});
