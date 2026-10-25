/**
 * Limiares da estimativa de caimento (B15, D24).
 *
 * IMPORTANTE: são uma HEURÍSTICA INICIAL, simples e conservadora, para ser calibrada
 * com o feedback real de conforto das peças do closet (D16, D24). O resultado é sempre
 * uma estimativa, não uma garantia. Valores em centímetros.
 *
 * Como ler: para cada região, calcula-se uma diferença (folga ou margem) e ela é
 * classificada assim:
 *   diferença <  apertadaAbaixoDe                → apertada
 *   apertadaAbaixoDe ≤ diferença < justaAbaixoDe → justa
 *   justaAbaixoDe ≤ diferença < folgadaAPartirDe → confortável
 *   diferença ≥ folgadaAPartirDe                 → folgada
 */

import type { Elasticidade, PreferenciaFolga, RegiaoMedida } from '../../db/schema';

export interface LimiaresFolga {
  apertadaAbaixoDe: number;
  justaAbaixoDe: number;
  folgadaAPartirDe: number;
}

/**
 * Folga de circunferência da PEÇA (medida da peça − medida do corpo), por elasticidade.
 * - nenhuma: tecido plano; qualquer folga negativa aperta; menos de 4 cm fica justa.
 * - pouca: algum elastano; tolera até 2 cm a menos que o corpo (ainda justa).
 * - muita: malha/elástico; tolera até 8 cm a menos que o corpo, mas abaixo de 0 já "abraça"
 *   o corpo (justa) — o que importa para a preferência D25.
 */
export const LIMIARES_FOLGA_PECA: Readonly<Record<Elasticidade, LimiaresFolga>> = {
  nenhuma: { apertadaAbaixoDe: 0, justaAbaixoDe: 4, folgadaAPartirDe: 14 },
  pouca: { apertadaAbaixoDe: -2, justaAbaixoDe: 2, folgadaAPartirDe: 12 },
  muita: { apertadaAbaixoDe: -8, justaAbaixoDe: 0, folgadaAPartirDe: 10 },
};

/**
 * Ajuste por região aplicado aos limites de "justa" e "folgada" (o limite de "apertada"
 * não muda). Cintura de cós normalmente leva pouca folga; braço, coxa, panturrilha e
 * pescoço também pedem menos folga que busto/quadril.
 */
export const AJUSTE_LIMIAR_POR_REGIAO: Readonly<Partial<Record<RegiaoMedida, { justa: number; folgada: number }>>> = {
  cintura: { justa: -2, folgada: -6 },
  braco: { justa: -1, folgada: -6 },
  coxa: { justa: -1, folgada: -6 },
  panturrilha: { justa: -1, folgada: -6 },
  pescoco: { justa: -1, folgada: -6 },
};

/**
 * Ombros: comparação de LARGURA (peça − corpo, de ponta a ponta do ombro), não de
 * circunferência. Largura aberta de ombro não é multiplicada por 2.
 */
export const LIMIARES_OMBROS: Readonly<Record<Elasticidade, LimiaresFolga>> = {
  nenhuma: { apertadaAbaixoDe: -1, justaAbaixoDe: 1, folgadaAPartirDe: 5 },
  pouca: { apertadaAbaixoDe: -2, justaAbaixoDe: 0, folgadaAPartirDe: 5 },
  muita: { apertadaAbaixoDe: -4, justaAbaixoDe: -1, folgadaAPartirDe: 5 },
};

/**
 * Tabela de medidas do CORPO da loja: a diferença é (medida recomendada para o tamanho −
 * sua medida). A loja já embutiu a folga da modelagem, então estar igual ou abaixo da
 * medida da tabela conta como confortável; passar da medida da tabela fica justa e,
 * passando mais, apertada. Muito abaixo indica que o tamanho tende a ficar grande.
 */
export const LIMIARES_TABELA_CORPO: Readonly<Record<Elasticidade, LimiaresFolga>> = {
  nenhuma: { apertadaAbaixoDe: -2, justaAbaixoDe: 0, folgadaAPartirDe: 6 },
  pouca: { apertadaAbaixoDe: -3, justaAbaixoDe: -1, folgadaAPartirDe: 6 },
  muita: { apertadaAbaixoDe: -5, justaAbaixoDe: -2, folgadaAPartirDe: 7 },
};

/**
 * Deslocamento dos limites de "justa" e "folgada" conforme a preferência de folga da
 * região: quem prefere solta precisa de mais folga para achar confortável (e tolera mais
 * folga antes de achar folgada); quem prefere justa, o contrário.
 */
export const DESLOCAMENTO_PREFERENCIA: Readonly<Record<PreferenciaFolga, { justa: number; folgada: number }>> = {
  justa: { justa: -2, folgada: -2 },
  ajustada: { justa: -1, folgada: -1 },
  confortavel: { justa: 0, folgada: 0 },
  solta: { justa: 2, folgada: 4 },
  bem_solta: { justa: 4, folgada: 8 },
};

/** Elasticidade usada quando não informada: a mais conservadora. */
export const ELASTICIDADE_PADRAO: Elasticidade = 'nenhuma';
