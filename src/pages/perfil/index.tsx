import { Link, Route, Routes } from 'react-router-dom';
import { Cabecalho } from '../../components';
import { useContagens, useMedidasCorporais, usePerfil } from '../../db/hooks';
import { PREFERENCIAS_FOLGA, REGIOES_FOLGA, REGIOES_MEDIDA, rotuloDe, SENSACOES_CALOR } from '../../db/schema';
import { PaginaCompromissos } from './Compromissos';
import { AvisoPrivacidadeMedidas } from './comum';
import { PaginaFolga } from './Folga';
import { PaginaFotosCorpo } from './FotosCorpo';
import { DetalheMedida, ListaMedidas } from './Medidas';
import { PaginaPaleta } from './Paleta';
import { PaginaPreferencias } from './Preferencias';
import './perfil.css';

/**
 * Seção Perfil — montada em "/perfil/*" (B7 e B8).
 * Sub-rotas: medidas, medidas/:regiao, folga, preferencias, compromissos, paleta, fotos.
 */
export default function PerfilPage() {
  return (
    <div className="pf">
      <Routes>
        <Route index element={<InicioPerfil />} />
        <Route path="medidas" element={<ListaMedidas />} />
        <Route path="medidas/:regiao" element={<DetalheMedida />} />
        <Route path="folga" element={<PaginaFolga />} />
        <Route path="preferencias" element={<PaginaPreferencias />} />
        <Route path="compromissos" element={<PaginaCompromissos />} />
        <Route path="paleta" element={<PaginaPaleta />} />
        <Route path="fotos" element={<PaginaFotosCorpo />} />
        <Route path="*" element={<InicioPerfil />} />
      </Routes>
    </div>
  );
}

function resumo(itens: string[], vazio: string): string {
  const preenchidos = itens.filter(Boolean);
  return preenchidos.length ? preenchidos.join(' · ') : vazio;
}

function InicioPerfil() {
  const perfil = usePerfil();
  const medidas = useMedidasCorporais();
  const contagens = useContagens();

  const comValor = (medidas ?? []).filter((m) => m.atualId).length;
  const conflitos = (medidas ?? []).filter((m) => m.conflito).length;
  const folgaCima = perfil?.preferenciasFolga.find((p) => p.regiao === 'parte_de_cima');

  const secoes = [
    {
      para: '/perfil/medidas',
      titulo: 'Medidas do corpo',
      detalhe: medidas ? `${comValor} de ${REGIOES_MEDIDA.length} regiões com medida` : '…',
      alerta: conflitos > 0 ? `${conflitos} aguardando sua escolha` : undefined,
    },
    {
      para: '/perfil/folga',
      titulo: 'Folga e conforto',
      detalhe: perfil
        ? folgaCima
          ? `${rotuloDe(REGIOES_FOLGA, 'parte_de_cima')}: ${rotuloDe(PREFERENCIAS_FOLGA, folgaCima.preferencia).toLowerCase()}${folgaCima.evitarJusta ? ', sem roupa justa' : ''}`
          : `${perfil.preferenciasFolga.length} regiões com preferência`
        : '…',
    },
    {
      para: '/perfil/preferencias',
      titulo: 'Estilo e preferências',
      detalhe: perfil
        ? resumo(
            [
              perfil.estilosPreferidos.slice(0, 3).join(', '),
              perfil.sensacaoCalor ? rotuloDe(SENSACOES_CALOR, perfil.sensacaoCalor) : '',
            ],
            'Estilos, cores, o que não usa e calor',
          )
        : '…',
    },
    {
      para: '/perfil/compromissos',
      titulo: 'Tipos de compromisso',
      detalhe: perfil
        ? perfil.tiposCompromisso.length
          ? perfil.tiposCompromisso.map((t) => t.nome).slice(0, 3).join(', ') +
            (perfil.tiposCompromisso.length > 3 ? '…' : '')
          : 'Rotina e formalidade de cada compromisso'
        : '…',
    },
    {
      para: '/perfil/paleta',
      titulo: 'Paleta pessoal',
      detalhe: perfil?.paletaPessoal?.cores.length ? `${perfil.paletaPessoal.cores.length} cores` : 'Opcional',
    },
    {
      para: '/perfil/fotos',
      titulo: 'Fotos do corpo',
      detalhe: contagens ? (contagens.midiasCorpo ? `${contagens.midiasCorpo} fotos de referência` : 'Opcional') : '…',
    },
  ];

  return (
    <>
      <Cabecalho titulo="Perfil" />
      <AvisoPrivacidadeMedidas />
      <ul className="pf-lista">
        {secoes.map((s) => (
          <li key={s.para}>
            <Link className="pf-item" to={s.para}>
              <span className="pf-item-principal">
                <strong>{s.titulo}</strong>
                <span className="pf-item-detalhe">{s.detalhe}</span>
                {s.alerta && <span className="pf-selo pf-selo-conflito">{s.alerta}</span>}
              </span>
              <span className="pf-seta" aria-hidden="true">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
