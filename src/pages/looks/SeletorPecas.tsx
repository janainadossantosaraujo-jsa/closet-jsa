import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Botao, CampoTexto, MiniaturaMidia, Selecao } from '../../components';
import { usePecas } from '../../db/hooks';
import { filtrarPecas } from '../../db/repo';
import { CATEGORIAS, type Categoria, type ID } from '../../db/schema';
import { Folha } from './Folha';
import { EtiquetaDisponibilidade } from './Prancha';
import { estaDisponivel, motivosConforto } from './regras';
import './looks.css';

export interface SeletorPecasProps {
  aberto: boolean;
  titulo?: string;
  /** IDs já escolhidos ao abrir. */
  selecionadas: readonly ID[];
  aoConfirmar: (ids: ID[]) => void;
  aoFechar: () => void;
}

/** Escolha de várias peças do closet, com busca e filtro por categoria. Indica as indisponíveis. */
export function SeletorPecas({ aberto, titulo = 'Escolher peças', selecionadas, aoConfirmar, aoFechar }: SeletorPecasProps) {
  const todas = usePecas();
  const [marcadas, setMarcadas] = useState<ID[]>([...selecionadas]);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<Categoria | undefined>();
  const [soDisponiveis, setSoDisponiveis] = useState(false);

  useEffect(() => {
    if (aberto) setMarcadas([...selecionadas]);
    // reinicia só ao abrir (não a cada mudança de `selecionadas`)
  }, [aberto]);

  const lista = useMemo(
    () =>
      todas
        ? filtrarPecas(todas, {
            busca,
            categoria,
            disponibilidade: soDisponiveis ? 'disponivel' : undefined,
          })
        : undefined,
    [todas, busca, categoria, soDisponiveis],
  );

  function alternar(id: ID) {
    setMarcadas((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  }

  return (
    <Folha
      aberto={aberto}
      titulo={titulo}
      aoFechar={aoFechar}
      rodape={
        <div className="lk-rodape-botoes">
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao onClick={() => aoConfirmar(marcadas.filter((id) => todas?.some((p) => p.id === id)))}>
            Confirmar ({marcadas.length})
          </Botao>
        </div>
      }
    >
      <CampoTexto rotulo="Buscar" type="search" valor={busca} aoMudar={setBusca} placeholder="nome, cor, tecido, marca…" />
      <Selecao rotulo="Categoria" opcoes={CATEGORIAS} valor={categoria} aoMudar={setCategoria} vazio="Todas as categorias" />
      <label className="lk-alternar">
        <input type="checkbox" checked={soDisponiveis} onChange={(e) => setSoDisponiveis(e.target.checked)} />
        Mostrar só as disponíveis
      </label>

      {lista === undefined && <p className="texto-suave">Carregando…</p>}
      {todas?.length === 0 && (
        <div className="placeholder">
          <p>O closet ainda está vazio.</p>
          <Link to="/">Cadastrar peças no Closet</Link>
        </div>
      )}
      {todas && todas.length > 0 && lista?.length === 0 && <p className="texto-suave">Nenhuma peça encontrada com esse filtro.</p>}

      <div className="lk-seletor-grade">
        {lista?.map((p) => {
          const marcada = marcadas.includes(p.id);
          const conforto = motivosConforto(p).length > 0;
          return (
            <button
              key={p.id}
              type="button"
              className="lk-seletor-item"
              aria-pressed={marcada}
              aria-label={[p.nome, estaDisponivel(p) ? '' : `(${p.disponibilidade === 'para_lavar' ? 'para lavar' : 'indisponível'})`, conforto ? '— aviso de conforto' : ''].filter(Boolean).join(' ')}
              onClick={() => alternar(p.id)}
            >
              <MiniaturaMidia midiaId={p.midiaIds[0]} alt="" className={estaDisponivel(p) ? '' : 'lk-esmaecida'} />
              {marcada && <span className="lk-seletor-marca" aria-hidden="true">✓</span>}
              <span className="lk-seletor-nome">
                {conforto && <span title="Aviso de conforto">⚠ </span>}
                {p.nome}
              </span>
              <EtiquetaDisponibilidade peca={p} />
            </button>
          );
        })}
      </div>
    </Folha>
  );
}
