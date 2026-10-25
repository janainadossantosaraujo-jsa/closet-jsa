import { useRegisterSW } from 'virtual:pwa-register/react';
import { Botao } from './components/Botao';

/** Registra o service worker (offline) e avisa quando há nova versão do app. */
export function AvisoAtualizacao() {
  const {
    needRefresh: [precisaAtualizar, setPrecisaAtualizar],
    updateServiceWorker,
  } = useRegisterSW();

  if (!precisaAtualizar) return null;
  return (
    <div className="aviso" role="status" style={{ margin: 'var(--espaco-3)', display: 'flex', gap: 8, alignItems: 'center' }}>
      <span style={{ flex: 1 }}>Nova versão do app disponível.</span>
      <Botao onClick={() => updateServiceWorker(true)}>Atualizar</Botao>
      <Botao variante="fantasma" onClick={() => setPrecisaAtualizar(false)}>Depois</Botao>
    </div>
  );
}
