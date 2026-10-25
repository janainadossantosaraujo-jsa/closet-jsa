import { useId, useRef } from 'react';
import { Botao } from './Botao';
import { MiniaturaBlob } from './MiniaturaBlob';

export interface SeletorFotoProps {
  /** Fotos escolhidas (controlado pelo pai). */
  fotos: File[];
  aoMudar: (fotos: File[]) => void;
  rotulo?: string;
  /** Permite escolher várias fotos de uma vez na galeria (padrão: true). */
  multiplas?: boolean;
  /**
   * Mostra o botão "Tirar foto" (abre a câmera: input com `capture`).
   * "environment" = câmera traseira (padrão), "user" = frontal, false = sem botão de câmera.
   */
  camera?: 'environment' | 'user' | false;
  /** Mostra prévias com botão de remover (padrão: true). */
  mostrarPrevias?: boolean;
  /** Limite de fotos (opcional). */
  maximo?: number;
}

/**
 * Captura/seleção de fotos: "Tirar foto" (câmera) e "Galeria" (várias).
 * Não altera os arquivos: o original é guardado intacto pelo repositório.
 */
export function SeletorFoto({
  fotos,
  aoMudar,
  rotulo = 'Fotos',
  multiplas = true,
  camera = 'environment',
  mostrarPrevias = true,
  maximo,
}: SeletorFotoProps) {
  const id = useId();
  const refCamera = useRef<HTMLInputElement>(null);
  const refGaleria = useRef<HTMLInputElement>(null);

  function adicionar(lista: FileList | null) {
    if (!lista?.length) return;
    const novas = Array.from(lista).filter((f) => f.type.startsWith('image/') || f.type === '');
    let todas = multiplas ? [...fotos, ...novas] : novas.slice(0, 1);
    if (maximo) todas = todas.slice(0, maximo);
    aoMudar(todas);
  }

  function remover(i: number) {
    aoMudar(fotos.filter((_, j) => j !== i));
  }

  const cheio = maximo !== undefined && fotos.length >= maximo;

  return (
    <div className="seletor-foto" role="group" aria-labelledby={`${id}-rotulo`}>
      <p className="campo-rotulo" id={`${id}-rotulo`}>{rotulo}</p>
      <input
        ref={refCamera}
        type="file"
        accept="image/*"
        capture={camera || undefined}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          adicionar(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={refGaleria}
        type="file"
        accept="image/*"
        multiple={multiplas}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          adicionar(e.target.files);
          e.target.value = '';
        }}
      />
      <div className="seletor-foto-botoes" style={camera ? undefined : { gridTemplateColumns: '1fr' }}>
        {camera && (
          <Botao variante="secundario" onClick={() => refCamera.current?.click()} disabled={cheio}>
            📷 Tirar foto
          </Botao>
        )}
        <Botao variante="secundario" onClick={() => refGaleria.current?.click()} disabled={cheio}>
          🖼️ Galeria
        </Botao>
      </div>
      {mostrarPrevias && fotos.length > 0 && (
        <div className="grade-fotos">
          {fotos.map((f, i) => (
            <div className="grade-fotos-item" key={`${f.name}-${f.size}-${f.lastModified}-${i}`}>
              <MiniaturaBlob blob={f} alt={`Foto ${i + 1}`} />
              <button type="button" className="grade-fotos-remover" aria-label={`Remover foto ${i + 1}`} onClick={() => remover(i)}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
