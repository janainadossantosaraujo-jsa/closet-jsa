import { useCallback, useId, useState, type FormEvent } from 'react';
import { Botao } from '../../components';
import { salvarPerfil } from '../../db/repo';
import { ORIGENS_DADO, rotuloDe, type OrigemDado, type Perfil } from '../../db/schema';
import { adicionarItem, removerItem } from './util';

/** Linha de privacidade das medidas (D17/D24). */
export function AvisoPrivacidadeMedidas() {
  return (
    <p className="pf-privacidade">
      🔒 As medidas ficam só neste celular e servem para estimar se peças de loja tendem a servir. Não são enviadas a lojas.
    </p>
  );
}

export function SeloOrigem({ origem }: { origem: OrigemDado }) {
  return <span className={`pf-selo pf-selo-${origem}`}>{rotuloDe(ORIGENS_DADO, origem)}</span>;
}

/** Grava alterações do perfil e mostra "Salvo" / erro por alguns segundos. */
export function useSalvarPerfil() {
  const [estado, setEstado] = useState<'ocioso' | 'salvando' | 'salvo' | 'erro'>('ocioso');
  const salvar = useCallback(async (alteracoes: Partial<Omit<Perfil, 'id' | 'criadoEm'>>) => {
    setEstado('salvando');
    try {
      await salvarPerfil(alteracoes);
      setEstado('salvo');
      window.setTimeout(() => setEstado((e) => (e === 'salvo' ? 'ocioso' : e)), 2000);
      return true;
    } catch {
      setEstado('erro');
      return false;
    }
  }, []);
  return { estado, salvar };
}

export function StatusSalvo({ estado }: { estado: 'ocioso' | 'salvando' | 'salvo' | 'erro' }) {
  return (
    <p className={`pf-status${estado === 'erro' ? ' campo-erro' : ''}`} role="status" aria-live="polite">
      {estado === 'salvando' && 'Salvando…'}
      {estado === 'salvo' && 'Salvo ✓'}
      {estado === 'erro' && 'Não foi possível salvar. Tente de novo.'}
    </p>
  );
}

export interface EditorTagsProps {
  rotulo: string;
  itens: readonly string[];
  aoMudar: (itens: string[]) => void;
  placeholder?: string;
  dica?: string;
  /** Sugestões tocáveis (só aparecem as que ainda não estão na lista). */
  sugestoes?: readonly string[];
}

/** Lista de textos curtos: campo + "Adicionar", itens removíveis com ×. */
export function EditorTags({ rotulo, itens, aoMudar, placeholder, dica, sugestoes = [] }: EditorTagsProps) {
  const [texto, setTexto] = useState('');
  const id = useId();

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    aoMudar(adicionarItem(itens, texto));
    setTexto('');
  }

  const restantes = sugestoes.filter(
    (s) => !itens.some((i) => i.toLocaleLowerCase('pt-BR') === s.toLocaleLowerCase('pt-BR')),
  );

  return (
    <div className="pf-tags">
      <form onSubmit={enviar}>
        <label className="campo-rotulo" htmlFor={`pf-tag-${id}`}>
          {rotulo}
        </label>
        <div className="pf-tags-entrada">
          <input
            id={`pf-tag-${id}`}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={placeholder}
            enterKeyHint="done"
            autoComplete="off"
          />
          <Botao type="submit" variante="secundario" disabled={!texto.trim()}>
            Adicionar
          </Botao>
        </div>
      </form>
      {dica && <p className="campo-dica">{dica}</p>}
      {itens.length > 0 ? (
        <ul className="pf-tags-lista">
          {itens.map((i) => (
            <li key={i} className="pf-tag">
              <span>{i}</span>
              <button type="button" aria-label={`Remover ${i}`} onClick={() => aoMudar(removerItem(itens, i))}>
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="texto-suave pf-vazio">Nada anotado ainda.</p>
      )}
      {restantes.length > 0 && (
        <div className="pf-sugestoes" aria-label={`Sugestões para ${rotulo}`}>
          {restantes.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => aoMudar(adicionarItem(itens, s))}>
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
