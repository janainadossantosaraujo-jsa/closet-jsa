import { describe, expect, it } from 'vitest';
import { PREFERENCIA_NAO_JUSTA_EM_CIMA } from '../../db/schema';
import type { LinhaTabelaTamanhos, MedidaCorporal, PreferenciaFolgaRegiao } from '../../db/schema';
import { escolherTamanho, estimarCaimento, mapaMedidasCorpo } from './index';
import type { MedidaEntrada } from './index';

const AGORA = '2026-10-24T12:00:00.000Z';
const CORPO = { busto: 110, cintura: 96, quadril: 120, ombros: 40 };
const D25: PreferenciaFolgaRegiao[] = [{ ...PREFERENCIA_NAO_JUSTA_EM_CIMA, data: AGORA }];

function circ(regiao: MedidaEntrada['regiao'], valor: number): MedidaEntrada {
  return { regiao, valor, unidade: 'cm', tipo: 'circunferencia' };
}

function blusa(medidas: MedidaEntrada[], extra: Partial<Parameters<typeof estimarCaimento>[0]> = {}) {
  return estimarCaimento({
    corpo: CORPO,
    categoria: 'blusa',
    elasticidade: 'nenhuma',
    fonte: { tipo: 'medidas_peca', medidas },
    agora: AGORA,
    ...extra,
  });
}

