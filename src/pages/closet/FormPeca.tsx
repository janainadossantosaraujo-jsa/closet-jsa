import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Botao,
  Cabecalho,
  CampoArea,
  CampoTexto,
  Chips,
  MiniaturaBlob,
  Selecao,
  SeletorFoto,
} from '../../components';
import { usePecas } from '../../db/hooks';
import { atualizarPeca, criarPeca } from '../../db/repo';
import {
  CATEGORIAS,
  DESCONFORTOS,
  DISPONIBILIDADES,
  ELASTICIDADES,
  ESTACOES,
  ESTRUTURAS,
  OCASIOES,
  TIPOS_MIDIA_PECA,
  VESTE_BEM,
  type Peca,
  type TipoMidiaPeca,
} from '../../db/schema';
import { CampoSugestoes } from './CampoSugestoes';
import { EditorMedidas } from './EditorMedidas';
import { Secao } from './Secao';
import { usePecaOuNula } from './usePecaOuNula';
import {
  dadosDoForm,
  formDePeca,
  formVazio,
  medidaCompleta,
  preenchidos,
  semIndefinidos,
  tipoFotoPadrao,
  validarForm,
  valoresUsados,
  type ErrosForm,
  type FormPecaEstado,
} from './util';

interface FotoPendente {
  arquivo: File;
  tipo: TipoMidiaPeca;
}

const ID_NOME = 'closet-campo-nome';

function resumo(n: number): string | undefined {
  return n ? `${n} preenchido${n > 1 ? 's' : ''}` : undefined;
}

/** Rota /nova. */
export function NovaPecaPagina() {
  return <FormPeca />;
}

/** Rota /peca/:id/editar. */
export function EditarPecaPagina() {
  const { id } = useParams();
  const peca = usePecaOuNula(id);
  if (peca === undefined) return <p className="texto-suave">Carregando…</p>;
  if (peca === null) return <PecaNaoEncontrada />;
  return <FormPeca key={peca.id} peca={peca} />;
}

export function PecaNaoEncontrada() {
  return (
    <>
      <Cabecalho titulo="Peça não encontrada" voltar="/" />
      <div className="placeholder">
        <p>Esta peça não existe mais (pode ter sido apagada).</p>
        <Link to="/" className="botao botao-secundario">Voltar ao closet</Link>
      </div>
    </>
  );
}

