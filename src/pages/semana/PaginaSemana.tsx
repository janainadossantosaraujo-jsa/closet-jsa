import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Botao, Cabecalho, CampoNumero, Chips } from '../../components';
import { usePerfil } from '../../db/hooks';
import { deDiaISO, inicioDaSemana, paraDiaISO } from '../../db/repo';
import { CATEGORIAS, type DiaISO, type RegrasSemana } from '../../db/schema';
import { ehDiaISO, nomeDoLook, pecasDoLook, useLooksMapa, usePecasMapa } from '../looks/dados';
import { MosaicoLook } from '../looks/MosaicoLook';
import { alertasSemana, avisosConforto } from '../looks/regras';
import { SeletorPecas } from '../looks/SeletorPecas';
import { horarioCompromisso, nomeCompromisso } from './comum';
import { nomeDia, rotuloSemana, salvarRegras, somarDias, useSemanaVista } from './dados';

/** Rota ":inicio": valida e normaliza para a segunda-feira. */
export function RotaSemana() {
  const { inicio } = useParams();
  if (!ehDiaISO(inicio)) return <Navigate to={`/semana/${inicioDaSemana()}`} replace />;
  const segunda = inicioDaSemana(deDiaISO(inicio));
  if (segunda !== inicio) return <Navigate to={`/semana/${segunda}`} replace />;
  return <PaginaSemana key={inicio} inicio={inicio} />;
}

