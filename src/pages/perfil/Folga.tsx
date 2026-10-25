import { useState } from 'react';
import { Botao, Cabecalho, CampoArea, CampoNumero, Chips, Selecao } from '../../components';
import {
  agoraISO,
  DESCONFORTOS,
  PREFERENCIAS_FOLGA,
  REGIOES_FOLGA,
  rotuloDe,
  type Desconforto,
  type Perfil,
  type PreferenciaFolga,
  type PreferenciaFolgaRegiao,
  type RegiaoFolga,
} from '../../db/schema';
import { ComPerfil } from './ComPerfil';
import { StatusSalvo, useSalvarPerfil } from './comum';
import { definirFolga, formatarCm, removerFolga } from './util';

const REGIOES_DE_CIMA: readonly RegiaoFolga[] = ['parte_de_cima', 'busto', 'ombros', 'bracos_cava'];

export function PaginaFolga() {
  return (
    <>
      <Cabecalho titulo="Folga e conforto" voltar="/perfil" />
      <ComPerfil>{(perfil) => <EditorFolga perfil={perfil} />}</ComPerfil>
    </>
  );
}

function EditorFolga({ perfil }: { perfil: Perfil }) {
  const { estado, salvar } = useSalvarPerfil();
  const [editando, setEditando] = useState<RegiaoFolga>();
  const porRegiao = new Map(perfil.preferenciasFolga.map((p) => [p.regiao, p]));

  async function gravar(pref: PreferenciaFolgaRegiao) {
    const alteracoes: Partial<Perfil> = { preferenciasFolga: definirFolga(perfil.preferenciasFolga, pref) };
    // Justa na parte de cima também entra nos desconfortos a evitar nas sugestões (D25).
    if (pref.evitarJusta && REGIOES_DE_CIMA.includes(pref.regiao) && !perfil.desconfortosEvitar.includes('justa_em_cima')) {
      alteracoes.desconfortosEvitar = [...perfil.desconfortosEvitar, 'justa_em_cima'];
    }
    if (await salvar(alteracoes)) setEditando(undefined);
  }

  async function apagar(regiao: RegiaoFolga) {
    if (await salvar({ preferenciasFolga: removerFolga(perfil.preferenciasFolga, regiao) })) setEditando(undefined);
  }

  return (
    <>
      <p className="texto-suave">
        Quanto de folga você gosta em cada parte do corpo. Entra na estimativa de caimento: pouca folga onde você não gosta
        de roupa justa reduz o nível.
      </p>
      <StatusSalvo estado={estado} />
      <ul className="pf-lista">
        {REGIOES_FOLGA.map((r) => {
          const p = porRegiao.get(r.valor);
          if (editando === r.valor) {
            return (
              <li key={r.valor}>
                <FormFolga
                  regiao={r.valor}
                  rotulo={r.rotulo}
                  atual={p}
                  salvando={estado === 'salvando'}
                  aoSalvar={gravar}
                  aoRemover={p ? () => void apagar(r.valor) : undefined}
                  aoCancelar={() => setEditando(undefined)}
                />
              </li>
            );
          }
          return (
            <li key={r.valor}>
              <button type="button" className="pf-item" onClick={() => setEditando(r.valor)} aria-label={`Editar folga: ${r.rotulo}`}>
                <span className="pf-item-principal">
                  <strong>{r.rotulo}</strong>
                  <span className="pf-item-detalhe">
                    {p ? rotuloDe(PREFERENCIAS_FOLGA, p.preferencia) : 'Sem preferência'}
                    {p?.folgaMinimaCm !== undefined && ` · folga mínima ${formatarCm(p.folgaMinimaCm)}`}
                  </span>
                  {p?.evitarJusta && <span className="pf-selo pf-selo-conflito">Não gosta de justa</span>}
                  {p?.observacao && <span className="pf-item-detalhe">{p.observacao}</span>}
                </span>
                <span className="pf-seta" aria-hidden="true">
                  ✎
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <section className="cartao">
        <h2>Evitar nas sugestões</h2>
        <Chips<Desconforto>
          rotulo="Desconfortos que as sugestões de look devem evitar"
          opcoes={DESCONFORTOS}
          valor={perfil.desconfortosEvitar}
          aoMudar={(v) => void salvar({ desconfortosEvitar: v })}
        />
      </section>
    </>
  );
}

interface FormFolgaProps {
  regiao: RegiaoFolga;
  rotulo: string;
  atual: PreferenciaFolgaRegiao | undefined;
  salvando: boolean;
  aoSalvar: (p: PreferenciaFolgaRegiao) => void;
  aoRemover?: () => void;
  aoCancelar: () => void;
}

function FormFolga({ regiao, rotulo, atual, salvando, aoSalvar, aoRemover, aoCancelar }: FormFolgaProps) {
  const [preferencia, setPreferencia] = useState<PreferenciaFolga>(atual?.preferencia ?? 'confortavel');
  const [evitarJusta, setEvitarJusta] = useState(atual?.evitarJusta ?? false);
  const [folga, setFolga] = useState<number | undefined>(atual?.folgaMinimaCm);
  const [observacao, setObservacao] = useState(atual?.observacao ?? '');

  return (
    <form
      className="cartao"
      onSubmit={(e) => {
        e.preventDefault();
        aoSalvar({
          regiao,
          preferencia,
          evitarJusta,
          folgaMinimaCm: folga,
          observacao: observacao.trim() || undefined,
          origem: 'informado',
          data: agoraISO(),
        });
      }}
    >
      <h2>{rotulo}</h2>
      <Selecao
        rotulo="Como gosta que a roupa fique"
        opcoes={PREFERENCIAS_FOLGA}
        valor={preferencia}
        aoMudar={(v) => setPreferencia(v ?? 'confortavel')}
        obrigatorio
      />
      <label className="pf-checkbox">
        <input type="checkbox" checked={evitarJusta} onChange={(e) => setEvitarJusta(e.target.checked)} />
        <span>Roupa justa aqui me incomoda</span>
      </label>
      <CampoNumero
        rotulo="Folga mínima (opcional)"
        unidade="cm"
        valor={folga}
        aoMudar={setFolga}
        dica="Quanto a peça deve ter a mais que o corpo nessa região, em volta inteira."
      />
      <CampoArea rotulo="Observação (opcional)" valor={observacao} aoMudar={setObservacao} rows={2} />
      <div className="pilha">
        <Botao type="submit" bloco carregando={salvando}>
          Salvar
        </Botao>
        <Botao variante="secundario" bloco onClick={aoCancelar} disabled={salvando}>
          Cancelar
        </Botao>
        {aoRemover && (
          <Botao variante="fantasma" bloco onClick={aoRemover} disabled={salvando}>
            Tirar preferência desta região
          </Botao>
        )}
      </div>
    </form>
  );
}
