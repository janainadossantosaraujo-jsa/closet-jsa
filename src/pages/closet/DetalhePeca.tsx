import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Botao, Cabecalho, Chips, ModalConfirmacao } from '../../components';
import { useLooks, useSemanas } from '../../db/hooks';
import { apagarPeca, atualizarPeca } from '../../db/repo';
import {
  CATEGORIAS,
  DESCONFORTOS,
  DISPONIBILIDADES,
  ELASTICIDADES,
  ESTACOES,
  ESTRUTURAS,
  OCASIOES,
  ORIGENS_DADO,
  REGIOES_MEDIDA,
  TIPOS_MEDIDA,
  VESTE_BEM,
  rotuloDe,
  type Disponibilidade,
  type Opcao,
  type Peca,
} from '../../db/schema';
import { PecaNaoEncontrada } from './FormPeca';
import { GaleriaFotos } from './GaleriaFotos';
import { usePecaOuNula } from './usePecaOuNula';
import { formatarCm, voltaDaLarguraAberta } from './util';

function rotulos<T extends string>(lista: readonly Opcao<T>[], valores: readonly T[]): string {
  return valores.map((v) => rotuloDe(lista, v)).join(', ');
}

/** Rota /peca/:id. */
export function DetalhePecaPagina() {
  const { id } = useParams();
  const peca = usePecaOuNula(id);
  if (peca === undefined) return <p className="texto-suave">Carregando…</p>;
  if (peca === null) return <PecaNaoEncontrada />;
  return <DetalhePeca key={peca.id} peca={peca} />;
}

/** Atalho principal de disponibilidade conforme o estado atual. */
function trocaRapida(d: Disponibilidade): { para: Disponibilidade; texto: string } {
  if (d === 'disponivel') return { para: 'para_lavar', texto: 'Marcar "para lavar"' };
  if (d === 'para_lavar') return { para: 'disponivel', texto: 'Já lavei: marcar disponível' };
  return { para: 'disponivel', texto: 'Voltou: marcar disponível' };
}

