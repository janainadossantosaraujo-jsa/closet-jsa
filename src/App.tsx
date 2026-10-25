import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import ClosetPage from './pages/closet';
import LooksPage from './pages/looks';
import SemanaPage from './pages/semana';
import PerfilPage from './pages/perfil';
import AjustesPage from './pages/ajustes';
import { AvisoAtualizacao } from './AvisoAtualizacao';

/**
 * Rotas: cada seção é registrada com curinga ("/looks/*" etc.) e define suas
 * sub-rotas internamente com <Routes> aninhado (caminhos relativos), sem editar este arquivo.
 * O Closet é dono de "/" e de qualquer caminho que não comece com as outras seções
 * (ex.: "/peca/:id", "/nova-peca").
 */
export const SECOES = [
  { caminho: '/', rotulo: 'Closet', icone: 'cabide' },
  { caminho: '/looks', rotulo: 'Looks', icone: 'looks' },
  { caminho: '/semana', rotulo: 'Semana', icone: 'semana' },
  { caminho: '/perfil', rotulo: 'Perfil', icone: 'perfil' },
  { caminho: '/ajustes', rotulo: 'Ajustes', icone: 'ajustes' },
] as const;

const OUTRAS_SECOES = SECOES.filter((s) => s.caminho !== '/').map((s) => s.caminho);

function Icone({ nome }: { nome: (typeof SECOES)[number]['icone'] }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {nome === 'cabide' && (
        <g {...p}>
          <path d="M12 9.5V8a2 2 0 1 0-2-2" />
          <path d="M12 9.5 3 16.5h18Z" />
        </g>
      )}
      {nome === 'looks' && (
        <g {...p}>
          <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
        </g>
      )}
      {nome === 'semana' && (
        <g {...p}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </g>
      )}
      {nome === 'perfil' && (
        <g {...p}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1-4.5 4-6.5 8-6.5s7 2 8 6.5" />
        </g>
      )}
      {nome === 'ajustes' && (
        <g {...p}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
        </g>
      )}
    </svg>
  );
}

function NavInferior() {
  const { pathname } = useLocation();
  const closetAtivo = !OUTRAS_SECOES.some((c) => pathname === c || pathname.startsWith(c + '/'));
  return (
    <nav className="nav-inferior" aria-label="Seções">
      {SECOES.map((s) => (
        <NavLink
          key={s.caminho}
          to={s.caminho}
          className={({ isActive }) => ((s.caminho === '/' ? closetAtivo : isActive) ? 'active' : '')}
          aria-current={s.caminho === '/' && closetAtivo ? 'page' : undefined}
        >
          <Icone nome={s.icone} />
          <span>{s.rotulo}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default function App() {
  return (
    <HashRouter>
      <div className="app">
        <AvisoAtualizacao />
        <main className="app-conteudo">
          <Routes>
            <Route path="/looks/*" element={<LooksPage />} />
            <Route path="/semana/*" element={<SemanaPage />} />
            <Route path="/perfil/*" element={<PerfilPage />} />
            <Route path="/ajustes/*" element={<AjustesPage />} />
            <Route path="/*" element={<ClosetPage />} />
          </Routes>
        </main>
        <NavInferior />
      </div>
    </HashRouter>
  );
}
