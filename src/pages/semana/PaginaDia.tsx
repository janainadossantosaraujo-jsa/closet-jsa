import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Botao, Cabecalho, CampoArea, CampoTexto, MiniaturaMidia, Selecao } from '../../components';
import { usePerfil } from '../../db/hooks';
import { deDiaISO, inicioDaSemana, paraDiaISO } from '../../db/repo';
import { novoId, OCASIOES, type Compromisso, type DiaISO, type DiaSemana, type ID, type Look, type Ocasiao, type Opcao, type Peca, type TipoCompromisso } from '../../db/schema';
import { AvisosLook } from '../looks/AvisosLook';
import { ehDiaISO, nomeDoLook, pecasDoLook, rotuloOcasiao, useLooksMapa, usePecasMapa } from '../looks/dados';
import { Folha } from '../looks/Folha';
import { MosaicoLook } from '../looks/MosaicoLook';
import { EtiquetaDisponibilidade } from '../looks/Prancha';
import { alertasSemana } from '../looks/regras';
import { SeletorLook } from '../looks/SeletorLook';
import { SeletorPecas } from '../looks/SeletorPecas';
import { caminhoNovoLookParaDia, type PapelNoDia } from '../looks/vinculo';
import { horarioCompromisso, ListaAlertas, nomeCompromisso } from './comum';
import { nomeDia, salvarDia, somarDias, useSemanaVista } from './dados';

/** Rota ":inicio/:data". */
export function RotaDia() {
  const { inicio, data } = useParams();
  if (!ehDiaISO(data)) return <Navigate to="/semana" replace />;
  const segunda = inicioDaSemana(deDiaISO(data));
  if (segunda !== inicio) return <Navigate to={`/semana/${segunda}/${data}`} replace />;
  return <PaginaDia key={data} inicio={segunda} data={data} />;
}

