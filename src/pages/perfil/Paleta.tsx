import { useState, type FormEvent } from 'react';
import { Botao, Cabecalho, CampoArea, ModalConfirmacao, Selecao } from '../../components';
import { agoraISO, ORIGENS_DADO, type OrigemDado, type PaletaPessoal, type Perfil } from '../../db/schema';
import { ComPerfil } from './ComPerfil';
import { StatusSalvo, useSalvarPerfil } from './comum';
import { adicionarItem, ehHex, formatarData, normalizarCor, removerItem } from './util';

export function PaginaPaleta() {
  return (
    <>
      <Cabecalho titulo="Paleta pessoal" voltar="/perfil" />
      <ComPerfil>{(perfil) => <EditorPaleta perfil={perfil} />}</ComPerfil>
    </>
  );
}

function EditorPaleta({ perfil }: { perfil: Perfil }) {
  const { estado, salvar } = useSalvarPerfil();
  const paleta = perfil.paletaPessoal;
  const [corEscolhida, setCorEscolhida] = useState('#c2410c');
  const [nomeCor, setNomeCor] = useState('');
  const [descricao, setDescricao] = useState(paleta?.descricao ?? '');
  const [apagando, setApagando] = useState(false);

  function gravar(alt: Partial<PaletaPessoal>) {
    const base: PaletaPessoal = paleta ?? { cores: [], origem: 'informado', data: agoraISO() };
    return salvar({ paletaPessoal: { ...base, ...alt, data: agoraISO() } });
  }

  function adicionar(cor: string | undefined) {
    if (!cor) return;
    void gravar({ cores: adicionarItem(paleta?.cores ?? [], cor) });
  }

  function adicionarNome(e: FormEvent) {
    e.preventDefault();
    const c = normalizarCor(nomeCor);
    if (!c) return;
    adicionar(c);
    setNomeCor('');
  }

  return (
    <>
      <p className="texto-suave">
        Opcional. Se você já tem uma paleta (feita com profissional ou por conta própria), anote aqui. Ela fica separada das
        cores das peças e não é deduzida pelo app.
      </p>
      <StatusSalvo estado={estado} />

      <section className="cartao">
        <h2>Cores da paleta</h2>
        {paleta && paleta.cores.length > 0 ? (
          <ul className="pf-paleta">
            {paleta.cores.map((c) => (
              <li key={c}>
                <span className="pf-amostra" style={ehHex(c) ? { background: c } : undefined} aria-hidden="true">
                  {ehHex(c) ? '' : 'Aa'}
                </span>
                <span className="pf-paleta-nome">{c}</span>
                <button type="button" aria-label={`Remover ${c}`} onClick={() => void gravar({ cores: removerItem(paleta.cores, c) })}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="texto-suave pf-vazio">Nenhuma cor anotada.</p>
        )}

        <div className="campo">
          <label className="campo-rotulo" htmlFor="pf-cor">
            Escolher no seletor
          </label>
          <div className="pf-tags-entrada">
            <input id="pf-cor" type="color" className="pf-seletor-cor" value={corEscolhida} onChange={(e) => setCorEscolhida(e.target.value)} />
            <Botao variante="secundario" onClick={() => adicionar(normalizarCor(corEscolhida))}>
              Adicionar cor
            </Botao>
          </div>
        </div>
        <form onSubmit={adicionarNome} className="campo">
          <label className="campo-rotulo" htmlFor="pf-cor-nome">
            Ou escrever o nome ou código
          </label>
          <div className="pf-tags-entrada">
            <input
              id="pf-cor-nome"
              value={nomeCor}
              onChange={(e) => setNomeCor(e.target.value)}
              placeholder="Ex.: terracota, #1f6f5c"
              autoComplete="off"
            />
            <Botao type="submit" variante="secundario" disabled={!nomeCor.trim()}>
              Adicionar
            </Botao>
          </div>
        </form>
      </section>

      <section className="cartao">
        <h2>Sobre a paleta</h2>
        <Selecao<OrigemDado>
          rotulo="Origem"
          opcoes={ORIGENS_DADO}
          valor={paleta?.origem ?? 'informado'}
          aoMudar={(v) => void gravar({ origem: v ?? 'informado' })}
          obrigatorio
          dica="Conferido: feita com profissional ou testada por você."
        />
        <CampoArea rotulo="Descrição (opcional)" valor={descricao} aoMudar={setDescricao} rows={3} placeholder="Ex.: cores quentes e terrosas" />
        <Botao bloco onClick={() => void gravar({ descricao: descricao.trim() || undefined })} carregando={estado === 'salvando'}>
          Salvar descrição
        </Botao>
        {paleta && <p className="campo-dica">Atualizada em {formatarData(paleta.data)}.</p>}
      </section>

      {paleta && (
        <Botao variante="fantasma" bloco onClick={() => setApagando(true)}>
          Apagar paleta
        </Botao>
      )}

      <ModalConfirmacao
        aberto={apagando}
        titulo="Apagar a paleta pessoal?"
        textoConfirmar="Apagar"
        perigoso
        carregando={estado === 'salvando'}
        aoCancelar={() => setApagando(false)}
        aoConfirmar={async () => {
          if (await salvar({ paletaPessoal: undefined })) {
            setApagando(false);
            setDescricao('');
          }
        }}
      >
        <p>As cores das peças não mudam.</p>
      </ModalConfirmacao>
    </>
  );
}
