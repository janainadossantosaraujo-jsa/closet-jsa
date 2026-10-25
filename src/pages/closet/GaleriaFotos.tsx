import { useState } from 'react';
import { Botao, MiniaturaBlob, ModalConfirmacao, Selecao, SeletorFoto } from '../../components';
import { useMidiasDoDono } from '../../db/hooks';
import { adicionarFotosPeca, alterarTipoMidia, apagarMidia, reordenarFotosPeca } from '../../db/repo';
import { TIPOS_MIDIA_PECA, rotuloDe, type Peca } from '../../db/schema';
import { mover, tipoFotoPadrao } from './util';

/** Galeria de fotos da peça: ver, tipo, reordenar, adicionar e apagar. */
export function GaleriaFotos({ peca }: { peca: Peca }) {
  const midias = useMidiasDoDono('peca', peca.id);
  const [sel, setSel] = useState(0);
  const [adicionando, setAdicionando] = useState(false);
  const [apagarId, setApagarId] = useState<string>();
  const [apagando, setApagando] = useState(false);
  const [falha, setFalha] = useState<string>();

  const lista = midias ?? [];
  const i = Math.min(sel, Math.max(lista.length - 1, 0));
  const atual = lista[i];

  async function executar(acao: () => Promise<unknown>) {
    setFalha(undefined);
    try {
      await acao();
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.');
    }
  }

  async function adicionar(arquivos: File[]) {
    if (!arquivos.length) return;
    setAdicionando(true);
    const base = peca.midiaIds.length;
    await executar(() =>
      adicionarFotosPeca(
        peca.id,
        arquivos.map((arquivo, j) => ({ arquivo, tipo: tipoFotoPadrao(base + j) })),
      ),
    );
    setAdicionando(false);
    setSel(base);
  }

  async function moverPara(de: number, para: number) {
    await executar(() => reordenarFotosPeca(peca.id, mover(lista.map((m) => m.id), de, para)));
    setSel(para);
  }

  async function confirmarApagar() {
    if (!apagarId) return;
    setApagando(true);
    await executar(() => apagarMidia(apagarId));
    setApagando(false);
    setApagarId(undefined);
  }

  return (
    <section className="closet-galeria" aria-label="Fotos">
      {midias === undefined ? (
        <div className="closet-foto-grande miniatura miniatura-vazia">Carregando…</div>
      ) : !atual ? (
        <div className="closet-foto-grande miniatura miniatura-vazia">Sem fotos</div>
      ) : (
        <>
          <div className="closet-foto-grande-caixa">
            <MiniaturaBlob
              blob={atual.original}
              alt={`${peca.nome} — ${rotuloDe(TIPOS_MIDIA_PECA, atual.tipo)}`}
              className="closet-foto-grande"
            />
            <span className="closet-foto-tipo">
              {rotuloDe(TIPOS_MIDIA_PECA, atual.tipo)}
              {i === 0 && ' · capa'}
            </span>
          </div>

          {lista.length > 1 && (
            <ul className="closet-tira" aria-label="Escolher foto">
              {lista.map((m, j) => (
                <li key={m.id}>
                  <button
                    type="button"
                    aria-label={`Foto ${j + 1}: ${rotuloDe(TIPOS_MIDIA_PECA, m.tipo)}`}
                    aria-pressed={j === i}
                    onClick={() => setSel(j)}
                  >
                    <MiniaturaBlob blob={m.miniatura} alt="" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <details className="closet-secao closet-gerenciar-foto">
            <summary>
              <span className="closet-secao-titulo">Organizar esta foto</span>
              <span className="closet-secao-resumo">{`${i + 1} de ${lista.length}`}</span>
            </summary>
            <div className="closet-secao-corpo">
              <Selecao
                rotulo="Tipo da foto"
                opcoes={TIPOS_MIDIA_PECA}
                valor={atual.tipo}
                obrigatorio
                aoMudar={(tipo) => tipo && executar(() => alterarTipoMidia(atual.id, tipo))}
              />
              {lista.length > 1 && (
                <div className="closet-botoes-3">
                  <Botao variante="secundario" disabled={i === 0} onClick={() => moverPara(i, i - 1)} aria-label="Mover para a esquerda">
                    ◀ Antes
                  </Botao>
                  <Botao variante="secundario" disabled={i === lista.length - 1} onClick={() => moverPara(i, i + 1)} aria-label="Mover para a direita">
                    Depois ▶
                  </Botao>
                  <Botao variante="secundario" disabled={i === 0} onClick={() => moverPara(i, 0)}>
                    Usar como capa
                  </Botao>
                </div>
              )}
              <Botao variante="fantasma" className="closet-texto-perigo" onClick={() => setApagarId(atual.id)}>
                Apagar esta foto
              </Botao>
            </div>
          </details>
        </>
      )}

      <SeletorFoto rotulo={adicionando ? 'Salvando fotos…' : 'Adicionar fotos'} fotos={[]} aoMudar={adicionar} mostrarPrevias={false} />
      {falha && <p className="aviso" role="alert">{falha}</p>}

      <ModalConfirmacao
        aberto={!!apagarId}
        titulo="Apagar esta foto?"
        perigoso
        textoConfirmar="Apagar foto"
        carregando={apagando}
        aoConfirmar={confirmarApagar}
        aoCancelar={() => setApagarId(undefined)}
      >
        <p>A foto original e a miniatura serão apagadas do aparelho. Não dá para desfazer.</p>
      </ModalConfirmacao>
    </section>
  );
}
