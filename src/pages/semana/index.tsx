import { Navigate, Route, Routes } from 'react-router-dom';
import { inicioDaSemana } from '../../db/repo';
import { RotaDia } from './PaginaDia';
import { RotaSemana } from './PaginaSemana';
import '../looks/looks.css';
import './semana.css';

/**
 * Seção Semana — montada em "/semana/*".
 * - /semana                       → semana atual (segunda-feira)
 * - /semana/:inicio               7 dias, alertas e regras (criada sob demanda na 1ª alteração)
 * - /semana/:inicio/:data         dia: compromissos, look, alternativas, peças fixadas
 */
function SemanaAtual() {
  return <Navigate to={`/semana/${inicioDaSemana()}`} replace />;
}

export default function SemanaPage() {
  return (
    <Routes>
      <Route index element={<SemanaAtual />} />
      <Route path=":inicio" element={<RotaSemana />} />
      <Route path=":inicio/:data" element={<RotaDia />} />
      <Route path="*" element={<SemanaAtual />} />
    </Routes>
  );
}
