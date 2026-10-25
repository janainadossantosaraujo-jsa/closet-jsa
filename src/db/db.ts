import Dexie, { type EntityTable } from 'dexie';
import type {
  CompraCandidata,
  Look,
  MedidaCorporal,
  Meta,
  Midia,
  MidiaCorpo,
  Peca,
  Perfil,
  Semana,
} from './schema';

/**
 * Banco local (IndexedDB) do Closet JSA. Todos os dados ficam só no aparelho.
 * Fotos do corpo ficam em `midiasCorpo`, separadas das fotos de peças (`midias`).
 *
 * Para mudar índices, crie `this.version(2).stores({...})` mantendo a versão 1.
 */
export class ClosetDB extends Dexie {
  pecas!: EntityTable<Peca, 'id'>;
  midias!: EntityTable<Midia, 'id'>;
  midiasCorpo!: EntityTable<MidiaCorpo, 'id'>;
  looks!: EntityTable<Look, 'id'>;
  semanas!: EntityTable<Semana, 'id'>;
  perfil!: EntityTable<Perfil, 'id'>;
  medidasCorporais!: EntityTable<MedidaCorporal, 'regiao'>;
  compras!: EntityTable<CompraCandidata, 'id'>;
  meta!: EntityTable<Meta, 'chave'>;

  constructor(nome = 'closet-jsa') {
    super(nome);
    this.version(1).stores({
      pecas: 'id, categoria, disponibilidade, nome, vesteBem, criadaEm, atualizadaEm, *ocasioes, *desconfortos',
      midias: 'id, donoId, [donoTipo+donoId], tipo, criadaEm',
      midiasCorpo: 'id, perfilId, tipo, criadaEm',
      looks: 'id, ocasiao, criadoEm, atualizadoEm, *pecaIds',
      semanas: 'id, &inicio',
      perfil: 'id',
      medidasCorporais: 'regiao',
      compras: 'id, situacao, loja, criadaEm',
      meta: 'chave',
    });
  }
}

export const db = new ClosetDB();