/** Cadastro rápido (sem `peca`) ou edição (com `peca`). B3–B6. */
function FormPeca({ peca }: { peca?: Peca }) {
  const navegar = useNavigate();
  const editando = !!peca;
  const todas = usePecas();
  const [f, setF] = useState<FormPecaEstado>(() => (peca ? formDePeca(peca) : formVazio()));
  const [fotos, setFotos] = useState<FotoPendente[]>([]);
  const [erros, setErros] = useState<ErrosForm>({});
  const [salvando, setSalvando] = useState(false);
  const [falha, setFalha] = useState<string>();

  const mudar = (parcial: Partial<FormPecaEstado>) => {
    setF((atual) => ({ ...atual, ...parcial }));
    if (parcial.nome !== undefined && erros.nome) setErros((e) => ({ ...e, nome: undefined }));
    if (parcial.categoria !== undefined && erros.categoria) setErros((e) => ({ ...e, categoria: undefined }));
  };

  const sugestoes = useMemo(() => {
    const ps = todas ?? [];
    return {
      localizacao: valoresUsados(ps, (p) => p.localizacao),
      cor: valoresUsados(ps, (p) => p.cor),
      estampa: valoresUsados(ps, (p) => p.estampa),
      tecido: valoresUsados(ps, (p) => p.tecido),
      marca: valoresUsados(ps, (p) => p.marca),
      tamanho: valoresUsados(ps, (p) => p.tamanhoEtiqueta),
    };
  }, [todas]);

  function mudarFotos(arquivos: File[]) {
    // O SeletorFoto devolve a lista inteira; mantém o tipo das que já estavam.
    setFotos((atuais) =>
      arquivos.map((arquivo, i) => {
        const existente = atuais.find((a) => a.arquivo === arquivo);
        return existente ?? { arquivo, tipo: tipoFotoPadrao(i) };
      }),
    );
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const v = validarForm(f);
    setErros(v);
    if (v.nome || v.categoria) {
      document.getElementById(v.nome ? ID_NOME : 'closet-campo-categoria')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      if (v.nome) document.getElementById(ID_NOME)?.focus({ preventScroll: true });
      return;
    }
    setSalvando(true);
    setFalha(undefined);
    try {
      if (peca) {
        await atualizarPeca(peca.id, dadosDoForm(f, peca.medidas));
        navegar(`/peca/${peca.id}`, { replace: true });
      } else {
        const nova = await criarPeca(
          semIndefinidos(dadosDoForm(f)),
          fotos.map((p) => ({ arquivo: p.arquivo, tipo: p.tipo })),
        );
        navegar(`/peca/${nova.id}`, { replace: true });
      }
    } catch (err) {
      setFalha(err instanceof Error ? err.message : 'Não foi possível salvar. Tente de novo.');
      setSalvando(false);
    }
  }

  const medidasValidas = f.medidas.filter(medidaCompleta).length;

  return (
    <form className="closet-form" onSubmit={salvar} noValidate>
      <Cabecalho titulo={editando ? 'Editar peça' : 'Nova peça'} voltar={peca ? `/peca/${peca.id}` : '/'} />

      {!editando && (
        <>
          <SeletorFoto
            rotulo="Fotos (frente, costas, detalhes, etiqueta)"
            fotos={fotos.map((p) => p.arquivo)}
            aoMudar={mudarFotos}
            mostrarPrevias={false}
          />
          {fotos.length > 0 && (
            <ul className="closet-fotos-pendentes">
              {fotos.map((p, i) => (
                <li key={`${p.arquivo.name}-${p.arquivo.size}-${p.arquivo.lastModified}-${i}`}>
                  <MiniaturaBlob blob={p.arquivo} alt={`Foto ${i + 1}`} />
                  <label className="so-leitor" htmlFor={`closet-tipo-foto-${i}`}>Tipo da foto {i + 1}</label>
                  <select
                    id={`closet-tipo-foto-${i}`}
                    value={p.tipo}
                    onChange={(e) => {
                      const tipo = e.target.value as TipoMidiaPeca;
                      setFotos((fs) => fs.map((x, j) => (j === i ? { ...x, tipo } : x)));
                    }}
                  >
                    {TIPOS_MIDIA_PECA.map((t) => (
                      <option key={t.valor} value={t.valor}>{t.rotulo}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="grade-fotos-remover"
                    aria-label={`Remover foto ${i + 1}`}
                    onClick={() => setFotos((fs) => fs.filter((_, j) => j !== i))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          {fotos.length > 0 && <p className="campo-dica">A primeira foto é a capa. Depois você pode reordenar.</p>}
        </>
      )}

      <CampoTexto
        id={ID_NOME}
        rotulo="Nome *"
        valor={f.nome}
        aoMudar={(nome) => mudar({ nome })}
        erro={erros.nome}
        placeholder="ex.: Blusa azul de linho"
        autoCapitalize="sentences"
        enterKeyHint="next"
      />
      <div id="closet-campo-categoria">
        <Selecao
          rotulo="Categoria *"
          opcoes={CATEGORIAS}
          valor={f.categoria}
          aoMudar={(categoria) => mudar({ categoria })}
          obrigatorio
          vazio="Escolha…"
        />
        {erros.categoria && <p className="campo-erro closet-erro-solto">{erros.categoria}</p>}
      </div>

      <p className="texto-suave closet-opcional">Tudo abaixo é opcional — preencha agora ou depois.</p>

      <Secao titulo="Cor e estampa" resumo={resumo(preenchidos(f.cor, f.estampa))}>
        <CampoSugestoes rotulo="Cor" valor={f.cor} aoMudar={(cor) => mudar({ cor })} valores={sugestoes.cor} placeholder="ex.: azul-marinho" />
        <CampoSugestoes rotulo="Estampa" valor={f.estampa} aoMudar={(estampa) => mudar({ estampa })} valores={sugestoes.estampa} placeholder="ex.: lisa, listrada, floral" />
      </Secao>

      <Secao titulo="Tecido e caimento" resumo={resumo(preenchidos(f.tecido, f.composicao, f.elasticidade, f.estrutura))}>
        <CampoSugestoes rotulo="Tecido" valor={f.tecido} aoMudar={(tecido) => mudar({ tecido })} valores={sugestoes.tecido} placeholder="ex.: linho, malha, jeans" />
        <CampoTexto rotulo="Composição (etiqueta)" valor={f.composicao} aoMudar={(composicao) => mudar({ composicao })} placeholder="ex.: 95% algodão, 5% elastano" />
        <Chips rotulo="Elasticidade" opcoes={ELASTICIDADES} unico valor={f.elasticidade ? [f.elasticidade] : []} aoMudar={(v) => mudar({ elasticidade: v[0] })} />
        <Chips rotulo="Estrutura do tecido" opcoes={ESTRUTURAS} unico valor={f.estrutura ? [f.estrutura] : []} aoMudar={(v) => mudar({ estrutura: v[0] })} />
      </Secao>

      <Secao titulo="Tamanho e medidas da peça" resumo={resumo(preenchidos(f.tamanhoEtiqueta, f.marca) + medidasValidas)}>
        <div className="closet-duas-colunas">
          <CampoSugestoes rotulo="Tamanho da etiqueta" valor={f.tamanhoEtiqueta} aoMudar={(tamanhoEtiqueta) => mudar({ tamanhoEtiqueta })} valores={sugestoes.tamanho} placeholder="ex.: GG, 48" />
          <CampoSugestoes rotulo="Marca" valor={f.marca} aoMudar={(marca) => mudar({ marca })} valores={sugestoes.marca} />
        </div>
        <EditorMedidas linhas={f.medidas} aoMudar={(medidas) => mudar({ medidas })} />
      </Secao>

      <Secao titulo="Ocasiões e clima" resumo={resumo(f.ocasioes.length + f.estacoes.length)}>
        <Chips rotulo="Ocasiões" opcoes={OCASIOES} valor={f.ocasioes} aoMudar={(ocasioes) => mudar({ ocasioes })} />
        <Chips rotulo="Estação / calor" opcoes={ESTACOES} valor={f.estacoes} aoMudar={(estacoes) => mudar({ estacoes })} />
      </Secao>

      <Secao titulo="Conforto" resumo={resumo(preenchidos(f.vesteBem, f.desconfortos, f.observacoesConforto))}>
        <Chips rotulo="Veste bem?" opcoes={VESTE_BEM} unico valor={f.vesteBem ? [f.vesteBem] : []} aoMudar={(v) => mudar({ vesteBem: v[0] })} />
        <Chips rotulo="Desconfortos" opcoes={DESCONFORTOS} valor={f.desconfortos} aoMudar={(desconfortos) => mudar({ desconfortos })} />
        <CampoArea
          rotulo="Observações de conforto"
          valor={f.observacoesConforto}
          aoMudar={(observacoesConforto) => mudar({ observacoesConforto })}
          placeholder="ex.: aperta só quando sento por muito tempo"
          rows={3}
        />
      </Secao>

      <Secao titulo="Onde fica e disponibilidade" resumo={resumo(preenchidos(f.localizacao) + (f.disponibilidade !== 'disponivel' ? 1 : 0))}>
        <CampoSugestoes
          rotulo="Localização"
          valor={f.localizacao}
          aoMudar={(localizacao) => mudar({ localizacao })}
          valores={sugestoes.localizacao}
          placeholder="ex.: armário do quarto, gaveta 2"
          botoes
        />
        <Chips
          rotulo="Disponibilidade"
          opcoes={DISPONIBILIDADES}
          unico
          valor={[f.disponibilidade]}
          aoMudar={(v) => v[0] && mudar({ disponibilidade: v[0] })}
        />
      </Secao>

      <Secao titulo="Outros" resumo={resumo(preenchidos(f.observacoes, f.favorita))}>
        <Chips
          rotulo="Favorita"
          opcoes={[{ valor: 'sim', rotulo: '★ Favorita' }] as const}
          valor={f.favorita ? ['sim'] : []}
          aoMudar={(v) => mudar({ favorita: v.length > 0 })}
        />
        <CampoArea rotulo="Observações" valor={f.observacoes} aoMudar={(observacoes) => mudar({ observacoes })} rows={3} />
      </Secao>

      {falha && <p className="aviso" role="alert">{falha}</p>}

      <div className="closet-barra-salvar">
        <Botao type="submit" bloco carregando={salvando}>
          {editando ? 'Salvar alterações' : fotos.length ? `Salvar peça (${fotos.length} foto${fotos.length > 1 ? 's' : ''})` : 'Salvar peça'}
        </Botao>
      </div>
    </form>
  );
}