function PaginaDia({ inicio, data }: { inicio: DiaISO; data: DiaISO }) {
  const navegar = useNavigate();
  const vista = useSemanaVista(inicio);
  const looks = useLooksMapa();
  const pecas = usePecasMapa();
  const perfil = usePerfil();
  const [escolherLook, setEscolherLook] = useState<PapelNoDia>();
  const [escolherPecas, setEscolherPecas] = useState(false);
  const [compromissoEditado, setCompromissoEditado] = useState<Compromisso>();
  const [erro, setErro] = useState<string>();

  const dia = vista?.dias.find((d) => d.data === data);
  const alertas = useMemo(
    () => (vista && looks && pecas ? alertasSemana(vista, looks.lista, [...pecas.values()], paraDiaISO(new Date())).filter((a) => a.dia === data) : []),
    [vista, looks, pecas, data],
  );

  if (!vista || !looks || !pecas || !perfil || !dia) return <p className="texto-suave">Carregando…</p>;
  const tipos = perfil.tiposCompromisso ?? [];
  const look = dia.lookId ? looks.mapa.get(dia.lookId) : undefined;
  const alternativas = dia.alternativasLookIds.map((id) => looks.mapa.get(id)).filter((l): l is Look => !!l);
  const fixadas = dia.pecasFixadasIds.map((id) => pecas.get(id)).filter((p): p is Peca => !!p);
  const ocasioesDoDia = [
    ...new Set(
      dia.compromissos
        .map((c) => c.ocasiao ?? tipos.find((t) => t.id === c.tipoId)?.ocasiao)
        .filter((o): o is Ocasiao => !!o),
    ),
  ];

  async function salvar(novo: DiaSemana) {
    setErro(undefined);
    try {
      await salvarDia(inicio, novo);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
    }
  }

  function escolher(papel: PapelNoDia, id: ID) {
    setEscolherLook(undefined);
    if (!dia) return;
    if (papel === 'look') {
      void salvar({ ...dia, lookId: id, alternativasLookIds: dia.alternativasLookIds.filter((x) => x !== id) });
    } else {
      void salvar({ ...dia, alternativasLookIds: [...dia.alternativasLookIds.filter((x) => x !== id), id] });
    }
  }

  function promover(id: ID) {
    if (!dia) return;
    const resto = dia.alternativasLookIds.filter((x) => x !== id);
    void salvar({ ...dia, lookId: id, alternativasLookIds: dia.lookId ? [dia.lookId, ...resto] : resto });
  }

  function montarNovo(papel: PapelNoDia) {
    navegar(caminhoNovoLookParaDia({ semana: inicio, dia: data, papel }, { ocasiao: ocasioesDoDia[0] }));
  }

  const anterior = somarDias(data, -1);
  const proximo = somarDias(data, 1);

  return (
    <>
      <Cabecalho titulo={nomeDia(data)} voltar={`/semana/${inicio}`} />
      <nav className="sm-navegacao sm-navegacao-dia" aria-label="Outros dias">
        <Botao variante="fantasma" onClick={() => navegar(`/semana/${inicioDaSemana(deDiaISO(anterior))}/${anterior}`, { replace: true })}>
          ‹ Dia anterior
        </Botao>
        <Botao variante="fantasma" onClick={() => navegar(`/semana/${inicioDaSemana(deDiaISO(proximo))}/${proximo}`, { replace: true })}>
          Próximo dia ›
        </Botao>
      </nav>

      {erro && (
        <p className="campo-erro" role="alert">
          {erro}
        </p>
      )}
      <ListaAlertas alertas={alertas} />

      {/* Compromissos */}
      <section className="cartao">
        <h2>Compromissos</h2>
        {dia.compromissos.length === 0 && <p className="texto-suave">Nenhum compromisso.</p>}
        <ul className="sm-compromissos">
          {[...dia.compromissos]
            .sort((a, b) => (a.horarioInicio ?? '99').localeCompare(b.horarioInicio ?? '99'))
            .map((c) => (
              <li key={c.id}>
                <button type="button" className="sm-compromisso" onClick={() => setCompromissoEditado(c)}>
                  <span className="sm-compromisso-hora">{horarioCompromisso(c) || '—'}</span>
                  <span>
                    {nomeCompromisso(c, tipos)}
                    {(c.local || c.ocasiao) && (
                      <span className="texto-suave"> · {[c.local, c.ocasiao && OCASIOES.find((o) => o.valor === c.ocasiao)?.rotulo].filter(Boolean).join(' · ')}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
        </ul>
        <Botao bloco variante="secundario" onClick={() => setCompromissoEditado({ id: novoId() })}>
          + Adicionar compromisso
        </Botao>
      </section>

      {/* Look do dia */}
      <section className="cartao">
        <h2>Look do dia</h2>
        {look ? (
          <>
            <CartaoLookDia look={look} pecas={pecas} onAbrir={() => navegar(`/looks/${look.id}`)} />
            <AvisosLook pecas={pecasDoLook(look, pecas)} />
            <div className="sm-botoes">
              <Botao variante="secundario" onClick={() => setEscolherLook('look')}>
                Trocar
              </Botao>
              <Botao variante="secundario" onClick={() => navegar(`/looks/${look.id}?usar=${data}`)}>
                Registrar uso
              </Botao>
              <Botao variante="fantasma" className="lk-perigo-texto" onClick={() => void salvar({ ...dia, lookId: undefined })}>
                Tirar do dia
              </Botao>
            </div>
          </>
        ) : (
          <div className="sm-botoes">
            <Botao onClick={() => setEscolherLook('look')}>Escolher look</Botao>
            <Botao variante="secundario" onClick={() => montarNovo('look')}>
              Montar novo
            </Botao>
          </div>
        )}
      </section>

      {/* Alternativas */}
      <section className="cartao">
        <h2>Alternativas</h2>
        {alternativas.length === 0 && <p className="texto-suave">Nenhuma alternativa.</p>}
        <ul className="lk-lista">
          {alternativas.map((l) => (
            <li key={l.id} className="pilha">
              <CartaoLookDia look={l} pecas={pecas} onAbrir={() => navegar(`/looks/${l.id}`)} />
              <div className="sm-botoes">
                <Botao variante="secundario" onClick={() => promover(l.id)}>
                  Usar como look do dia
                </Botao>
                <Botao
                  variante="fantasma"
                  className="lk-perigo-texto"
                  onClick={() => void salvar({ ...dia, alternativasLookIds: dia.alternativasLookIds.filter((x) => x !== l.id) })}
                >
                  Remover
                </Botao>
              </div>
            </li>
          ))}
        </ul>
        <div className="sm-botoes lk-espaco">
          <Botao variante="secundario" onClick={() => setEscolherLook('alternativa')}>
            + Alternativa
          </Botao>
          <Botao variante="fantasma" onClick={() => montarNovo('alternativa')}>
            Montar nova
          </Botao>
        </div>
      </section>

      {/* Peças fixadas */}
      <section className="cartao">
        <h2>Peças fixadas</h2>
        <p className="texto-suave sm-nota">Peças que você quer usar neste dia, com ou sem look.</p>
        {fixadas.length > 0 && (
          <div className="sm-fixadas">
            {fixadas.map((p) => (
              <figure key={p.id}>
                <MiniaturaMidia midiaId={p.midiaIds[0]} alt={p.nome} />
                <figcaption>
                  {p.nome}
                  <EtiquetaDisponibilidade peca={p} />
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        <AvisosLook pecas={fixadas} />
        <Botao bloco variante="secundario" onClick={() => setEscolherPecas(true)}>
          {fixadas.length ? 'Alterar peças fixadas' : '+ Fixar peças'}
        </Botao>
      </section>

      <ObservacoesDia key={dia.observacoes ?? ''} valorInicial={dia.observacoes ?? ''} aoSalvar={(t) => void salvar({ ...dia, observacoes: t || undefined })} />

      <SeletorLook
        aberto={!!escolherLook}
        titulo={escolherLook === 'alternativa' ? 'Escolher alternativa' : 'Escolher look do dia'}
        excluir={[...(dia.lookId ? [dia.lookId] : []), ...dia.alternativasLookIds]}
        ocasioesPreferidas={ocasioesDoDia}
        aoFechar={() => setEscolherLook(undefined)}
        aoEscolher={(id) => escolherLook && escolher(escolherLook, id)}
        aoMontarNovo={() => escolherLook && montarNovo(escolherLook)}
      />
      <SeletorPecas
        aberto={escolherPecas}
        titulo="Peças fixadas no dia"
        selecionadas={dia.pecasFixadasIds}
        aoFechar={() => setEscolherPecas(false)}
        aoConfirmar={(ids) => {
          setEscolherPecas(false);
          void salvar({ ...dia, pecasFixadasIds: ids });
        }}
      />
      <FormCompromisso
        key={compromissoEditado?.id ?? 'nenhum'}
        compromisso={compromissoEditado}
        tipos={tipos}
        existente={!!compromissoEditado && dia.compromissos.some((c) => c.id === compromissoEditado.id)}
        aoFechar={() => setCompromissoEditado(undefined)}
        aoSalvar={(c) => {
          setCompromissoEditado(undefined);
          const existe = dia.compromissos.some((x) => x.id === c.id);
          void salvar({ ...dia, compromissos: existe ? dia.compromissos.map((x) => (x.id === c.id ? c : x)) : [...dia.compromissos, c] });
        }}
        aoRemover={(id) => {
          setCompromissoEditado(undefined);
          void salvar({ ...dia, compromissos: dia.compromissos.filter((x) => x.id !== id) });
        }}
      />
    </>
  );
}

function CartaoLookDia({ look, pecas, onAbrir }: { look: Look; pecas: ReadonlyMap<ID, Peca>; onAbrir: () => void }) {
  const ps = pecasDoLook(look, pecas);
  return (
    <button type="button" className="lk-cartao-look" onClick={onAbrir}>
      <MosaicoLook pecas={ps} />
      <span className="lk-cartao-texto">
        <strong>{nomeDoLook(look, pecas)}</strong>
        <span className="texto-suave">{[rotuloOcasiao(look), `${ps.length} peça${ps.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}</span>
        <span className="texto-suave">{ps.map((p) => p.nome).join(', ')}</span>
      </span>
    </button>
  );
}

function ObservacoesDia({ valorInicial, aoSalvar }: { valorInicial: string; aoSalvar: (t: string) => void }) {
  const [texto, setTexto] = useState(valorInicial);
  return (
    <CampoArea
      rotulo="Observações do dia"
      valor={texto}
      aoMudar={setTexto}
      onBlur={() => texto.trim() !== valorInicial.trim() && aoSalvar(texto.trim())}
      dica="Salva ao sair do campo."
    />
  );
}

const TIPO_LIVRE = '__livre__';

function FormCompromisso({
  compromisso,
  tipos,
  existente,
  aoFechar,
  aoSalvar,
  aoRemover,
}: {
  compromisso: Compromisso | undefined;
  tipos: readonly TipoCompromisso[];
  existente: boolean;
  aoFechar: () => void;
  aoSalvar: (c: Compromisso) => void;
  aoRemover: (id: ID) => void;
}) {
  const [tipoId, setTipoId] = useState<string | undefined>(compromisso?.tipoId ?? (tipos.length ? undefined : TIPO_LIVRE));
  const [descricao, setDescricao] = useState(compromisso?.descricao ?? '');
  const [inicio, setInicio] = useState(compromisso?.horarioInicio ?? '');
  const [fim, setFim] = useState(compromisso?.horarioFim ?? '');
  const [ocasiao, setOcasiao] = useState<Ocasiao | undefined>(compromisso?.ocasiao);
  const [local, setLocal] = useState(compromisso?.local ?? '');
  const [erro, setErro] = useState<string>();

  const opcoesTipo: Opcao<string>[] = [...tipos.map((t) => ({ valor: t.id, rotulo: t.nome })), { valor: TIPO_LIVRE, rotulo: 'Outro (texto livre)' }];
  const tipoReal = tipoId && tipoId !== TIPO_LIVRE ? tipoId : undefined;

  function salvar() {
    if (!compromisso) return;
    if (!tipoReal && !descricao.trim()) {
      setErro(tipos.length ? 'Escolha um tipo ou descreva o compromisso.' : 'Descreva o compromisso.');
      return;
    }
    const ocasiaoTipo = tipos.find((t) => t.id === tipoReal)?.ocasiao;
    aoSalvar({
      id: compromisso.id,
      tipoId: tipoReal,
      descricao: descricao.trim() || undefined,
      horarioInicio: inicio || undefined,
      horarioFim: fim || undefined,
      ocasiao: ocasiao ?? ocasiaoTipo,
      local: local.trim() || undefined,
    });
  }

  return (
    <Folha
      aberto={!!compromisso}
      titulo={existente ? 'Editar compromisso' : 'Novo compromisso'}
      aoFechar={aoFechar}
      rodape={
        <div className="lk-rodape-botoes">
          {existente ? (
            <Botao variante="secundario" className="lk-perigo-texto" onClick={() => compromisso && aoRemover(compromisso.id)}>
              Remover
            </Botao>
          ) : (
            <Botao variante="secundario" onClick={aoFechar}>
              Cancelar
            </Botao>
          )}
          <Botao onClick={salvar}>Salvar</Botao>
        </div>
      }
    >
      {tipos.length > 0 ? (
        <Selecao
          rotulo="Tipo"
          opcoes={opcoesTipo}
          valor={tipoId}
          aoMudar={(v) => {
            setTipoId(v);
            const t = tipos.find((x) => x.id === v);
            if (t?.ocasiao && !ocasiao) setOcasiao(t.ocasiao);
          }}
          vazio="Escolha o tipo…"
          dica="Tipos cadastrados no Perfil."
        />
      ) : (
        <p className="texto-suave sm-nota">Dica: cadastre seus tipos de compromisso no Perfil para escolher aqui.</p>
      )}
      <CampoTexto
        rotulo={tipoReal ? 'Detalhe (opcional)' : 'Descrição'}
        valor={descricao}
        aoMudar={setDescricao}
        placeholder="ex.: Audiência na 2ª Vara"
      />
      <div className="sm-horarios">
        <CampoTexto rotulo="Início (opcional)" type="time" valor={inicio} aoMudar={setInicio} />
        <CampoTexto rotulo="Fim (opcional)" type="time" valor={fim} aoMudar={setFim} />
      </div>
      <Selecao rotulo="Ocasião" opcoes={OCASIOES} valor={ocasiao} aoMudar={setOcasiao} vazio="Sem ocasião" />
      <CampoTexto rotulo="Local (opcional)" valor={local} aoMudar={setLocal} />
      {erro && (
        <p className="campo-erro" role="alert">
          {erro}
        </p>
      )}
    </Folha>
  );
}
