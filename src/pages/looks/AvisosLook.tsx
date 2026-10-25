import type { Peca } from '../../db/schema';
import { avisosConforto, estaDisponivel, rotuloDisponibilidade } from './regras';
import './looks.css';

/** Avisos discretos do look: conforto (justa em cima / veste bem: não) e peças indisponíveis. Não bloqueiam. */
export function AvisosLook({ pecas }: { pecas: Peca[] }) {
  const conforto = avisosConforto(pecas);
  const indisponiveis = pecas.filter((p) => !estaDisponivel(p));
  if (!conforto.length && !indisponiveis.length) return null;
  return (
    <div className="aviso lk-aviso" role="note">
      {conforto.map((a) => (
        <p key={`c-${a.pecaId}`}>
          ⚠ <strong>{a.nome}</strong>: {a.motivos.join('; ')}.
        </p>
      ))}
      {indisponiveis.map((p) => (
        <p key={`d-${p.id}`}>
          ⓘ <strong>{p.nome}</strong>: {rotuloDisponibilidade(p).toLowerCase()}.
        </p>
      ))}
    </div>
  );
}
