import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Botao, Cabecalho, Selecao } from '../../components';
import { useLooks } from '../../db/hooks';
import { OCASIOES, type Ocasiao } from '../../db/schema';
import { nomeDoLook, pecasDoLook, rotuloOcasiao, usePecasMapa } from './dados';
import { MosaicoLook } from './MosaicoLook';
import { avisosConforto, estaDisponivel } from './regras';

export function ListaLooks() {
  const navegar = useNavigate();
  const [ocasiao, setOcasiao] = useState<Ocasiao | undefined>();
  const looks = useLooks({ ocasiao });
  const pecas = usePecasMapa();

  return (
    <>
      <Cabecalho titulo="Looks" acoes={<Botao onClick={() => navegar('/looks/novo')}>+ Novo</Botao>} />
      <Selecao rotulo="Ocasião" opcoes={OCASIOES} valor={ocasiao} aoMudar={setOcasiao} vazio="Todas as ocasiões" />

      {(!looks || !pecas) && <p className="texto-suave">Carregando…</p>}
      {looks && pecas && looks.length === 0 && (
        <div className="placeholder">
          <p>{ocasiao ? 'Nenhum look para essa ocasião.' : 'Você ainda não montou nenhum look.'}</p>
          <Botao onClick={() => navegar('/looks/novo')}>Montar o primeiro look</Botao>
        </div>
      )}

      {looks && pecas && (
        <ul className="lk-lista">
          {looks.map((l) => {
            const ps = pecasDoLook(l, pecas);
            const conforto = avisosConforto(ps).length > 0;
            const indisp = ps.filter((p) => !estaDisponivel(p)).length;
            return (
              <li key={l.id}>
                <Link to={`/looks/${l.id}`} className="lk-cartao-look">
                  <MosaicoLook pecas={ps} />
                  <span className="lk-cartao-texto">
                    <strong>{nomeDoLook(l, pecas)}</strong>
                    <span className="texto-suave">
                      {[rotuloOcasiao(l), `${ps.length} peça${ps.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
                    </span>
                    {l.usos.length > 0 && (
                      <span className="texto-suave">
                        Usado {l.usos.length}× {l.usos.some((u) => u.feedbacks.includes('gostei')) ? '· gostei' : ''}
                      </span>
                    )}
                    <span className="linha">
                      {conforto && <span className="lk-etiqueta lk-etiqueta-conforto">⚠ conforto</span>}
                      {indisp > 0 && <span className="lk-etiqueta lk-etiqueta-indisponivel">{indisp} indisponíve{indisp === 1 ? 'l' : 'is'}</span>}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
