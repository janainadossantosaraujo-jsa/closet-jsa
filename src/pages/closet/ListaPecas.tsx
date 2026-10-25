import { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Botao, Cabecalho, Chips, MiniaturaMidia } from '../../components';
import { usePecas } from '../../db/hooks';
import {
  CATEGORIAS,
  DISPONIBILIDADES,
  OCASIOES,
  VESTE_BEM,
  rotuloDe,
  type Opcao,
  type Peca,
  type VesteBem,
} from '../../db/schema';
import {
  aplicarFiltros,
  contarFiltrosAtivos,
  FILTROS_VAZIOS,
  SEM_AVALIACAO,
  SEM_LOCALIZACAO,
  valoresUsados,
  type FiltrosCloset,
} from './util';

const CHAVE_FILTROS = 'closet.filtros';

const OPCOES_VESTE_BEM: readonly Opcao<VesteBem | typeof SEM_AVALIACAO>[] = [
  ...VESTE_BEM,
  { valor: SEM_AVALIACAO, rotulo: 'Sem avaliação' },
];

function lerFiltros(): FiltrosCloset {
  try {
    const t = sessionStorage.getItem(CHAVE_FILTROS);
    if (t) return { ...FILTROS_VAZIOS, ...(JSON.parse(t) as Partial<FiltrosCloset>) };
  } catch {
    /* sem armazenamento: começa limpo */
  }
  return FILTROS_VAZIOS;
}

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
}

/** Lista de peças em grade, com busca e filtros (B3, B5, B6). */
export function ListaPecas() {
  const pecas = usePecas();
  const [filtros, setFiltros] = useState<FiltrosCloset>(lerFiltros);
  const [mostrarFiltros, setMostrarFiltros] = useState(() => contarFiltrosAtivos(lerFiltros()) > 0);
  const idBusca = useId();
  const idLocal = useId();

  useEffect(() => {
    try {
      sessionStorage.setItem(CHAVE_FILTROS, JSON.stringify(filtros));
    } catch {
      /* ignora */
    }
  }, [filtros]);

  const localizacoes = useMemo(() => valoresUsados(pecas ?? [], (p) => p.localizacao), [pecas]);
  const visiveis = useMemo(() => aplicarFiltros(pecas ?? [], filtros), [pecas, filtros]);
  const ativos = contarFiltrosAtivos(filtros);
  const mudar = (parcial: Partial<FiltrosCloset>) => setFiltros((f) => ({ ...f, ...parcial }));

  const total = pecas?.length ?? 0;
  const filtrando = ativos > 0 || filtros.busca.trim() !== '';

  return (
    <div className="closet-lista">
      <Cabecalho titulo="Closet" />

      {pecas === undefined ? (
        <p className="texto-suave">Carregando…</p>
      ) : total === 0 ? (
        <div className="placeholder">
          <p>Seu closet ainda está vazio.</p>
          <p>Toque em <strong>Nova peça</strong> e comece pelas fotos.</p>
        </div>
      ) : (
        <>
          <div className="closet-busca">
            <label htmlFor={idBusca} className="so-leitor">Buscar peças</label>
            <input
              id={idBusca}
              type="search"
              inputMode="search"
              enterKeyHint="search"
              placeholder="Buscar (nome, cor, tecido, marca, lugar…)"
              value={filtros.busca}
              onChange={(e) => mudar({ busca: e.target.value })}
            />
            <button
              type="button"
              className="closet-botao-filtros"
              aria-expanded={mostrarFiltros}
              onClick={() => setMostrarFiltros((v) => !v)}
            >
              Filtros{ativos > 0 && <span className="closet-contador">{ativos}</span>}
            </button>
          </div>

          {mostrarFiltros && (
            <div className="closet-filtros cartao">
              <Chips
                rotulo="Categoria"
                opcoes={CATEGORIAS}
                valor={filtros.categorias}
                aoMudar={(categorias) => mudar({ categorias })}
              />
              <Chips
                rotulo="Ocasião"
                opcoes={OCASIOES}
                unico
                valor={filtros.ocasiao ? [filtros.ocasiao] : []}
                aoMudar={(v) => mudar({ ocasiao: v[0] })}
              />
              <Chips
                rotulo="Disponibilidade"
                opcoes={DISPONIBILIDADES}
                valor={filtros.disponibilidades}
                aoMudar={(disponibilidades) => mudar({ disponibilidades })}
              />
              <Chips
                rotulo="Veste bem?"
                opcoes={OPCOES_VESTE_BEM}
                unico
                valor={filtros.vesteBem ? [filtros.vesteBem] : []}
                aoMudar={(v) => mudar({ vesteBem: v[0] })}
              />
              <div className="campo">
                <label className="campo-rotulo" htmlFor={idLocal}>Localização</label>
                <select
                  id={idLocal}
                  value={filtros.localizacao ?? ''}
                  onChange={(e) => mudar({ localizacao: e.target.value || undefined })}
                >
                  <option value="">Qualquer lugar</option>
                  {localizacoes.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                  <option value={SEM_LOCALIZACAO}>Sem localização</option>
                </select>
              </div>
              <Chips
                rotulo="Outros"
                opcoes={[{ valor: 'favoritas', rotulo: '★ Só favoritas' }] as const}
                valor={filtros.somenteFavoritas ? ['favoritas'] : []}
                aoMudar={(v) => mudar({ somenteFavoritas: v.length > 0 })}
              />
              <div className="linha">
                <Botao variante="secundario" onClick={() => setFiltros({ ...FILTROS_VAZIOS, busca: filtros.busca })} disabled={!ativos}>
                  Limpar filtros
                </Botao>
                <Botao variante="fantasma" onClick={() => setMostrarFiltros(false)}>
                  Fechar
                </Botao>
              </div>
            </div>
          )}

          <p className="closet-contagem texto-suave" aria-live="polite">
            {filtrando
              ? `${plural(visiveis.length, 'peça encontrada', 'peças encontradas')} de ${total}`
              : plural(total, 'peça', 'peças')}
            {filtrando && (
              <>
                {' · '}
                <button type="button" className="closet-link" onClick={() => setFiltros(FILTROS_VAZIOS)}>
                  ver todas
                </button>
              </>
            )}
          </p>

          {visiveis.length === 0 ? (
            <div className="placeholder">
              <p>Nenhuma peça com esses filtros.</p>
            </div>
          ) : (
            <ul className="closet-grade">
              {visiveis.map((p) => (
                <CartaoPeca key={p.id} peca={p} />
              ))}
            </ul>
          )}
        </>
      )}

      <Link to="/nova" className="closet-fab botao botao-primario" aria-label="Nova peça">
        <span aria-hidden="true">＋</span> Nova peça
      </Link>
    </div>
  );
}

function CartaoPeca({ peca }: { peca: Peca }) {
  const indisponivel = peca.disponibilidade !== 'disponivel';
  return (
    <li>
      <Link to={`/peca/${peca.id}`} className="closet-cartao">
        <div className="closet-cartao-foto">
          <MiniaturaMidia midiaId={peca.midiaIds[0]} alt="" vazio={rotuloDe(CATEGORIAS, peca.categoria)} />
          {indisponivel && (
            <span className={`closet-selo closet-selo-${peca.disponibilidade}`}>
              {rotuloDe(DISPONIBILIDADES, peca.disponibilidade)}
            </span>
          )}
          {peca.favorita && <span className="closet-estrela" aria-label="Favorita">★</span>}
        </div>
        <span className="closet-cartao-nome">{peca.nome}</span>
      </Link>
    </li>
  );
}
