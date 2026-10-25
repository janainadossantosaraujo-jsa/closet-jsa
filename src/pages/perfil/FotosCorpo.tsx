import { useEffect, useState } from 'react';
import { Botao, Cabecalho, CampoTexto, MiniaturaBlob, ModalConfirmacao, Selecao, SeletorFoto, useObjectUrl } from '../../components';
import { useFotosCorpo } from '../../db/hooks';
import { adicionarFotoCorpo, apagarFotoCorpo } from '../../db/repo';
import { rotuloDe, TIPOS_MIDIA_CORPO, type MidiaCorpo, type TipoMidiaCorpo } from '../../db/schema';
import { formatarData } from './util';

/** Rótulos curtos (sem o prefixo "Corpo —"). */
function rotuloTipo(t: TipoMidiaCorpo): string {
  return rotuloDe(TIPOS_MIDIA_CORPO, t).replace(/^Corpo — /, '');
}

export function PaginaFotosCorpo() {
  const fotos = useFotosCorpo();
  const [novas, setNovas] = useState<File[]>([]);
  const [tipo, setTipo] = useState<TipoMidiaCorpo>('corpo_frente');
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string>();
  const [mensagem, setMensagem] = useState<string>();
  const [vendo, setVendo] = useState<MidiaCorpo>();
  const [apagando, setApagando] = useState<MidiaCorpo>();
  const [excluindo, setExcluindo] = useState(false);

  async function guardar() {
    if (!novas.length) return;
    setSalvando(true);
    setErro(undefined);
    setMensagem(undefined);
    let ok = 0;
    try {
      for (const f of novas) {
        await adicionarFotoCorpo(f, tipo, observacao.trim() || undefined);
        ok++;
      }
      setMensagem(ok === 1 ? 'Foto guardada.' : `${ok} fotos guardadas.`);
      setNovas([]);
      setObservacao('');
    } catch {
      setErro(
        ok > 0
          ? `${ok} foto(s) guardada(s); as demais não puderam ser lidas. Tente outro formato (JPG ou PNG).`
          : 'Não foi possível ler a foto. Tente outro formato (JPG ou PNG).',
      );
      setNovas((n) => n.slice(ok));
    } finally {
      setSalvando(false);
    }
  }

  async function apagar() {
    if (!apagando) return;
    setExcluindo(true);
    try {
      await apagarFotoCorpo(apagando.id);
      if (vendo?.id === apagando.id) setVendo(undefined);
      setApagando(undefined);
    } catch {
      setErro('Não foi possível apagar a foto.');
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <>
      <Cabecalho titulo="Fotos do corpo" voltar="/perfil" />
      <p className="pf-privacidade">
        🔒 Estas fotos ficam só neste celular, separadas das fotos das peças, e não são enviadas a ninguém. No futuro
        servirão de referência para o provador, que só será usado se você pedir.
      </p>

      <section className="cartao">
        <h2>Adicionar foto</h2>
        <p className="campo-dica">
          Dica: corpo inteiro, luz natural, fundo liso e roupa que mostre seu contorno de forma confortável para você.
        </p>
        <SeletorFoto fotos={novas} aoMudar={setNovas} rotulo="Fotos de referência" camera="environment" />
        {novas.length > 0 && (
          <>
            <Selecao rotulo="Tipo" opcoes={TIPOS_MIDIA_CORPO} valor={tipo} aoMudar={(v) => setTipo(v ?? 'corpo_frente')} obrigatorio />
            <CampoTexto rotulo="Observação (opcional)" valor={observacao} aoMudar={setObservacao} placeholder="Ex.: com legging preta" />
            <Botao bloco onClick={() => void guardar()} carregando={salvando}>
              Guardar {novas.length === 1 ? 'foto' : `${novas.length} fotos`}
            </Botao>
          </>
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
      </section>

      <section aria-labelledby="pf-fotos-salvas">
        <h2 id="pf-fotos-salvas" className="pf-subtitulo">
          Fotos guardadas {fotos && fotos.length > 0 && `(${fotos.length})`}
        </h2>
        {fotos === undefined ? (
          <p className="texto-suave">Carregando…</p>
        ) : fotos.length === 0 ? (
          <p className="placeholder">Nenhuma foto ainda. Elas são opcionais.</p>
        ) : (
          <ul className="grade-fotos pf-fotos">
            {fotos.map((f) => (
              <li key={f.id} className="grade-fotos-item">
                <button type="button" className="pf-foto-botao" onClick={() => setVendo(f)} aria-label={`Ver foto: ${rotuloTipo(f.tipo)}`}>
                  <MiniaturaBlob blob={f.miniatura} alt="" />
                </button>
                <span className="pf-foto-legenda">{rotuloTipo(f.tipo)}</span>
                <button
                  type="button"
                  className="grade-fotos-remover"
                  aria-label={`Apagar foto: ${rotuloTipo(f.tipo)} de ${formatarData(f.criadaEm)}`}
                  onClick={() => setApagando(f)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {vendo && <VisualizadorFoto foto={vendo} aoFechar={() => setVendo(undefined)} aoApagar={() => setApagando(vendo)} />}

      <ModalConfirmacao
        aberto={apagando !== undefined}
        titulo="Apagar esta foto?"
        textoConfirmar="Apagar"
        perigoso
        carregando={excluindo}
        aoCancelar={() => setApagando(undefined)}
        aoConfirmar={() => void apagar()}
      >
        <p>A foto sai do aparelho. Se ela estiver em um backup antigo, continua lá.</p>
      </ModalConfirmacao>
    </>
  );
}

function VisualizadorFoto({ foto, aoFechar, aoApagar }: { foto: MidiaCorpo; aoFechar: () => void; aoApagar: () => void }) {
  const url = useObjectUrl(foto.original);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [aoFechar]);
  return (
    <div className="pf-visualizador" role="dialog" aria-modal="true" aria-label={`Foto: ${rotuloTipo(foto.tipo)}`}>
      <div className="pf-visualizador-topo">
        <span>
          {rotuloTipo(foto.tipo)} · {formatarData(foto.criadaEm)}
        </span>
        <Botao variante="secundario" onClick={aoFechar} autoFocus>
          Fechar
        </Botao>
      </div>
      {url && <img src={url} alt={`Foto do corpo: ${rotuloTipo(foto.tipo)}`} />}
      {foto.observacao && <p>{foto.observacao}</p>}
      <Botao variante="perigo" onClick={aoApagar}>
        Apagar foto
      </Botao>
    </div>
  );
}
