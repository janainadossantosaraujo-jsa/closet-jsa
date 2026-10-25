import type { Compromisso, TipoCompromisso } from '../../db/schema';
import type { AlertaSemana } from '../looks/regras';
import '../looks/looks.css';
import './semana.css';

export function nomeCompromisso(c: Compromisso, tipos: readonly TipoCompromisso[]): string {
  const tipo = c.tipoId ? tipos.find((t) => t.id === c.tipoId)?.nome : undefined;
  const partes = [tipo, c.descricao?.trim()].filter(Boolean);
  return partes.length ? partes.join(' — ') : 'Compromisso';
}

export function horarioCompromisso(c: Compromisso): string {
  if (c.horarioInicio && c.horarioFim) return `${c.horarioInicio}–${c.horarioFim}`;
  return c.horarioInicio ?? (c.horarioFim ? `até ${c.horarioFim}` : '');
}

/** Lista de alertas (discreta). */
export function ListaAlertas({ alertas }: { alertas: readonly AlertaSemana[] }) {
  if (!alertas.length) return null;
  const graves = alertas.filter((a) => a.nivel === 'alerta');
  const info = alertas.filter((a) => a.nivel === 'info');
  return (
    <>
      {graves.length > 0 && (
        <div className="aviso lk-aviso" role="note">
          {graves.map((a, i) => (
            <p key={i}>⚠ {a.mensagem}</p>
          ))}
        </div>
      )}
      {info.length > 0 && (
        <div className="sm-info" role="note">
          {info.map((a, i) => (
            <p key={i}>ⓘ {a.mensagem}</p>
          ))}
        </div>
      )}
    </>
  );
}
