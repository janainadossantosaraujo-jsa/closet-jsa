import { useId } from 'react';
import { CampoTexto } from '../../components';
import { sugestoesPara } from './util';

interface CampoSugestoesProps {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  /** Valores já usados (do mais usado ao menos usado). */
  valores: string[];
  dica?: string;
  placeholder?: string;
  /** Mostra os valores como botões tocáveis (além da lista do teclado). */
  botoes?: boolean;
}

/** Campo de texto livre com sugestões dos valores já usados (datalist + botões). */
export function CampoSugestoes({ rotulo, valor, aoMudar, valores, dica, placeholder, botoes }: CampoSugestoesProps) {
  const idLista = useId();
  const sugestoes = botoes ? sugestoesPara(valor, valores) : [];
  return (
    <div className="closet-campo-sugestoes">
      <CampoTexto
        rotulo={rotulo}
        valor={valor}
        aoMudar={aoMudar}
        dica={dica}
        placeholder={placeholder}
        list={valores.length ? idLista : undefined}
        autoComplete="off"
      />
      {valores.length > 0 && (
        <datalist id={idLista}>
          {valores.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      )}
      {sugestoes.length > 0 && (
        <div className="closet-sugestoes" role="group" aria-label={`Sugestões para ${rotulo.toLowerCase()}`}>
          {sugestoes.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => aoMudar(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
