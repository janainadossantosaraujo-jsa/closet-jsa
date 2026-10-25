import { describe, expect, it } from 'vitest';
import type { DiaSemana, Look, Peca, RegrasSemana } from '../../db/schema';
import { agruparPecas, alertasSemana, avisosConforto, diaCurto, diferencaDias, pecasUsadasNoDia } from './regras';

function peca(id: string, extra: Partial<Peca> = {}): Peca {
  return {
    id,
    nome: `Peça ${id}`,
    categoria: 'blusa',
    midiaIds: [],
    medidas: [],
    ocasioes: [],
    estacoes: [],
    desconfortos: [],
    disponibilidade: 'disponivel',
    criadaEm: '2026-10-01T00:00:00.000Z',
    atualizadaEm: '2026-10-01T00:00:00.000Z',
    ...extra,
  };
}

function look(id: string, pecaIds: string[]): Look {
  return { id, pecaIds, resultadosProvador: [], usos: [], criadoEm: '', atualizadoEm: '' };
}

function dia(data: string, extra: Partial<DiaSemana> = {}): DiaSemana {
  return { data, compromissos: [], alternativasLookIds: [], pecasFixadasIds: [], ...extra };
}

const REGRAS: RegrasSemana = { repeticaoPermitida: true, pecasLavarEntreUsosIds: [], categoriasLavarEntreUsos: [] };

describe('agruparPecas', () => {
  it('agrupa na ordem da prancha e omite grupos vazios', () => {
    const g = agruparPecas([
      peca('s', { categoria: 'sapato' }),
      peca('c', { categoria: 'calca' }),
      peca('b', { categoria: 'blusa' }),
      peca('j', { categoria: 'joia_bijuteria' }),
    ]);
    expect(g.map((x) => x.rotulo)).toEqual(['Parte de cima', 'Parte de baixo', 'Calçado', 'Acessórios']);
  });
});

describe('avisosConforto', () => {
  it('avisa justa em cima e veste bem: não', () => {
    const a = avisosConforto([
      peca('1', { desconfortos: ['justa_em_cima'] }),
      peca('2', { vesteBem: 'nao' }),
      peca('3', { desconfortos: ['pinica'], vesteBem: 'talvez' }),
    ]);
    expect(a.map((x) => x.pecaId)).toEqual(['1', '2']);
  });
});

describe('datas', () => {
  it('conta dias e nomeia o dia', () => {
    expect(diferencaDias('2026-10-19', '2026-10-21')).toBe(2);
    expect(diferencaDias('2026-10-31', '2026-11-01')).toBe(1);
    expect(diaCurto('2026-10-19')).toBe('seg');
  });
});

describe('alertasSemana', () => {
  const looks = [look('L1', ['a', 'b']), look('L2', ['a', 'c'])];

  it('soma peças do look e fixadas', () => {
    const m = new Map(looks.map((l) => [l.id, l]));
    expect(pecasUsadasNoDia(dia('2026-10-19', { lookId: 'L1', pecasFixadasIds: ['b', 'x'] }), m)).toEqual(['a', 'b', 'x']);
  });

  it('sem alertas quando repetição é permitida e não há lavagem', () => {
    const r = alertasSemana(
      { dias: [dia('2026-10-19', { lookId: 'L1' }), dia('2026-10-20', { lookId: 'L2' })], regras: REGRAS },
      looks,
      [peca('a'), peca('b'), peca('c')],
    );
    expect(r).toEqual([]);
  });

  it('alerta repetição quando desligada', () => {
    const r = alertasSemana(
      { dias: [dia('2026-10-19', { lookId: 'L1' }), dia('2026-10-22', { lookId: 'L2' })], regras: { ...REGRAS, repeticaoPermitida: false } },
      looks,
      [peca('a'), peca('b'), peca('c')],
    );
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ dia: '2026-10-22', pecaId: 'a', tipo: 'repeticao', nivel: 'alerta' });
  });

  it('alerta intervalo mínimo', () => {
    const regras = { ...REGRAS, intervaloMinimoDias: 2 };
    const pecas = [peca('a'), peca('b'), peca('c')];
    const perto = alertasSemana({ dias: [dia('2026-10-19', { lookId: 'L1' }), dia('2026-10-21', { lookId: 'L2' })], regras }, looks, pecas);
    expect(perto.map((a) => a.tipo)).toEqual(['intervalo']);
    const longe = alertasSemana({ dias: [dia('2026-10-19', { lookId: 'L1' }), dia('2026-10-22', { lookId: 'L2' })], regras }, looks, pecas);
    expect(longe).toEqual([]);
  });

  it('lavagem entre usos: alerta em dias seguidos, lembrete com intervalo (por peça ou categoria)', () => {
    const pecas = [peca('a', { categoria: 'calca' }), peca('b'), peca('c')];
    const seguidos = alertasSemana(
      { dias: [dia('2026-10-19', { lookId: 'L1' }), dia('2026-10-20', { lookId: 'L2' })], regras: { ...REGRAS, categoriasLavarEntreUsos: ['calca'] } },
      looks,
      pecas,
    );
    expect(seguidos).toMatchObject([{ tipo: 'lavagem', nivel: 'alerta', pecaId: 'a' }]);
    const espacados = alertasSemana(
      { dias: [dia('2026-10-19', { lookId: 'L1' }), dia('2026-10-23', { lookId: 'L2' })], regras: { ...REGRAS, pecasLavarEntreUsosIds: ['a'] } },
      looks,
      pecas,
    );
    expect(espacados).toMatchObject([{ tipo: 'lavagem', nivel: 'info' }]);
  });

  it('alerta peça para lavar/indisponível só a partir de hoje', () => {
    const pecas = [peca('a', { disponibilidade: 'para_lavar' }), peca('b', { disponibilidade: 'emprestada' }), peca('c')];
    const r = alertasSemana(
      { dias: [dia('2026-10-19', { lookId: 'L1' }), dia('2026-10-23', { pecasFixadasIds: ['b'] })], regras: REGRAS },
      looks,
      pecas,
      '2026-10-20',
    );
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ dia: '2026-10-23', pecaId: 'b', tipo: 'indisponivel' });
  });
});
