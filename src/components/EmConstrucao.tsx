import { Cabecalho } from './Cabecalho';

/** Placeholder de página ainda não implementada. */
export function EmConstrucao({ titulo }: { titulo: string }) {
  return (
    <>
      <Cabecalho titulo={titulo} />
      <div className="placeholder">
        <p>Em construção.</p>
      </div>
    </>
  );
}