describe('estimarCaimento', () => {
  it('peça confortável → nível alto', () => {
    const r = blusa([circ('busto', 118)]);
    expect(r.nivel).toBe('alto');
    expect(r.porMedida[0]).toMatchObject({ regiao: 'busto', folgaCm: 8, situacao: 'confortavel' });
    expect(r.porMedida[0].explicacao).toBe('Busto: 8 cm de folga — confortável');
    expect(r.explicacao).toContain('estimativa, não garantia');
    expect(r.calculadoEm).toBe(AGORA);
  });

  it('apertada no busto → nível baixo, sem compensar com outras regiões', () => {
    const r = blusa([circ('busto', 106), circ('cintura', 110)]);
    expect(r.nivel).toBe('baixo');
    const busto = r.porMedida.find((m) => m.regiao === 'busto')!;
    expect(busto.situacao).toBe('apertada');
    expect(busto.explicacao).toBe('Busto: 4 cm menor que o corpo — apertada');
    expect(r.explicacao).toContain('apertada no busto');
  });

  it('justa em cima: médio sem preferência, baixo com a preferência D25', () => {
    const semPref = blusa([circ('busto', 112)]);
    expect(semPref.porMedida[0].situacao).toBe('justa');
    expect(semPref.nivel).toBe('medio');

    const comPref = blusa([circ('busto', 112)], { preferencias: D25 });
    expect(comPref.porMedida[0].situacao).toBe('justa');
    expect(comPref.porMedida[0].evitarJusta).toBe(true);
    expect(comPref.nivel).toBe('baixo');
    expect(comPref.porMedida[0].explicacao).toContain('prefere evitar roupa justa');
  });

  it('D25 não afeta regiões fora da parte de cima', () => {
    const r = estimarCaimento({
      corpo: CORPO,
      categoria: 'calca',
      elasticidade: 'nenhuma',
      preferencias: D25,
      fonte: { tipo: 'medidas_peca', medidas: [circ('cintura', 97), circ('quadril', 126)] },
      agora: AGORA,
    });
    const cintura = r.porMedida.find((m) => m.regiao === 'cintura')!;
    expect(cintura.situacao).toBe('justa');
    expect(cintura.evitarJusta).toBe(false);
    expect(r.nivel).toBe('medio');
  });

  it('elasticidade alta tolera folga negativa', () => {
    const plano = blusa([circ('busto', 104)]);
    expect(plano.porMedida[0].situacao).toBe('apertada');

    const malha = blusa([circ('busto', 104)], { elasticidade: 'muita' });
    expect(malha.porMedida[0].situacao).toBe('justa');
    expect(malha.nivel).toBe('medio');

    const malhaFolga = blusa([circ('busto', 112)], { elasticidade: 'muita' });
    expect(malhaFolga.nivel).toBe('alto');
  });

  it('elasticidade não informada é tratada como nenhuma e avisada', () => {
    const r = blusa([circ('busto', 104)], { elasticidade: undefined });
    expect(r.elasticidadeConsiderada).toBe('nenhuma');
    expect(r.elasticidadeInformada).toBe(false);
    expect(r.nivel).toBe('baixo');
    expect(r.explicacao).toContain('Elasticidade não informada');
  });

  it('largura aberta ×2 (exceto ombros) e comprimento só informativo', () => {
    const r = blusa([
      { regiao: 'busto', valor: 59, unidade: 'cm', tipo: 'largura_aberta' },
      { regiao: 'ombros', valor: 41, unidade: 'cm', tipo: 'largura_aberta' },
      { regiao: 'comprimento', valor: 70, unidade: 'cm', tipo: 'linear' },
    ]);
    const busto = r.porMedida.find((m) => m.regiao === 'busto')!;
    expect(busto.medidaPecaCm).toBe(118);
    expect(busto.folgaCm).toBe(8);
    expect(busto.explicacao).toContain('largura aberta 59 cm × 2');
    const ombros = r.porMedida.find((m) => m.regiao === 'ombros')!;
    expect(ombros.medidaPecaCm).toBe(41);
    expect(ombros.situacao).toBe('confortavel');
    expect(r.porMedida.some((m) => m.regiao === 'comprimento')).toBe(false);
    expect(r.informativas).toHaveLength(1);
    expect(r.informativas[0].explicacao).toContain('só informativo');
    expect(r.nivel).toBe('alto');
  });

  it('tabela com medidas do corpo é tratada diferente de medidas da peça', () => {
    const linha: LinhaTabelaTamanhos = { tamanho: 'G', medidas: [circ('busto', 112)] };
    const base = { corpo: CORPO, categoria: 'blusa' as const, elasticidade: 'nenhuma' as const, agora: AGORA };

    const peca = estimarCaimento({ ...base, fonte: { tipo: 'tabela_peca', linha } });
    expect(peca.porMedida[0]).toMatchObject({ situacao: 'justa', folgaCm: 2, medidaPecaCm: 112 });
    expect(peca.nivel).toBe('medio');

    const corpo = estimarCaimento({ ...base, fonte: { tipo: 'tabela_corpo', linha } });
    expect(corpo.porMedida[0]).toMatchObject({
      situacao: 'confortavel',
      base: 'tabela_corpo',
      medidaTabelaCorpoCm: 112,
      diferencaCm: 2,
    });
    expect(corpo.porMedida[0].folgaCm).toBeUndefined();
    expect(corpo.porMedida[0].medidaPecaCm).toBeUndefined();
    expect(corpo.nivel).toBe('alto');
    expect(corpo.tamanho).toBe('G');
    expect(corpo.explicacao).toContain('tabela de medidas do corpo');

    const acima = estimarCaimento({ ...base, fonte: { tipo: 'tabela_corpo', linha: { tamanho: 'M', medidas: [circ('busto', 104)] } } });
    expect(acima.porMedida[0].situacao).toBe('apertada');
    expect(acima.porMedida[0].explicacao).toContain('sua medida passa 6 cm');
  });

  it('falta medida essencial → indeterminado', () => {
    const r = estimarCaimento({
      corpo: { busto: 110, quadril: 120 },
      categoria: 'calca',
      elasticidade: 'pouca',
      fonte: { tipo: 'medidas_peca', medidas: [circ('cintura', 100)] },
      agora: AGORA,
    });
    expect(r.nivel).toBe('indeterminado');
    expect(r.faltando).toEqual(['cintura', 'quadril']);
    expect(r.porMedida.find((m) => m.regiao === 'quadril')!.explicacao).toBe(
      'Sem medida de quadril da peça — não dá para estimar',
    );
    expect(r.porMedida.find((m) => m.regiao === 'cintura')!.explicacao).toBe(
      'Sem sua medida de cintura — não dá para estimar',
    );
    expect(r.explicacao).toContain('falta medida');

    const vestido = estimarCaimento({
      corpo: CORPO,
      categoria: 'vestido',
      fonte: { tipo: 'medidas_peca', medidas: [circ('busto', 120)] },
      agora: AGORA,
    });
    expect(vestido.nivel).toBe('indeterminado');
    expect(vestido.faltando).toEqual(['quadril']);
  });

  it('categoria sem medidas (calçado) → indeterminado sem faltantes', () => {
    const r = estimarCaimento({
      corpo: CORPO,
      categoria: 'sapato',
      fonte: { tipo: 'medidas_peca', medidas: [] },
      agora: AGORA,
    });
    expect(r.nivel).toBe('indeterminado');
    expect(r.faltando).toEqual([]);
  });

  it('usa o registro vigente das medidas corporais do banco', () => {
    const medidas: MedidaCorporal[] = [
      {
        regiao: 'busto',
        historico: [
          { id: 'a', valor: 110, unidade: 'cm', origem: 'conferido', data: '2026-01-01T00:00:00.000Z' },
          { id: 'b', valor: 100, unidade: 'cm', origem: 'estimado', data: '2026-10-01T00:00:00.000Z' },
        ],
        atualId: 'a',
        atualizadaEm: AGORA,
      },
    ];
    expect(mapaMedidasCorpo(medidas)).toEqual({ busto: 110 });
    const r = blusa([circ('busto', 118)], { corpo: medidas });
    expect(r.porMedida[0].folgaCm).toBe(8);
  });
});

