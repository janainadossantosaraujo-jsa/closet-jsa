import { describe, expect, it } from 'vitest';
import type { MedidaPeca, Peca } from '../../db/schema';
import {
  aplicarFiltros,
  contarFiltrosAtivos,
  dadosDoForm,
  FILTROS_VAZIOS,
  formDePeca,
  formVazio,
  medidasDoForm,
  mover,
  SEM_AVALIACAO,
  SEM_LOCALIZACAO,
  semIndefinidos,
  sugestoesPara,
  tipoFotoPadrao,
  tipoMedidaPadrao,
  validarForm,
  valoresUsados,
  voltaDaLarguraAberta,
} from './util';

let n = 0;
function peca(p: Partial<Peca>): Peca {
  n += 1;
  return {
    id: `p${n}`,
    nome: `Peça ${n}`,
    categoria: 'blusa',
    midiaIds: [],
    medidas: [],
    ocasioes: [],
    estacoes: [],
    desconfortos: [],
    disponibilidade: 'disponivel',
    criadaEm: `2026-10-${String(n).padStart(2, '0')}T10:00:00.000Z`,
    atualizadaEm: `2026-10-${String(n).padStart(2, '0')}T10:00:00.000Z`,
    ...p,
  };
}

describe('filtros do closet', () => {
  const pecas = [
    peca({ nome: 'Blusa de Algodão', vesteBem: 'sim', localizacao: 'Armário do quarto', ocasioes: ['trabalho'] }),
    peca({ nome: 'Calça preta', categoria: 'calca', vesteBem: 'nao', disponibilidade: 'para_lavar', localizacao: 'armario do quarto' }),
    peca({ nome: 'Vestido floral', categoria: 'vestido', favorita: true }),
  ];

  it('busca sem acento', () => {
    expect(aplicarFiltros(pecas, { ...FILTROS_VAZIOS, busca: 'algodao' }).map((p) => p.nome)).toEqual(['Blusa de Algodão']);
  });

  it('filtra por veste bem, inclusive sem avaliação', () => {
    expect(aplicarFiltros(pecas, { ...FILTROS_VAZIOS, vesteBem: 'sim' })).toHaveLength(1);
    expect(aplicarFiltros(pecas, { ...FILTROS_VAZIOS, vesteBem: SEM_AVALIACAO }).map((p) => p.nome)).toEqual(['Vestido floral']);
  });

  it('filtra por localização ignorando acento e maiúsculas, e sem localização', () => {
    expect(aplicarFiltros(pecas, { ...FILTROS_VAZIOS, localizacao: 'Armário do Quarto' })).toHaveLength(2);
    expect(aplicarFiltros(pecas, { ...FILTROS_VAZIOS, localizacao: SEM_LOCALIZACAO })).toHaveLength(1);
  });

  it('combina categoria, disponibilidade, ocasião e favoritas', () => {
    expect(aplicarFiltros(pecas, { ...FILTROS_VAZIOS, categorias: ['calca', 'vestido'] })).toHaveLength(2);
    expect(aplicarFiltros(pecas, { ...FILTROS_VAZIOS, disponibilidades: ['para_lavar'] })[0].nome).toBe('Calça preta');
    expect(aplicarFiltros(pecas, { ...FILTROS_VAZIOS, ocasiao: 'trabalho' })).toHaveLength(1);
    expect(aplicarFiltros(pecas, { ...FILTROS_VAZIOS, somenteFavoritas: true })).toHaveLength(1);
  });

  it('conta filtros ativos (sem a busca)', () => {
    expect(contarFiltrosAtivos({ ...FILTROS_VAZIOS, busca: 'x' })).toBe(0);
    expect(contarFiltrosAtivos({ ...FILTROS_VAZIOS, categorias: ['blusa', 'saia'], vesteBem: 'sim' })).toBe(2);
  });
});

describe('sugestões', () => {
  it('agrupa variações de acento e ordena por uso', () => {
    const ps = [
      peca({ localizacao: 'Gaveta 2' }),
      peca({ localizacao: 'armario' }),
      peca({ localizacao: 'Armário' }),
      peca({ localizacao: '  ' }),
    ];
    expect(valoresUsados(ps, (p) => p.localizacao)).toEqual(['Armário', 'Gaveta 2']);
  });

  it('filtra pelo texto digitado sem repetir o próprio texto', () => {
    expect(sugestoesPara('arm', ['Armário', 'Gaveta'])).toEqual(['Armário']);
    expect(sugestoesPara('armario', ['Armário', 'Gaveta'])).toEqual([]);
    expect(sugestoesPara('', ['A', 'B'])).toEqual(['A', 'B']);
  });
});

