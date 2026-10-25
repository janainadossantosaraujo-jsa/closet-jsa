import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Botao, Cabecalho, CampoArea, CampoTexto, Chips, ModalConfirmacao } from '../../components';
import { useLooks } from '../../db/hooks';
import { apagarLook, paraDiaISO, registrarUsoLook } from '../../db/repo';
import { DESCONFORTOS, FEEDBACKS_LOOK, rotuloDe, type Desconforto, type FeedbackLook, type Look } from '../../db/schema';
import { AvisosLook } from './AvisosLook';
import { ehDiaISO, formatarDiaCurto, nomeDoLook, pecasDoLook, rotuloOcasiao, usePecasMapa } from './dados';
import { Folha } from './Folha';
import { Prancha } from './Prancha';

export function DetalheLook() {
  const { id } = useParams();
  const looks = useLooks();
  if (!looks) return <p className="texto-suave">Carregando…</p>;
  const look = looks.find((l) => l.id === id);
  if (!look) {
    return (
      <>
        <Cabecalho titulo="Look não encontrado" voltar="/looks" />
        <p className="texto-suave">Este look não existe mais.</p>
      </>
    );
  }
  return <ConteudoLook key={look.id} look={look} />;
}

function ConteudoLook({ look }: { look: Look }) {
  const navegar = useNavigate();
  const [params, setParams] = useSearchParams();
  const pecas = usePecasMapa();
  const [confirmarApagar, setConfirmarApagar] = useState(false);
  const [apagando, setApagando] = useState(false);
  const diaUso = params.get('usar');
  const [usoAberto, setUsoAberto] = useState(ehDiaISO(diaUso));

  const ps = pecas ? pecasDoLook(look, pecas) : [];
  const usos = [...look.usos].sort((a, b) => b.dia.localeCompare(a.dia) || b.criadoEm.localeCompare(a.criadoEm));

  async function apagar() {
    setApagando(true);
    try {
      await apagarLook(look.id);
      navegar('/looks', { replace: true });
    } catch {
      setApagando(false);
    }
  }

  function fecharUso() {
    setUsoAberto(false);
    if (params.has('usar')) {
      params.delete('usar');
      setParams(params, { replace: true });
    }
  }

  return (
    <>
      <Cabecalho
        titulo={nomeDoLook(look, pecas)}
        voltar
        acoes={
          <Botao variante="secundario" onClick={() => navegar(`/looks/${look.id}/editar`)}>
            Editar
          </Botao>
        }
      />
      <p className="texto-suave">
        {[rotuloOcasiao(look), `${ps.length} peça${ps.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
      </p>

      <AvisosLook pecas={ps} />
      {pecas && ps.length === 0 && <p className="aviso">Este look ficou sem peças (foram apagadas do closet). Edite ou apague.</p>}
      <Prancha pecas={ps} />

      {look.observacoes && (
        <section className="cartao">
          <h2>Observações</h2>
          <p className="lk-pre">{look.observacoes}</p>
        </section>
      )}

      <section className="cartao">
        <h2>Usos</h2>
        {usos.length === 0 && <p className="texto-suave">Ainda não registrado.</p>}
        <ul className="lk-usos">
          {usos.map((u) => (
            <li key={u.id}>
              <strong>{formatarDiaCurto(u.dia)}</strong>
              {u.feedbacks.length > 0 && <span> · {u.feedbacks.map((f) => rotuloDe(FEEDBACKS_LOOK, f)).join(', ')}</span>}
              {u.desconfortos.length > 0 && (
                <span className="texto-suave"> · {u.desconfortos.map((d) => rotuloDe(DESCONFORTOS, d)).join(', ')}</span>
              )}
              {u.observacao && <div className="texto-suave">{u.observacao}</div>}
            </li>
          ))}
        </ul>
        <Botao bloco onClick={() => setUsoAberto(true)} disabled={ps.length === 0}>
          Registrar uso
        </Botao>
      </section>

      <Botao bloco variante="fantasma" onClick={() => setConfirmarApagar(true)} className="lk-perigo-texto">
        Apagar look
      </Botao>

      <ModalConfirmacao
        aberto={confirmarApagar}
        titulo="Apagar este look?"
        perigoso
        textoConfirmar="Apagar"
        carregando={apagando}
        aoConfirmar={apagar}
        aoCancelar={() => setConfirmarApagar(false)}
      >
        <p>As peças continuam no closet. O look sai também dos dias da semana em que estava escolhido.</p>
      </ModalConfirmacao>

      <FormUso key={diaUso ?? 'hoje'} aberto={usoAberto} look={look} diaInicial={ehDiaISO(diaUso) ? diaUso : paraDiaISO(new Date())} aoFechar={fecharUso} />
    </>
  );
}

function FormUso({ aberto, look, diaInicial, aoFechar }: { aberto: boolean; look: Look; diaInicial: string; aoFechar: () => void }) {
  const [dia, setDia] = useState(diaInicial);
  const [feedbacks, setFeedbacks] = useState<FeedbackLook[]>([]);
  const [desconfortos, setDesconfortos] = useState<Desconforto[]>([]);
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string>();

  async function salvar() {
    setErro(undefined);
    if (!ehDiaISO(dia)) {
      setErro('Informe a data.');
      return;
    }
    if (!feedbacks.length && !desconfortos.length && !observacao.trim()) {
      setErro('Marque pelo menos um retorno (ex.: Gostei).');
      return;
    }
    setSalvando(true);
    try {
      await registrarUsoLook(look.id, { dia, feedbacks, desconfortos, observacao: observacao.trim() || undefined });
      setFeedbacks([]);
      setDesconfortos([]);
      setObservacao('');
      aoFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível registrar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Folha
      aberto={aberto}
      titulo="Registrar uso"
      aoFechar={aoFechar}
      rodape={
        <Botao bloco onClick={salvar} carregando={salvando}>
          Salvar
        </Botao>
      }
    >
      <CampoTexto rotulo="Dia" type="date" valor={dia} aoMudar={setDia} />
      <Chips rotulo="Como foi?" opcoes={FEEDBACKS_LOOK} valor={feedbacks} aoMudar={setFeedbacks} />
      <Chips rotulo="Algum desconforto?" opcoes={DESCONFORTOS} valor={desconfortos} aoMudar={setDesconfortos} />
      <CampoArea rotulo="Observação" valor={observacao} aoMudar={setObservacao} />
      {erro && (
        <p className="campo-erro" role="alert">
          {erro}
        </p>
      )}
    </Folha>
  );
}