describe('escolherTamanho', () => {
  const tabelaCorpo: LinhaTabelaTamanhos[] = [
    { tamanho: 'P', medidas: [circ('busto', 96)] },
    { tamanho: 'M', medidas: [circ('busto', 104)] },
    { tamanho: 'G', medidas: [circ('busto', 112)] },
    { tamanho: 'GG', medidas: [circ('busto', 120)] },
  ];

  it('indica o tamanho que tende a servir melhor numa tabela de corpo', () => {
    const r = escolherTamanho({
      corpo: CORPO,
      categoria: 'blusa',
      elasticidade: 'nenhuma',
      tabela: tabelaCorpo,
      tipoTabela: 'corpo',
      agora: AGORA,
    });
    expect(r.porTamanho.map((t) => [t.tamanho, t.resultado.nivel])).toEqual([
      ['P', 'baixo'],
      ['M', 'baixo'],
      ['G', 'alto'],
      ['GG', 'medio'],
    ]);
    expect(r.melhor).toBe('G');
    expect(r.nivelMelhor).toBe('alto');
    expect(r.explicacao).toContain('G');
  });

  it('com tabela de peça e preferência D25, evita o tamanho justo em cima', () => {
    const tabelaPeca: LinhaTabelaTamanhos[] = [
      { tamanho: 'G', medidas: [circ('busto', 112)] },
      { tamanho: 'GG', medidas: [circ('busto', 118)] },
      { tamanho: 'XG', medidas: [circ('busto', 126)] },
    ];
    const r = escolherTamanho({
      corpo: CORPO,
      categoria: 'blusa',
      elasticidade: 'nenhuma',
      preferencias: D25,
      tabela: tabelaPeca,
      tipoTabela: 'peca',
      agora: AGORA,
    });
    expect(r.porTamanho[0].resultado.nivel).toBe('baixo');
    expect(r.porTamanho[1].resultado.nivel).toBe('alto');
    expect(r.porTamanho[2].resultado.porMedida[0].situacao).toBe('folgada');
    expect(r.porTamanho[2].resultado.nivel).toBe('medio');
    expect(r.melhor).toBe('GG');
  });

  it('sem medidas suficientes → nenhum tamanho indicado', () => {
    const r = escolherTamanho({
      corpo: { cintura: 96 },
      categoria: 'blusa',
      tabela: tabelaCorpo,
      tipoTabela: 'corpo',
      agora: AGORA,
    });
    expect(r.melhor).toBeUndefined();
    expect(r.nivelMelhor).toBe('indeterminado');
  });

  it('quando todos são baixos, não indica "melhor" mas aponta o menos problemático', () => {
    const r = escolherTamanho({
      corpo: CORPO,
      categoria: 'blusa',
      elasticidade: 'nenhuma',
      tabela: tabelaCorpo.slice(0, 2),
      tipoTabela: 'corpo',
      agora: AGORA,
    });
    expect(r.melhor).toBeUndefined();
    expect(r.nivelMelhor).toBe('baixo');
    expect(r.menosProblematico).toBe('M');
  });
});
