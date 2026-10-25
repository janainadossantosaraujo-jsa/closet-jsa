import type { RegiaoMedida } from '../../db/schema';

/** Dica geral, mostrada em todas as regiões. */
export const DICA_GERAL =
  'Use fita métrica de costura, rente ao corpo sem apertar, e respire normalmente. Se puder, peça ajuda e use as roupas íntimas de costume.';

/** Ajuda curta de "como medir" para cada região (texto simples). */
export const COMO_MEDIR: Readonly<Record<RegiaoMedida, string>> = {
  busto: 'Passe a fita em volta da parte mais cheia do busto, reta nas costas, com o sutiã que você costuma usar.',
  ombros: 'Pelas costas, de uma ponta do ombro até a outra (onde o ombro "dobra" para o braço).',
  braco: 'Volta na parte mais larga do braço, entre o ombro e o cotovelo, com o braço relaxado.',
  cava: 'Volta em torno do ombro, passando por baixo da axila, como o contorno da manga de uma blusa.',
  cintura:
    'Volta na linha onde você gosta de usar o cós (ou onde o tronco dobra de lado). Anote na observação qual ponto escolheu.',
  barriga: 'Volta na parte mais cheia da barriga, em geral na altura do umbigo, em pé e relaxada.',
  quadril: 'Com os pés juntos, volta na parte mais cheia do quadril e do bumbum.',
  coxa: 'Volta na parte mais cheia da coxa, perto da virilha.',
  panturrilha: 'Volta na parte mais cheia da panturrilha, em pé.',
  comprimento:
    'Do ponto mais alto do ombro, perto do pescoço, descendo pela frente até onde você gosta que a peça termine.',
  comprimento_manga: 'Da ponta do ombro até o punho, com o braço levemente dobrado.',
  entrepernas: 'Descalça, da virilha (parte interna da coxa) até o chão ou até onde quer a barra da calça.',
  gancho: 'Da cintura na frente, passando entre as pernas, até a cintura atrás.',
  barra: 'Volta da perna na altura onde você quer a barra (ex.: tornozelo), para comparar com a boca da calça.',
  pescoco: 'Volta na base do pescoço, deixando um dedo de folga entre a fita e a pele.',
  altura: 'Descalça, encostada na parede, do chão até o topo da cabeça (marque com um livro reto).',
  pe: 'Em pé sobre um papel, marque o calcanhar e a ponta do dedo mais comprido e meça a distância.',
};
