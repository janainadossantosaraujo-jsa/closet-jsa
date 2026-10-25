import { Route, Routes } from 'react-router-dom';
import { DetalheLook } from './DetalheLook';
import { EditorLook } from './EditorLook';
import { ListaLooks } from './ListaLooks';
import './looks.css';

/**
 * Seção Looks — montada em "/looks/*".
 * - /looks                 lista (mosaico, nome, ocasião; filtro por ocasião)
 * - /looks/novo            montar look (aceita ?semana=&dia=&papel=look|alternativa&ocasiao=&peca=…)
 * - /looks/:id             prancha, avisos, usos (?usar=AAAA-MM-DD abre o registro de uso)
 * - /looks/:id/editar      editar
 */
export default function LooksPage() {
  return (
    <Routes>
      <Route index element={<ListaLooks />} />
      <Route path="novo" element={<EditorLook />} />
      <Route path=":id" element={<DetalheLook />} />
      <Route path=":id/editar" element={<EditorLook />} />
      <Route path="*" element={<ListaLooks />} />
    </Routes>
  );
}