describe('fotos e medidas', () => {
  it('tipo de foto padrão pela posição', () => {
    expect([0, 1, 2, 3].map(tipoFotoPadrao)).toEqual(['frente', 'costas', 'detalhe', 'detalhe']);
  });

  it('move itens', () => {
    expect(mover(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(mover(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
  });

  it('tipo de medida padrão e volta da largura aberta', () => {
    expect(tipoMedidaPadrao('comprimento')).toBe('linear');
    expect(tipoMedidaPadrao('busto')).toBe('largura_aberta');
    expect(voltaDaLarguraAberta(52.5)).toBe(105);
  });

  it('descarta linhas incompletas e preserva a data das medidas não alteradas', () => {
    const anterior: MedidaPeca = {
      id: 'm1', regiao: 'busto', valor: 50, unidade: 'cm', tipo: 'largura_aberta', origem: 'conferido', data: '2026-01-01T00:00:00.000Z',
    };
    const r = medidasDoForm(
      [
        { id: 'm1', regiao: 'busto', valor: 50, tipo: 'largura_aberta', origem: 'conferido', observacao: '' },
        { id: 'm2', regiao: 'cintura', valor: undefined, tipo: 'largura_aberta', origem: 'conferido', observacao: '' },
        { id: 'm3', valor: 30, tipo: 'linear', origem: 'estimado', observacao: '' },
        { id: 'm4', regiao: 'comprimento', valor: 70, tipo: 'linear', origem: 'estimado', observacao: ' bainha ' },
      ],
      [anterior],
    );
    expect(r.map((m) => m.id)).toEqual(['m1', 'm4']);
    expect(r[0].data).toBe(anterior.data);
    expect(r[1].observacao).toBe('bainha');
    expect(r[1].unidade).toBe('cm');
  });

  it('atualiza a data quando a medida muda', () => {
    const anterior: MedidaPeca = {
      id: 'm1', regiao: 'busto', valor: 50, unidade: 'cm', tipo: 'largura_aberta', origem: 'conferido', data: '2026-01-01T00:00:00.000Z',
    };
    const r = medidasDoForm([{ id: 'm1', regiao: 'busto', valor: 51, tipo: 'largura_aberta', origem: 'conferido', observacao: '' }], [anterior]);
    expect(r[0].data).not.toBe(anterior.data);
  });
});

describe('formulário', () => {
  it('exige nome e categoria', () => {
    expect(validarForm(formVazio())).toEqual({ nome: expect.any(String), categoria: expect.any(String) });
    expect(validarForm({ ...formVazio(), nome: 'Blusa', categoria: 'blusa' })).toEqual({});
  });

  it('textos vazios viram undefined e são removidos na criação', () => {
    const d = semIndefinidos(dadosDoForm({ ...formVazio(), nome: '  Blusa  ', categoria: 'blusa', cor: ' ', localizacao: 'Gaveta' }));
    expect(d.nome).toBe('Blusa');
    expect('cor' in d).toBe(false);
    expect('favorita' in d).toBe(false);
    expect(d.localizacao).toBe('Gaveta');
    expect(d.disponibilidade).toBe('disponivel');
  });

  it('ida e volta peça → formulário → dados mantém os campos', () => {
    const p = peca({
      cor: 'azul', elasticidade: 'pouca', vesteBem: 'talvez', desconfortos: ['justa_em_cima'], ocasioes: ['lazer'], favorita: true,
      medidas: [{ id: 'x', regiao: 'quadril', valor: 60, unidade: 'cm', tipo: 'largura_aberta', origem: 'informado', data: '2026-02-02T00:00:00.000Z' }],
    });
    const d = dadosDoForm(formDePeca(p), p.medidas);
    expect(d).toMatchObject({
      nome: p.nome, categoria: 'blusa', cor: 'azul', elasticidade: 'pouca', vesteBem: 'talvez',
      desconfortos: ['justa_em_cima'], ocasioes: ['lazer'], favorita: true, medidas: p.medidas,
    });
  });
});
