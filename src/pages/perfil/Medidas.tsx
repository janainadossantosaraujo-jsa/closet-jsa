import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Botao, Cabecalho, CampoArea, CampoNumero, CampoTexto, ModalConfirmacao, Selecao } from '../../components';
import { useMedidasCorporais } from '../../db/hooks';
import {
  conferirRegistroMedida,
  definirMedidaAtual,
  registroAtual,
  registrarMedidaCorporal,
  removerRegistroMedida,
  resolverConflitoMedida,
} from '../../db/repo';
import {
  ORIGENS_DADO,
  REGIOES_MEDIDA,
  rotuloDe,
  type MedidaCorporal,
  type OrigemDado,
  type RegiaoMedida,
  type RegistroMedidaCorporal,
} from '../../db/schema';
import { COMO_MEDIR, DICA_GERAL } from './comoMedir';
import { AvisoPrivacidadeMedidas, SeloOrigem } from './comum';
import { diaParaISO, formatarCm, formatarData, historicoOrdenado, hojeDia } from './util';

const EXPLICA_ORIGEM: Record<OrigemDado, string> = {
  informado: 'Informado: você anotou o valor (de memória ou de outra fonte).',
  estimado: 'Estimado: valor aproximado, ainda não medido.',
  conferido: 'Conferido: medido com fita e confirmado por você.',
};

// ---------------------------------------------------------------------------
// Lista
// ---------------------------------------------------------------------------