function PaginaSemana({ inicio }: { inicio: DiaISO }) {
  const navegar = useNavigate();
  const vista = useSemanaVista(inicio);
  const looks = useLooksMapa();
  const pecas = usePecasMapa();
  const perfil = usePerfil();
  const hoje = paraDiaISO(new Date());
  const atual = inicioDaSemana();

  const alertas = useMemo(
    () => (vista && looks && pecas ? alertasSemana(vista, looks.lista, [...pecas.values()], hoje) : []),
    [vista, looks, pecas, hoje],
  );

  if (!vista || !looks || !pecas || !perfil) return <p className="texto-suave">Carregando…</p>;
  const tipos = perfil.tiposCompromisso ?? [];
  const nGraves = alertas.filter((a) => a.nivel === 'alerta').length;

  return (
    <>
      <Cabecalho titulo="Semana" />
      <nav className="sm-navegacao" aria-label="Navegar entre semanas">
        <Botao variante="secundario" aria-label="Semana anterior" onClick={() => navegar(`/semana/${somarDias(inicio, -7)}`)}>
          ‹
        </Botao>
        <div className="sm-navegacao-titulo">
          <strong>{rotuloSemana(inicio)}</strong>
          {inicio === atual ? (
            <span className="texto-suave">Esta semana</span>
          ) : (
            <button type="button" className="sm-link" onClick={() => navegar(`/semana/${atual}`)}>
              Voltar para esta semana
            </button>
          )}
        </div>
        <Botao variante="secundario" aria-label="Próxima semana" onClick={() => navegar(`/semana/${somarDias(inicio, 7)}`)}>
          ›
        </Botao>
      </nav>

      {nGraves > 0 && (
        <p className="aviso lk-aviso">
          ⚠ {nGraves} alerta{nGraves === 1 ? '' : 's'} nas regras da semana (veja nos dias).
        </p>
      )}

      <ul className="sm-dias">
        {vista.dias.map((d) => {
          const look = d.lookId ? looks.mapa.get(d.lookId) : undefined;
          const ps = look ? pecasDoLook(look, pecas) : [];
          const alertasDia = alertas.filter((a) => a.dia === d.data);
          const conforto = avisosConforto(ps).length > 0;
          return (
            <li key={d.data}>
              <Link to={`/semana/${inicio}/${d.data}`} className={`sm-dia${d.data === hoje ? ' sm-dia-hoje' : ''}${d.data < hoje ? ' sm-dia-passado' : ''}`}>
                <span className="sm-dia-cabecalho">
                  <strong>{nomeDia(d.data)}</strong>
                  {d.data === hoje && <span className="lk-etiqueta">Hoje</span>}
                </span>
                <span className="sm-dia-corpo">
                  {look ? <MosaicoLook pecas={ps} pequeno /> : <span className="sm-sem-look">sem look</span>}
                  <span className="sm-dia-texto">
                    {d.compromissos.map((c) => (
                      <span key={c.id}>
                        {horarioCompromisso(c) && <span className="texto-suave">{horarioCompromisso(c)} </span>}
                        {nomeCompromisso(c, tipos)}
                      </span>
                    ))}
                    {look && <span>👗 {nomeDoLook(look, pecas)}</span>}
                    {(d.alternativasLookIds.length > 0 || d.pecasFixadasIds.length > 0) && (
                      <span className="texto-suave">
                        {[
                          d.alternativasLookIds.length ? `${d.alternativasLookIds.length} alternativa${d.alternativasLookIds.length === 1 ? '' : 's'}` : '',
                          d.pecasFixadasIds.length ? `${d.pecasFixadasIds.length} peça${d.pecasFixadasIds.length === 1 ? '' : 's'} fixada${d.pecasFixadasIds.length === 1 ? '' : 's'}` : '',
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    )}
                    {!look && !d.compromissos.length && <span className="texto-suave">Toque para planejar</span>}
                    <span className="linha">
                      {alertasDia.some((a) => a.nivel === 'alerta') && <span className="lk-etiqueta lk-etiqueta-conforto">⚠ regras</span>}
                      {conforto && <span className="lk-etiqueta lk-etiqueta-conforto">⚠ conforto</span>}
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <RegrasDaSemana inicio={inicio} regras={vista.regras} />
      {!vista.gravada && <p className="texto-suave sm-nota">A semana é guardada quando você planejar o primeiro dia ou mudar uma regra.</p>}
    </>
  );
}

function RegrasDaSemana({ inicio, regras }: { inicio: DiaISO; regras: RegrasSemana }) {
  const pecas = usePecasMapa();
  const [seletor, setSeletor] = useState(false);
  const mudar = (alt: Partial<RegrasSemana>) => void salvarRegras(inicio, { ...regras, ...alt });
  const lavar = regras.pecasLavarEntreUsosIds.map((id) => pecas?.get(id)).filter((p) => !!p);

  return (
    <details className="cartao sm-regras">
      <summary>
        <strong>Regras da semana</strong>
        <span className="texto-suave">
          {regras.repeticaoPermitida ? 'Repetição permitida' : 'Sem repetição'}
          {regras.repeticaoPermitida && regras.intervaloMinimoDias ? ` · ${regras.intervaloMinimoDias} dia(s) de intervalo` : ''}
          {regras.categoriasLavarEntreUsos.length + regras.pecasLavarEntreUsosIds.length > 0 ? ' · lavar entre usos' : ''}
        </span>
      </summary>
      <label className="lk-alternar">
        <input type="checkbox" checked={regras.repeticaoPermitida} onChange={(e) => mudar({ repeticaoPermitida: e.target.checked })} />
        Permitir repetir a mesma peça na semana
      </label>
      {regras.repeticaoPermitida && (
        <CampoNumero
          rotulo="Dias sem usar entre dois usos (mínimo)"
          dica="Ex.: 2 = usou na segunda, só repete a partir de quinta. Vazio = sem mínimo."
          valor={regras.intervaloMinimoDias}
          aoMudar={(v) => mudar({ intervaloMinimoDias: v === undefined ? undefined : Math.max(0, Math.round(v)) })}
          unidade="dias"
        />
      )}
      <Chips
        rotulo="Lavar entre usos (categorias)"
        opcoes={CATEGORIAS}
        valor={regras.categoriasLavarEntreUsos}
        aoMudar={(v) => mudar({ categoriasLavarEntreUsos: v })}
      />
      <p className="campo-rotulo">Lavar entre usos (peças)</p>
      {lavar.length ? <p>{lavar.map((p) => p.nome).join(', ')}</p> : <p className="texto-suave">Nenhuma peça específica.</p>}
      <Botao variante="secundario" bloco onClick={() => setSeletor(true)}>
        Escolher peças
      </Botao>
      <SeletorPecas
        aberto={seletor}
        titulo="Peças para lavar entre usos"
        selecionadas={regras.pecasLavarEntreUsosIds}
        aoFechar={() => setSeletor(false)}
        aoConfirmar={(ids) => {
          setSeletor(false);
          mudar({ pecasLavarEntreUsosIds: ids });
        }}
      />
    </details>
  );
}
