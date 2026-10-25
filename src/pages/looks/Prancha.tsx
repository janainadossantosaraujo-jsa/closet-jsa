import { Link } from 'react-router-dom';
import { MiniaturaMidia } from '../../components';
import type { ID, Peca } from '../../db/schema';
import { agruparPecas, estaDisponivel, motivosConforto, rotuloDisponibilidade } from './regras';
import './looks.css';

export interface PranchaProps {
  pecas: Peca[];
  /** Mostra botão de remover em cada peça (editor). */
  aoRemover?: (id: ID) => void;
  /** Links para a peça no Closet (padrão: quando não há aoRemover). */
  links?: boolean;
}

/** Etiqueta de disponibilidade (só quando a peça não está disponível). */
export function EtiquetaDisponibilidade({ peca }: { peca: Peca }) {
  if (estaDisponivel(peca)) return null;
  return <span className="lk-etiqueta lk-etiqueta-indisponivel">{rotuloDisponibilidade(peca)}</span>;
}

/** Prancha do look: fotos originais das peças agrupadas (cima, baixo, peça única, calçado, acessórios). */
export function Prancha({ pecas, aoRemover, links = !aoRemover }: PranchaProps) {
  const grupos = agruparPecas(pecas);
  if (!grupos.length) {
    return <div className="lk-prancha lk-prancha-vazia texto-suave">Nenhuma peça ainda.</div>;
  }
  return (
    <div className="lk-prancha">
      {grupos.map((g) => (
        <section key={g.grupo} className="lk-prancha-grupo" aria-label={g.rotulo}>
          <h3>{g.rotulo}</h3>
          <div className="lk-prancha-itens">
            {g.pecas.map((p) => {
              const conforto = motivosConforto(p);
              const foto = (
                <MiniaturaMidia
                  midiaId={p.midiaIds[0]}
                  original
                  alt={p.nome}
                  className={`lk-prancha-foto${estaDisponivel(p) ? '' : ' lk-esmaecida'}`}
                />
              );
              return (
                <figure key={p.id} className="lk-prancha-item">
                  {links ? (
                    <Link to={`/peca/${p.id}`} aria-label={`Abrir ${p.nome} no closet`}>
                      {foto}
                    </Link>
                  ) : (
                    foto
                  )}
                  <figcaption>
                    <span className="lk-prancha-nome">{p.nome}</span>
                    <EtiquetaDisponibilidade peca={p} />
                    {conforto.length > 0 && (
                      <span className="lk-etiqueta lk-etiqueta-conforto" title={conforto.join('; ')}>
                        ⚠ {conforto.join('; ')}
                      </span>
                    )}
                  </figcaption>
                  {aoRemover && (
                    <button
                      type="button"
                      className="lk-prancha-remover"
                      aria-label={`Tirar ${p.nome} do look`}
                      onClick={() => aoRemover(p.id)}
                    >
                      ×
                    </button>
                  )}
                </figure>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
