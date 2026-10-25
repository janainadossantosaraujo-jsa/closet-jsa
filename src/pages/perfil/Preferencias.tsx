import { useState } from 'react';
import { Botao, Cabecalho, CampoArea, CampoTexto, Chips } from '../../components';
import { GRUPOS_CATEGORIA, SENSACOES_CALOR, type GrupoCategoria, type Perfil, type SensacaoCalor } from '../../db/schema';
import { ComPerfil } from './ComPerfil';
import { EditorTags, StatusSalvo, useSalvarPerfil } from './comum';

/** Sugestões neutras (tocáveis); a lista é livre. */
const SUGESTOES_ESTILO = ['Casual', 'Clássico', 'Despojado', 'Elegante', 'Minimalista', 'Colorido', 'Estampado', 'Romântico'];
const SUGESTOES_NAO_USA = ['Salto alto', 'Gola alta', 'Tecido sintético quente', 'Roupa justa em cima'];

/** Grupos com tamanho de etiqueta usual (complemento não tem tamanho). */
const GRUPOS_TAMANHO = GRUPOS_CATEGORIA.filter((g) => g.valor !== 'complemento');

export function PaginaPreferencias() {
  return (
    <>
      <Cabecalho titulo="Estilo e preferências" voltar="/perfil" />
      <ComPerfil>{(perfil) => <EditorPreferencias perfil={perfil} />}</ComPerfil>
    </>
  );
}

function EditorPreferencias({ perfil }: { perfil: Perfil }) {
  const { estado, salvar } = useSalvarPerfil();
  return (
    <>
      <StatusSalvo estado={estado} />
      <section className="cartao">
        <h2>Estilo</h2>
        <EditorTags
          rotulo="Estilos de que gosta"
          itens={perfil.estilosPreferidos}
          aoMudar={(v) => void salvar({ estilosPreferidos: v })}
          placeholder="Ex.: confortável e colorido"
          sugestoes={SUGESTOES_ESTILO}
        />
      </section>

      <section className="cartao">
        <h2>Cores</h2>
        <p className="campo-dica">Cores de roupa de que você gosta ou não. A paleta pessoal fica em outra tela.</p>
        <EditorTags
          rotulo="Cores que prefere"
          itens={perfil.coresPreferidas}
          aoMudar={(v) => void salvar({ coresPreferidas: v })}
          placeholder="Ex.: verde, laranja"
        />
        <EditorTags
          rotulo="Cores que evita"
          itens={perfil.coresEvitadas}
          aoMudar={(v) => void salvar({ coresEvitadas: v })}
          placeholder="Ex.: bege"
        />
      </section>

      <section className="cartao">
        <h2>O que não usa</h2>
        <EditorTags
          rotulo="Peças, tecidos ou detalhes que não usa"
          itens={perfil.naoUsa}
          aoMudar={(v) => void salvar({ naoUsa: v })}
          placeholder="Ex.: manga bufante"
          sugestoes={SUGESTOES_NAO_USA}
        />
      </section>

      <section className="cartao">
        <h2>Calor</h2>
        <Chips<SensacaoCalor>
          rotulo="Como você costuma sentir a temperatura"
          opcoes={SENSACOES_CALOR}
          valor={perfil.sensacaoCalor ? [perfil.sensacaoCalor] : []}
          aoMudar={(v) => void salvar({ sensacaoCalor: v[0] })}
          unico
        />
        <p className="campo-dica">Ajuda a priorizar tecidos leves e peças frescas nas sugestões.</p>
      </section>

      <TamanhosEObservacoes perfil={perfil} salvar={salvar} salvando={estado === 'salvando'} />
    </>
  );
}

function TamanhosEObservacoes({
  perfil,
  salvar,
  salvando,
}: {
  perfil: Perfil;
  salvar: (a: Partial<Perfil>) => Promise<boolean>;
  salvando: boolean;
}) {
  const [tamanhos, setTamanhos] = useState<Partial<Record<GrupoCategoria, string>>>(perfil.tamanhosUsuais);
  const [observacoes, setObservacoes] = useState(perfil.observacoes ?? '');

  function gravar() {
    const limpos: Partial<Record<GrupoCategoria, string>> = {};
    for (const [g, v] of Object.entries(tamanhos) as [GrupoCategoria, string | undefined][]) {
      const t = v?.trim();
      if (t) limpos[g] = t;
    }
    void salvar({ tamanhosUsuais: limpos, observacoes: observacoes.trim() || undefined });
  }

  return (
    <section className="cartao">
      <h2>Tamanhos usuais</h2>
      <p className="campo-dica">Tamanho de etiqueta que costuma usar. Varia entre lojas; as medidas são mais confiáveis.</p>
      <div className="pf-grade-2">
        {GRUPOS_TAMANHO.map((g) => (
          <CampoTexto
            key={g.valor}
            rotulo={g.rotulo}
            valor={tamanhos[g.valor] ?? ''}
            aoMudar={(v) => setTamanhos((t) => ({ ...t, [g.valor]: v }))}
            placeholder="Ex.: G2, 50"
            autoComplete="off"
          />
        ))}
      </div>
      <CampoArea rotulo="Outras observações" valor={observacoes} aoMudar={setObservacoes} rows={3} />
      <Botao bloco onClick={gravar} carregando={salvando}>
        Salvar tamanhos e observações
      </Botao>
    </section>
  );
}