export function ListaMedidas() {
  const medidas = useMedidasCorporais();
  const porRegiao = new Map((medidas ?? []).map((m) => [m.regiao, m]));
  const conflitos = (medidas ?? []).filter((m) => m.conflito).length;

  return (
    <>
      <Cabecalho titulo="Medidas do corpo" voltar="/perfil" />
      <AvisoPrivacidadeMedidas />
      {conflitos > 0 && (
        <p className="aviso" role="status">
          {conflitos === 1 ? '1 medida tem' : `${conflitos} medidas têm`} valores diferentes aguardando sua escolha.
        </p>
      )}
      {medidas === undefined ? (
        <p className="texto-suave">Carregando…</p>
      ) : (
        <ul className="pf-lista" aria-label="Regiões do corpo">
          {REGIOES_MEDIDA.map((r) => {
            const m = porRegiao.get(r.valor);
            const atual = registroAtual(m);
            return (
              <li key={r.valor}>
                <Link className="pf-item" to={`/perfil/medidas/${r.valor}`}>
                  <span className="pf-item-principal">
                    <strong>{r.rotulo}</strong>
                    {atual ? (
                      <span className="pf-item-detalhe">
                        {formatarData(atual.data)} · <SeloOrigem origem={atual.origem} />
                      </span>
                    ) : (
                      <span className="pf-item-detalhe">Sem medida</span>
                    )}
                    {m?.conflito && <span className="pf-selo pf-selo-conflito">Escolha pendente</span>}
                  </span>
                  <span className="pf-item-valor">{atual ? formatarCm(atual.valor) : '—'}</span>
                  <span className="pf-seta" aria-hidden="true">›</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Detalhe da região: valor vigente, conflito, nova medida e histórico
// ---------------------------------------------------------------------------

type Pendente =
  | { acao: 'usar'; registro: RegistroMedidaCorporal }
  | { acao: 'conferir'; registro: RegistroMedidaCorporal }
  | { acao: 'remover'; registro: RegistroMedidaCorporal };

export function DetalheMedida() {
  const { regiao } = useParams();
  const opcao = REGIOES_MEDIDA.find((r) => r.valor === regiao);
  const medidas = useMedidasCorporais();

  if (!opcao) {
    return (
      <>
        <Cabecalho titulo="Medida" voltar="/perfil/medidas" />
        <p className="placeholder">Região não encontrada.</p>
      </>
    );
  }
  if (medidas === undefined) {
    return (
      <>
        <Cabecalho titulo={opcao.rotulo} voltar="/perfil/medidas" />
        <p className="texto-suave">Carregando…</p>
      </>
    );
  }
  return <DetalheRegiao regiao={opcao.valor} rotulo={opcao.rotulo} medida={medidas.find((m) => m.regiao === opcao.valor)} />;
}

function DetalheRegiao({ regiao, rotulo, medida }: { regiao: RegiaoMedida; rotulo: string; medida: MedidaCorporal | undefined }) {
  const atual = registroAtual(medida);
  const historico = historicoOrdenado(medida);

  const [valor, setValor] = useState<number | undefined>();
  const [origem, setOrigem] = useState<OrigemDado>('informado');
  const [dia, setDia] = useState(hojeDia());
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string>();
  const [erro, setErro] = useState<string>();
  const [pendente, setPendente] = useState<Pendente>();
  const [executando, setExecutando] = useState(false);

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setMensagem(undefined);
    if (valor === undefined || valor <= 0) {
      setErro('Informe o valor em centímetros.');
      return;
    }
    setSalvando(true);
    try {
      const r = await registrarMedidaCorporal(regiao, valor, origem, {
        data: diaParaISO(dia),
        observacao: observacao.trim() || undefined,
      });
      if (r.virouAtual) setMensagem(`${formatarCm(valor)} agora é o valor usado para ${rotulo.toLowerCase()}.`);
      else if (r.conflito)
        setMensagem('O novo valor é diferente do valor conferido. Escolha abaixo qual deve ser usado.');
      else
        setMensagem(
          `Guardado no histórico. O valor usado continua ${atual ? formatarCm(atual.valor) : ''} (${rotuloDe(ORIGENS_DADO, atual?.origem).toLowerCase()}). Para trocar, toque em "Usar este valor" no histórico.`,
        );
      setValor(undefined);
      setObservacao('');
      setDia(hojeDia());
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar a medida.');
    } finally {
      setSalvando(false);
    }
  }

  async function executar(fn: () => Promise<void>, ok: string) {
    setErro(undefined);
    setExecutando(true);
    try {
      await fn();
      setMensagem(ok);
      setPendente(undefined);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível concluir.');
    } finally {
      setExecutando(false);
    }
  }

  function usar(r: RegistroMedidaCorporal) {
    // Trocar um valor conferido por outro não conferido sempre pede confirmação (D06).
    if (atual?.origem === 'conferido' && r.origem !== 'conferido') setPendente({ acao: 'usar', registro: r });
    else void executar(() => definirMedidaAtual(regiao, r.id), `${formatarCm(r.valor)} agora é o valor usado.`);
  }

  function confirmarPendente() {
    if (!pendente) return;
    const r = pendente.registro;
    if (pendente.acao === 'usar') void executar(() => definirMedidaAtual(regiao, r.id), `${formatarCm(r.valor)} agora é o valor usado.`);
    if (pendente.acao === 'conferir')
      void executar(() => conferirRegistroMedida(regiao, r.id), `${formatarCm(r.valor)} marcado como conferido e em uso.`);
    if (pendente.acao === 'remover') void executar(() => removerRegistroMedida(regiao, r.id), 'Registro removido do histórico.');
  }

  const conflito = medida?.conflito;
  const regConferido = conflito ? medida?.historico.find((r) => r.id === conflito.conferidoId) : undefined;
  const regDivergente = conflito ? medida?.historico.find((r) => r.id === conflito.divergenteId) : undefined;

  return (
    <>
      <Cabecalho titulo={rotulo} voltar="/perfil/medidas" />

      <section className="cartao" aria-labelledby="pf-atual">
        <h2 id="pf-atual">Valor usado</h2>
        {atual ? (
          <>
            <p className="pf-valor-grande">{formatarCm(atual.valor)}</p>
            <p className="pf-item-detalhe">
              {formatarData(atual.data)} · <SeloOrigem origem={atual.origem} />
            </p>
            {atual.observacao && <p className="texto-suave">{atual.observacao}</p>}
            {atual.origem !== 'conferido' && (
              <Botao variante="secundario" bloco onClick={() => setPendente({ acao: 'conferir', registro: atual })}>
                Marcar como conferida
              </Botao>
            )}
          </>
        ) : (
          <p className="texto-suave">Ainda sem medida. Ela é opcional, mas ajuda a estimar se uma peça tende a servir.</p>
        )}
      </section>

      {conflito && regConferido && regDivergente && (
        <section className="cartao pf-conflito" aria-labelledby="pf-conflito">
          <h2 id="pf-conflito">Valores diferentes</h2>
          <p>
            O valor conferido é <strong>{formatarCm(regConferido.valor)}</strong> ({formatarData(regConferido.data)}), e o
            novo, {rotuloDe(ORIGENS_DADO, regDivergente.origem).toLowerCase()}, é{' '}
            <strong>{formatarCm(regDivergente.valor)}</strong> ({formatarData(regDivergente.data)}). Nada foi trocado.
            Qual deve ser usado?
          </p>
          <div className="pilha">
            <Botao
              bloco
              carregando={executando}
              onClick={() => void executar(() => resolverConflitoMedida(regiao, 'manter_conferido'), 'Mantido o valor conferido.')}
            >
              Manter conferido ({formatarCm(regConferido.valor)})
            </Botao>
            <Botao
              variante="secundario"
              bloco
              disabled={executando}
              onClick={() =>
                void executar(() => resolverConflitoMedida(regiao, 'usar_novo'), `${formatarCm(regDivergente.valor)} agora é o valor usado.`)
              }
            >
              Usar novo ({formatarCm(regDivergente.valor)})
            </Botao>
          </div>
          <p className="campo-dica">Os dois continuam guardados no histórico.</p>
        </section>
      )}

      {mensagem && (
        <p className="pf-mensagem" role="status">
          {mensagem}
        </p>
      )}
      {erro && (
        <p className="campo-erro" role="alert">
          {erro}
        </p>
      )}

      <details className="cartao pf-como-medir" open={!atual}>
        <summary>Como medir</summary>
        <p>{COMO_MEDIR[regiao]}</p>
        <p className="texto-suave">{DICA_GERAL}</p>
      </details>

      <form className="cartao" onSubmit={adicionar} aria-labelledby="pf-nova">
        <h2 id="pf-nova">Nova medida</h2>
        <CampoNumero rotulo="Valor" unidade="cm" valor={valor} aoMudar={setValor} required />
        <Selecao
          rotulo="Origem"
          opcoes={ORIGENS_DADO}
          valor={origem}
          aoMudar={(v) => setOrigem(v ?? 'informado')}
          obrigatorio
          dica={EXPLICA_ORIGEM[origem]}
        />
        <CampoTexto rotulo="Data" type="date" valor={dia} max={hojeDia()} aoMudar={(v) => setDia(v || hojeDia())} />
        <CampoArea rotulo="Observação (opcional)" valor={observacao} aoMudar={setObservacao} rows={2} />
        {atual?.origem === 'conferido' && origem !== 'conferido' && (
          <p className="campo-dica">
            Já existe um valor conferido. O novo fica no histórico e, se for diferente, você escolhe qual usar.
          </p>
        )}
        <Botao type="submit" bloco carregando={salvando}>
          Adicionar medida
        </Botao>
      </form>

      {historico.length > 0 && (
        <section aria-labelledby="pf-historico">
          <h2 id="pf-historico" className="pf-subtitulo">
            Histórico
          </h2>
          <ul className="pf-historico">
            {historico.map((r) => {
              const vigente = r.id === medida?.atualId;
              return (
                <li key={r.id} className={`cartao${vigente ? ' pf-vigente' : ''}`}>
                  <div className="pf-historico-topo">
                    <strong>{formatarCm(r.valor)}</strong>
                    <SeloOrigem origem={r.origem} />
                    {vigente && <span className="pf-selo pf-selo-vigente">Em uso</span>}
                  </div>
                  <p className="pf-item-detalhe">{formatarData(r.data)}</p>
                  {r.observacao && <p className="texto-suave">{r.observacao}</p>}
                  <div className="pf-acoes">
                    {!vigente && (
                      <Botao variante="secundario" disabled={executando} onClick={() => usar(r)}>
                        Usar este valor
                      </Botao>
                    )}
                    {r.origem !== 'conferido' && (
                      <Botao variante="fantasma" disabled={executando} onClick={() => setPendente({ acao: 'conferir', registro: r })}>
                        Marcar como conferida
                      </Botao>
                    )}
                    <Botao variante="fantasma" disabled={executando} onClick={() => setPendente({ acao: 'remover', registro: r })}>
                      Remover
                    </Botao>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <ModalConfirmacao
        aberto={pendente !== undefined}
        titulo={
          pendente?.acao === 'remover'
            ? 'Remover este registro?'
            : pendente?.acao === 'conferir'
              ? 'Marcar como conferida?'
              : 'Trocar o valor conferido?'
        }
        textoConfirmar={pendente?.acao === 'remover' ? 'Remover' : pendente?.acao === 'conferir' ? 'Marcar como conferida' : 'Usar este valor'}
        perigoso={pendente?.acao === 'remover'}
        carregando={executando}
        aoConfirmar={confirmarPendente}
        aoCancelar={() => setPendente(undefined)}
      >
        {pendente?.acao === 'remover' && (
          <p>
            {formatarCm(pendente.registro.valor)} de {formatarData(pendente.registro.data)} sai do histórico.
            {pendente.registro.id === medida?.atualId && ' Como é o valor em uso, o app passa a usar o melhor registro restante.'}
          </p>
        )}
        {pendente?.acao === 'conferir' && (
          <p>Confirme que {formatarCm(pendente.registro.valor)} foi medido com fita. Ele passa a ser o valor usado.</p>
        )}
        {pendente?.acao === 'usar' && atual && (
          <p>
            O valor em uso foi conferido ({formatarCm(atual.valor)}). Usar {formatarCm(pendente.registro.valor)} (
            {rotuloDe(ORIGENS_DADO, pendente.registro.origem).toLowerCase()}) no lugar? O conferido continua no histórico.
          </p>
        )}
      </ModalConfirmacao>
    </>
  );
}
