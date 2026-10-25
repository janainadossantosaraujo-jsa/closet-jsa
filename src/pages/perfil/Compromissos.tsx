import { useState, type FormEvent } from 'react';
import { Botao, Cabecalho, CampoArea, CampoTexto, ModalConfirmacao, Selecao } from '../../components';
import {
  NIVEIS_FORMALIDADE,
  OCASIOES,
  rotuloDe,
  type NivelFormalidade,
  type Ocasiao,
  type Perfil,
  type TipoCompromisso,
} from '../../db/schema';
import { ComPerfil } from './ComPerfil';
import { StatusSalvo, useSalvarPerfil } from './comum';
import { adicionarTipoCompromisso, atualizarTipoCompromisso, removerTipoCompromisso } from './util';

export function PaginaCompromissos() {
  return (
    <>
      <Cabecalho titulo="Tipos de compromisso" voltar="/perfil" />
      <ComPerfil>{(perfil) => <EditorCompromissos perfil={perfil} />}</ComPerfil>
    </>
  );
}

function EditorCompromissos({ perfil }: { perfil: Perfil }) {
  const { estado, salvar } = useSalvarPerfil();
  const [nome, setNome] = useState('');
  const [formalidade, setFormalidade] = useState<NivelFormalidade | undefined>();
  const [editando, setEditando] = useState<string>();
  const [removendo, setRemovendo] = useState<TipoCompromisso>();
  const lista = perfil.tiposCompromisso;

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    if (await salvar({ tiposCompromisso: adicionarTipoCompromisso(lista, nome, formalidade) })) {
      setNome('');
      setFormalidade(undefined);
    }
  }

  return (
    <>
      <p className="texto-suave">
        Os compromissos da sua rotina e o nível de formalidade de cada um. Eles aparecem no planejamento da semana.
      </p>
      <StatusSalvo estado={estado} />

      {lista.length === 0 ? (
        <p className="placeholder">Nenhum tipo cadastrado ainda.</p>
      ) : (
        <ul className="pf-lista">
          {lista.map((t) =>
            editando === t.id ? (
              <li key={t.id}>
                <FormTipo
                  tipo={t}
                  salvando={estado === 'salvando'}
                  aoCancelar={() => setEditando(undefined)}
                  aoSalvar={async (alt) => {
                    if (await salvar({ tiposCompromisso: atualizarTipoCompromisso(lista, t.id, alt) })) setEditando(undefined);
                  }}
                />
              </li>
            ) : (
              <li key={t.id} className="cartao pf-tipo">
                <div className="pf-item-principal">
                  <strong>{t.nome}</strong>
                  <span className="pf-item-detalhe">
                    {t.formalidade ? rotuloDe(NIVEIS_FORMALIDADE, t.formalidade) : 'Formalidade não definida'}
                    {t.ocasiao && ` · ${rotuloDe(OCASIOES, t.ocasiao)}`}
                  </span>
                  {t.observacoes && <span className="pf-item-detalhe">{t.observacoes}</span>}
                </div>
                <div className="pf-acoes">
                  <Botao variante="secundario" onClick={() => setEditando(t.id)}>
                    Editar
                  </Botao>
                  <Botao variante="fantasma" onClick={() => setRemovendo(t)}>
                    Remover
                  </Botao>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      <form className="cartao" onSubmit={adicionar}>
        <h2>Novo tipo</h2>
        <CampoTexto rotulo="Nome" valor={nome} aoMudar={setNome} placeholder="Ex.: audiência, plantão, almoço com amigas" required />
        <Selecao rotulo="Formalidade" opcoes={NIVEIS_FORMALIDADE} valor={formalidade} aoMudar={setFormalidade} vazio="Definir depois" />
        <Botao type="submit" bloco disabled={!nome.trim()} carregando={estado === 'salvando'}>
          Adicionar
        </Botao>
      </form>

      <ModalConfirmacao
        aberto={removendo !== undefined}
        titulo={`Remover "${removendo?.nome ?? ''}"?`}
        textoConfirmar="Remover"
        perigoso
        carregando={estado === 'salvando'}
        aoCancelar={() => setRemovendo(undefined)}
        aoConfirmar={async () => {
          if (removendo && (await salvar({ tiposCompromisso: removerTipoCompromisso(lista, removendo.id) }))) setRemovendo(undefined);
        }}
      >
        <p>Compromissos já marcados na semana com esse tipo continuam lá, mas sem o tipo.</p>
      </ModalConfirmacao>
    </>
  );
}

function FormTipo({
  tipo,
  salvando,
  aoSalvar,
  aoCancelar,
}: {
  tipo: TipoCompromisso;
  salvando: boolean;
  aoSalvar: (alt: Partial<Omit<TipoCompromisso, 'id'>>) => void;
  aoCancelar: () => void;
}) {
  const [nome, setNome] = useState(tipo.nome);
  const [formalidade, setFormalidade] = useState(tipo.formalidade);
  const [ocasiao, setOcasiao] = useState<Ocasiao | undefined>(tipo.ocasiao);
  const [observacoes, setObservacoes] = useState(tipo.observacoes ?? '');
  return (
    <form
      className="cartao"
      onSubmit={(e) => {
        e.preventDefault();
        aoSalvar({ nome, formalidade, ocasiao, observacoes: observacoes.trim() || undefined });
      }}
    >
      <CampoTexto rotulo="Nome" valor={nome} aoMudar={setNome} required />
      <Selecao rotulo="Formalidade" opcoes={NIVEIS_FORMALIDADE} valor={formalidade} aoMudar={setFormalidade} vazio="Não definida" />
      <Selecao rotulo="Ocasião (para sugestões)" opcoes={OCASIOES} valor={ocasiao} aoMudar={setOcasiao} vazio="Nenhuma" />
      <CampoArea rotulo="Observações (opcional)" valor={observacoes} aoMudar={setObservacoes} rows={2} />
      <div className="pilha">
        <Botao type="submit" bloco disabled={!nome.trim()} carregando={salvando}>
          Salvar
        </Botao>
        <Botao variante="secundario" bloco onClick={aoCancelar} disabled={salvando}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