function DetalhePeca({ peca }: { peca: Peca }) {
  const navegar = useNavigate();
  const looks = useLooks({ pecaId: peca.id });
  const semanas = useSemanas();
  const [confirmar, setConfirmar] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [falha, setFalha] = useState<string>();

  const nLooks = looks?.length ?? 0;
  const nSemanas =
    semanas?.filter(
      (s) => s.regras.pecasLavarEntreUsosIds.includes(peca.id) || s.dias.some((d) => d.pecasFixadasIds.includes(peca.id)),
    ).length ?? 0;

  async function mudarDisponibilidade(d: Disponibilidade) {
    setFalha(undefined);
    try {
      await atualizarPeca(peca.id, { disponibilidade: d });
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não foi possível alterar.');
    }
  }

  async function alternarFavorita() {
    try {
      await atualizarPeca(peca.id, { favorita: peca.favorita ? undefined : true });
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não foi possível alterar.');
    }
  }

  async function apagar() {
    setApagando(true);
    try {
      await apagarPeca(peca.id);
      navegar('/', { replace: true });
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não foi possível apagar.');
      setApagando(false);
      setConfirmar(false);
    }
  }

  const troca = trocaRapida(peca.disponibilidade);

  return (
    <div className="closet-detalhe">
      <Cabecalho
        titulo={peca.nome}
        voltar="/"
        acoes={
          <>
            <button
              type="button"
              className="closet-botao-icone"
              aria-pressed={!!peca.favorita}
              aria-label={peca.favorita ? 'Tirar das favoritas' : 'Marcar como favorita'}
              onClick={alternarFavorita}
            >
              {peca.favorita ? '★' : '☆'}
            </button>
            <Link to={`/peca/${peca.id}/editar`} className="botao botao-secundario closet-botao-editar">
              Editar
            </Link>
          </>
        }
      />

      <p className="texto-suave closet-subtitulo">
        {rotuloDe(CATEGORIAS, peca.categoria)}
        {peca.localizacao && <> · 📍 {peca.localizacao}</>}
      </p>

      <GaleriaFotos peca={peca} />

      <section className="cartao closet-disponibilidade" aria-label="Disponibilidade">
        <p className="closet-disponibilidade-atual">
          <span className={`closet-ponto closet-ponto-${peca.disponibilidade}`} aria-hidden="true" />
          {rotuloDe(DISPONIBILIDADES, peca.disponibilidade)}
        </p>
        <Botao bloco onClick={() => mudarDisponibilidade(troca.para)}>
          {troca.texto}
        </Botao>
        <details className="closet-outras-disp">
          <summary>Outra situação…</summary>
          <Chips
            rotulo="Disponibilidade"
            opcoes={DISPONIBILIDADES}
            unico
            valor={[peca.disponibilidade]}
            aoMudar={(v) => v[0] && mudarDisponibilidade(v[0])}
          />
        </details>
      </section>

      {falha && <p className="aviso" role="alert">{falha}</p>}

      <Bloco titulo="Conforto">
        <Item rotulo="Veste bem?" valor={rotuloDe(VESTE_BEM, peca.vesteBem)} />
        <Item rotulo="Desconfortos" valor={rotulos(DESCONFORTOS, peca.desconfortos)} />
        <Item rotulo="Observações" valor={peca.observacoesConforto} />
      </Bloco>

      <Bloco titulo="Cor, tecido e caimento">
        <Item rotulo="Cor" valor={peca.cor} />
        <Item rotulo="Estampa" valor={peca.estampa} />
        <Item rotulo="Tecido" valor={peca.tecido} />
        <Item rotulo="Composição" valor={peca.composicao} />
        <Item rotulo="Elasticidade" valor={rotuloDe(ELASTICIDADES, peca.elasticidade)} />
        <Item rotulo="Estrutura" valor={rotuloDe(ESTRUTURAS, peca.estrutura)} />
      </Bloco>

      <Bloco
        titulo="Tamanho e medidas"
        depois={
          peca.medidas.length > 0 && (
          <div className="closet-tabela-medidas">
            <table>
              <thead>
                <tr>
                  <th scope="col">Região</th>
                  <th scope="col">Medida</th>
                  <th scope="col">Origem</th>
                </tr>
              </thead>
              <tbody>
                {peca.medidas.map((m) => (
                  <tr key={m.id}>
                    <th scope="row">{rotuloDe(REGIOES_MEDIDA, m.regiao)}</th>
                    <td>
                      {formatarCm(m.valor)}
                      {m.tipo !== 'linear' && (
                        <span className="closet-medida-tipo">
                          {rotuloDe(TIPOS_MEDIDA, m.tipo)}
                          {m.tipo === 'largura_aberta' && ` · ≈ ${formatarCm(voltaDaLarguraAberta(m.valor))} de volta`}
                        </span>
                      )}
                      {m.observacao && <span className="closet-medida-tipo">{m.observacao}</span>}
                    </td>
                    <td>{rotuloDe(ORIGENS_DADO, m.origem)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )
        }
      >
        <Item rotulo="Tamanho da etiqueta" valor={peca.tamanhoEtiqueta} />
        <Item rotulo="Marca" valor={peca.marca} />
        {peca.medidas.length === 0 && <Item rotulo="Medidas da peça" valor={undefined} />}
      </Bloco>

      <Bloco titulo="Uso">
        <Item rotulo="Ocasiões" valor={rotulos(OCASIOES, peca.ocasioes)} />
        <Item rotulo="Estação / calor" valor={rotulos(ESTACOES, peca.estacoes)} />
        <Item rotulo="Localização" valor={peca.localizacao} />
        <Item rotulo="Em looks" valor={looks === undefined ? undefined : nLooks ? `${nLooks} look${nLooks > 1 ? 's' : ''}` : 'nenhum'} />
        <Item rotulo="Observações" valor={peca.observacoes} />
      </Bloco>

      <p className="texto-suave closet-datas">
        Cadastrada em {new Date(peca.criadaEm).toLocaleDateString('pt-BR')}
        {peca.atualizadaEm !== peca.criadaEm && ` · alterada em ${new Date(peca.atualizadaEm).toLocaleDateString('pt-BR')}`}
      </p>

      <Botao variante="perigo" bloco onClick={() => setConfirmar(true)}>
        Apagar peça
      </Botao>

      <ModalConfirmacao
        aberto={confirmar}
        titulo={`Apagar "${peca.nome}"?`}
        perigoso
        textoConfirmar="Apagar peça"
        carregando={apagando}
        aoConfirmar={apagar}
        aoCancelar={() => setConfirmar(false)}
      >
        <p>A peça e todas as fotos dela serão apagadas do aparelho. Não dá para desfazer.</p>
        <p>
          Ela também será <strong>removida dos looks e das semanas</strong>
          {nLooks || nSemanas
            ? ` (${[nLooks && `${nLooks} look${nLooks > 1 ? 's' : ''}`, nSemanas && `${nSemanas} semana${nSemanas > 1 ? 's' : ''}`]
                .filter(Boolean)
                .join(' e ')}).`
            : ' onde aparecer (hoje não está em nenhum).'}
        </p>
      </ModalConfirmacao>
    </div>
  );
}

function Bloco({ titulo, children, depois }: { titulo: string; children: ReactNode; depois?: ReactNode }) {
  return (
    <section className="cartao closet-bloco">
      <h2>{titulo}</h2>
      <dl>{children}</dl>
      {depois}
    </section>
  );
}

function Item({ rotulo, valor }: { rotulo: string; valor: string | undefined }) {
  return (
    <div className="closet-item">
      <dt>{rotulo}</dt>
      <dd className={valor ? undefined : 'texto-suave'}>{valor || '—'}</dd>
    </div>
  );
}
