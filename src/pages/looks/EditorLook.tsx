import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Botao, Cabecalho, CampoArea, CampoTexto, Selecao } from '../../components';
import { useLooks } from '../../db/hooks';
import { atualizarLook, criarLook } from '../../db/repo';
import { OCASIOES, valoresDe, type ID, type Look, type Ocasiao } from '../../db/schema';
import { AvisosLook } from './AvisosLook';
import { formatarDiaCurto, pecasDoLook, usePecasMapa } from './dados';
import { Prancha } from './Prancha';
import { SeletorPecas } from './SeletorPecas';
import { caminhoDia, colocarLookNoDia, lerDestino } from './vinculo';

/** Rota "novo" e ":id/editar". */
export function EditorLook() {
  const { id } = useParams();
  const looks = useLooks();
  if (!id) return <FormLook />;
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
  return <FormLook key={look.id} look={look} />;
}

function FormLook({ look }: { look?: Look }) {
  const navegar = useNavigate();
  const [params] = useSearchParams();
  const destino = look ? undefined : lerDestino(params);
  const pecas = usePecasMapa();

  const ocasiaoInicial = params.get('ocasiao');
  const [pecaIds, setPecaIds] = useState<ID[]>(() => look?.pecaIds ?? params.getAll('peca'));
  const [nome, setNome] = useState(look?.nome ?? '');
  const [ocasiao, setOcasiao] = useState<Ocasiao | undefined>(
    look?.ocasiao ?? (valoresDe(OCASIOES).includes(ocasiaoInicial as Ocasiao) ? (ocasiaoInicial as Ocasiao) : undefined),
  );
  const [observacoes, setObservacoes] = useState(look?.observacoes ?? '');
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string>();

  const escolhidas = useMemo(() => (pecas ? pecasDoLook({ pecaIds }, pecas) : []), [pecas, pecaIds]);

  async function salvar() {
    setErro(undefined);
    const ids = escolhidas.map((p) => p.id);
    if (!ids.length) {
      setErro('Escolha pelo menos uma peça.');
      return;
    }
    setSalvando(true);
    try {
      const dados = { pecaIds: ids, nome: nome.trim() || undefined, ocasiao, observacoes: observacoes.trim() || undefined };
      if (look) {
        await atualizarLook(look.id, dados);
        navegar(`/looks/${look.id}`, { replace: true });
      } else {
        const novo = await criarLook(dados);
        if (destino) {
          await colocarLookNoDia(destino, novo.id);
          navegar(caminhoDia(destino.semana, destino.dia), { replace: true });
        } else {
          navegar(`/looks/${novo.id}`, { replace: true });
        }
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar o look.');
      setSalvando(false);
    }
  }

  return (
    <>
      <Cabecalho titulo={look ? 'Editar look' : 'Novo look'} voltar />
      {destino && (
        <p className="texto-suave">
          Ao salvar, o look entra {destino.papel === 'alternativa' ? 'como alternativa' : 'como look do dia'} em {formatarDiaCurto(destino.dia)}.
        </p>
      )}

      <Prancha pecas={escolhidas} aoRemover={(id) => setPecaIds((l) => l.filter((x) => x !== id))} />
      <Botao bloco variante="secundario" onClick={() => setSeletorAberto(true)} className="lk-espaco">
        {escolhidas.length ? 'Adicionar ou trocar peças' : '+ Escolher peças do closet'}
      </Botao>

      <AvisosLook pecas={escolhidas} />

      <CampoTexto rotulo="Nome (opcional)" valor={nome} aoMudar={setNome} placeholder="ex.: Audiência de terça" />
      <Selecao rotulo="Ocasião" opcoes={OCASIOES} valor={ocasiao} aoMudar={setOcasiao} vazio="Sem ocasião" />
      <CampoArea rotulo="Observações" valor={observacoes} aoMudar={setObservacoes} />

      {erro && (
        <p className="campo-erro" role="alert">
          {erro}
        </p>
      )}
      <Botao bloco onClick={salvar} carregando={salvando}>
        Salvar look
      </Botao>

      <SeletorPecas
        aberto={seletorAberto}
        selecionadas={pecaIds}
        aoFechar={() => setSeletorAberto(false)}
        aoConfirmar={(ids) => {
          setPecaIds(ids);
          setSeletorAberto(false);
        }}
      />
    </>
  );
}
