import type { ReactNode } from 'react';
import { usePerfil } from '../../db/hooks';
import type { Perfil } from '../../db/schema';

/** Espera o perfil carregar (salvo ou padrão) e renderiza o conteúdo com ele. */
export function ComPerfil({ children }: { children: (perfil: Perfil) => ReactNode }) {
  const perfil = usePerfil();
  if (!perfil) return <p className="texto-suave">Carregando…</p>;
  return <>{children(perfil)}</>;
}
