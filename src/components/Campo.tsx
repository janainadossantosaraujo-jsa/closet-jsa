import { useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';

function paraNumero(texto: string): number | undefined {
  const t = texto.trim().replace(',', '.');
  if (t === '' || t === '.') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

interface BaseCampo {
  rotulo: string;
  dica?: ReactNode;
  erro?: string;
}

export interface CampoTextoProps extends BaseCampo, Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  valor: string;
  aoMudar: (valor: string) => void;
}

/** Campo de texto com rótulo. */
export function CampoTexto({ rotulo, dica, erro, valor, aoMudar, id, type = 'text', ...resto }: CampoTextoProps) {
  const auto = useId();
  const idCampo = id ?? auto;
  return (
    <div className="campo">
      <label className="campo-rotulo" htmlFor={idCampo}>{rotulo}</label>
      <input
        id={idCampo}
        type={type}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        aria-invalid={erro ? true : undefined}
        aria-describedby={dica || erro ? `${idCampo}-info` : undefined}
        {...resto}
      />
      {(dica || erro) && (
        <span id={`${idCampo}-info`} className={erro ? 'campo-erro' : 'campo-dica'}>{erro ?? dica}</span>
      )}
    </div>
  );
}

export interface CampoNumeroProps extends BaseCampo, Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** undefined = vazio. */
  valor: number | undefined;
  aoMudar: (valor: number | undefined) => void;
  /** Ex.: "cm". */
  unidade?: string;
}

/** Campo numérico (aceita vírgula decimal; teclado numérico no celular). */
export function CampoNumero({ rotulo, dica, erro, valor, aoMudar, unidade, id, ...resto }: CampoNumeroProps) {
  const auto = useId();
  const idCampo = id ?? auto;
  const formatar = (v: number | undefined) => (v === undefined ? '' : String(v).replace('.', ','));
  // texto local para permitir digitar "12," antes do decimal
  const [texto, setTexto] = useState(formatar(valor));
  const [ultimo, setUltimo] = useState(valor);
  if (valor !== ultimo) {
    setUltimo(valor);
    if (paraNumero(texto) !== valor) setTexto(formatar(valor));
  }
  return (
    <div className="campo">
      <label className="campo-rotulo" htmlFor={idCampo}>{rotulo}</label>
      <div className="campo-unidade">
        <input
          id={idCampo}
          type="text"
          inputMode="decimal"
          value={texto}
          onChange={(e) => {
            const t = e.target.value;
            if (!/^\s*\d*([.,]\d*)?\s*$/.test(t)) return;
            setTexto(t);
            const n = paraNumero(t);
            setUltimo(n);
            aoMudar(n);
          }}
          aria-invalid={erro ? true : undefined}
          {...resto}
        />
        {unidade && <span>{unidade}</span>}
      </div>
      {(dica || erro) && <span className={erro ? 'campo-erro' : 'campo-dica'}>{erro ?? dica}</span>}
    </div>
  );
}

export interface CampoAreaProps extends BaseCampo, Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  valor: string;
  aoMudar: (valor: string) => void;
}

/** Texto longo (observações). */
export function CampoArea({ rotulo, dica, erro, valor, aoMudar, id, ...resto }: CampoAreaProps) {
  const auto = useId();
  const idCampo = id ?? auto;
  return (
    <div className="campo">
      <label className="campo-rotulo" htmlFor={idCampo}>{rotulo}</label>
      <textarea id={idCampo} value={valor} onChange={(e) => aoMudar(e.target.value)} {...resto} />
      {(dica || erro) && <span className={erro ? 'campo-erro' : 'campo-dica'}>{erro ?? dica}</span>}
    </div>
  );
}
