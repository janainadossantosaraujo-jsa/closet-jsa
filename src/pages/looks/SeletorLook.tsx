import { useMemo, useState } from 'react';
import { Botao, CampoTexto } from '../../components';
import type { ID, Ocasiao } from '../../db/schema';
import { nomeDoLook, pecasDoLook, rotuloOcasiao, useLooksMapa, usePecasMapa } from './dados';
import { Folha } from './Folha';
import { MosaicoLook } from './MosaicoLook';
import { avisosConforto } from './regras';
import './looks.css';

export interface SeletorLookProps {
  aberto: boolean;
  titulo?: string;
  /** Looks que não devem aparecer (ex.: já escolhidos). */
  excluir?: readonly ID[];
  /** Ocasiões do dia: looks dessas ocasiões aparecem primeiro. */
  ocasioesPreferidas?: readonly Ocasiao[];
  aoEscolher: (id: ID) => void;
  aoFechar: () => void;
  /** Botão "Montar novo look". */
  aoMontarNovo?: () => void;
}

/** Escolha de um look existente (com mosaico), ou atalho para montar um novo. */
export function SeletorLook({ aberto, titulo = 'Escolher look', excluir = [], ocasioesPreferidas = [], aoEscolher, aoFechar, aoMontarNovo }: SeletorLookProps) {
  const looks = useLooksMapa();
  const pecas = usePecasMapa();
  const [busca, setBusca] = useState('');

  const lista = useMemo(() => {
    if (!looks || !pecas) return undefined;
    const termo = busca.trim().toLowerCase();
    return looks.lista
      .filter((l) => !excluir.includes(l.id))
      .filter((l) => !termo || `${nomeDoLook(l, pecas)} ${rotuloOcasiao(l)}`.toLowerCase().includes(termo))
      .map((l) => ({ look: l, preferido: !!l.ocasiao && ocasioesPreferidas.includes(l.ocasiao) }))
      .sort((a, b) => Number(b.preferido) - Number(a.preferido));
  }, [looks, pecas, busca, excluir, ocasioesPreferidas]);

  return (
    <Folha
      aberto={aberto}
      titulo={titulo}
      aoFechar={aoFechar}
      rodape={
        aoMontarNovo && (
          <Botao bloco variante="secundario" onClick={aoMontarNovo}>
            + Montar novo look
          </Botao>
        )
      }
    >
      <CampoTexto rotulo="Buscar look" type="search" valor={busca} aoMudar={setBusca} />
      {lista === undefined && <p className="texto-suave">Carregando…</p>}
      {lista?.length === 0 && <p className="texto-suave">Nenhum look disponível. Monte um novo.</p>}
      <ul className="lk-lista">
        {lista?.map(({ look, preferido }) => {
          const ps = pecasDoLook(look, pecas!);
          return (
            <li key={look.id}>
              <button type="button" className="lk-cartao-look" onClick={() => aoEscolher(look.id)}>
                <MosaicoLook pecas={ps} pequeno />
                <span className="lk-cartao-texto">
                  <strong>{nomeDoLook(look, pecas)}</strong>
                  <span className="texto-suave">
                    {[rotuloOcasiao(look), `${ps.length} peça${ps.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
                  </span>
                  {preferido && <span className="lk-etiqueta">Combina com o dia</span>}
                  {avisosConforto(ps).length > 0 && <span className="lk-etiqueta lk-etiqueta-conforto">⚠ conforto</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Folha>
  );
}
