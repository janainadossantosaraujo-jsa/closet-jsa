import { MiniaturaMidia } from '../../components';
import type { Peca } from '../../db/schema';
import { agruparPecas } from './regras';
import './looks.css';

/** Mosaico com as miniaturas das peças (até 4, na ordem da prancha). */
export function MosaicoLook({ pecas, pequeno }: { pecas: Peca[]; pequeno?: boolean }) {
  const ordenadas = agruparPecas(pecas).flatMap((g) => g.pecas);
  const visiveis = ordenadas.slice(0, 4);
  const resto = ordenadas.length - visiveis.length;
  return (
    <div className={`lk-mosaico lk-mosaico-${Math.max(1, visiveis.length)}${pequeno ? ' lk-mosaico-pequeno' : ''}`} aria-hidden="true">
      {visiveis.length === 0 && <div className="miniatura miniatura-vazia">—</div>}
      {visiveis.map((p, i) => (
        <div key={p.id} className="lk-mosaico-celula">
          <MiniaturaMidia midiaId={p.midiaIds[0]} alt="" vazio={p.nome.slice(0, 12)} />
          {i === visiveis.length - 1 && resto > 0 && <span className="lk-mosaico-mais">+{resto}</span>}
        </div>
      ))}
    </div>
  );
}
