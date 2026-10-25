import { Route, Routes } from 'react-router-dom';
import './closet.css';
import { DetalhePecaPagina } from './DetalhePeca';
import { EditarPecaPagina, NovaPecaPagina, PecaNaoEncontrada } from './FormPeca';
import { ListaPecas } from './ListaPecas';

/**
 * Seção Closet — dona de "/" e de caminhos que não sejam das outras seções.
 * Rotas: "/" lista · "/nova" cadastro · "/peca/:id" detalhe · "/peca/:id/editar" edição.
 */
export default function ClosetPage() {
  return (
    <Routes>
      <Route index element={<ListaPecas />} />
      <Route path="nova" element={<NovaPecaPagina />} />
      <Route path="peca/:id" element={<DetalhePecaPagina />} />
      <Route path="peca/:id/editar" element={<EditarPecaPagina />} />
      <Route path="*" element={<PecaNaoEncontrada />} />
    </Routes>
  );
}
