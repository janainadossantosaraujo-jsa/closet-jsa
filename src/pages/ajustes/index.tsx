import { useCallback, useEffect, useRef, useState } from 'react';
import { Botao, Cabecalho, ModalConfirmacao } from '../../components';
import { useContagens, useMeta } from '../../db/hooks';
import {
  baixarArquivo,
  exportarBackup,
  lerManifestoBackup,
  restaurarBackup,
  type ManifestoBackup,
} from '../../lib/backup';
import {
  formatarBytes,
  pedirArmazenamentoPersistente,
  situacaoArmazenamento,
  type SituacaoArmazenamento,
} from '../../lib/storage';

/** Dias sem backup a partir dos quais o lembrete fica em destaque. */
const DIAS_LEMBRETE = 7;

function formatarData(iso: string | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function plural(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

function diasDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export default function AjustesPage() {
  const ultimoBackup = useMeta<string>('ultimoBackup');
  const contagens = useContagens();

  const [armaz, setArmaz] = useState<SituacaoArmazenamento>();
  const [exportando, setExportando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string }>();

  const refArquivo = useRef<HTMLInputElement>(null);
  const [arquivoRestaurar, setArquivoRestaurar] = useState<File>();
  const [manifesto, setManifesto] = useState<ManifestoBackup>();
  const [restaurando, setRestaurando] = useState(false);

  const atualizarArmaz = useCallback(() => {
    void situacaoArmazenamento().then(setArmaz);
  }, []);
  useEffect(atualizarArmaz, [atualizarArmaz]);

  async function exportar() {
    setMensagem(undefined);
    setExportando(true);
    try {
      const { blob, nomeArquivo } = await exportarBackup();
      baixarArquivo(blob, nomeArquivo);
      setMensagem({ tipo: 'ok', texto: `Backup gerado: ${nomeArquivo} (${formatarBytes(blob.size)}). Guarde-o fora do celular também.` });
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: `Não foi possível gerar o backup: ${(e as Error).message}` });
    } finally {
      setExportando(false);
      atualizarArmaz();
    }
  }

  async function escolherArquivo(f: File | undefined) {
    setMensagem(undefined);
    if (!f) return;
    try {
      const m = await lerManifestoBackup(f);
      setArquivoRestaurar(f);
      setManifesto(m);
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: (e as Error).message || 'Arquivo inválido.' });
    }
  }

  const cancelarRestauracao = useCallback(() => {
    setArquivoRestaurar(undefined);
    setManifesto(undefined);
  }, []);

  async function confirmarRestauracao() {
    if (!arquivoRestaurar) return;
    setRestaurando(true);
    try {
      const m = await restaurarBackup(arquivoRestaurar);
      setMensagem({ tipo: 'ok', texto: `Backup de ${formatarData(m.criadoEm)} restaurado.` });
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: `Restauração não concluída; nada foi alterado. ${(e as Error).message}` });
    } finally {
      setRestaurando(false);
      cancelarRestauracao();
      atualizarArmaz();
    }
  }

  async function pedirPersistencia() {
    const ok = await pedirArmazenamentoPersistente();
    atualizarArmaz();
    if (!ok) {
      setMensagem({
        tipo: 'erro',
        texto: 'O navegador não concedeu agora. Instalar o app na tela inicial costuma resolver; faça backups regularmente.',
      });
    }
  }

  const atrasado = !ultimoBackup || diasDesde(ultimoBackup) >= DIAS_LEMBRETE;
  const pct = armaz?.usoBytes != null && armaz.cotaBytes ? Math.min(100, (armaz.usoBytes / armaz.cotaBytes) * 100) : undefined;

  return (
    <>
      <Cabecalho titulo="Ajustes" />

      {mensagem && (
        <div className={mensagem.tipo === 'erro' ? 'aviso' : 'cartao'} role={mensagem.tipo === 'erro' ? 'alert' : 'status'}>
          {mensagem.texto}
        </div>
      )}

      <section className="cartao" aria-labelledby="t-backup">
        <h2 id="t-backup">Backup</h2>
        {ultimoBackup === undefined || atrasado ? (
          <p className="aviso">
            {ultimoBackup
              ? `Último backup há ${diasDesde(ultimoBackup)} dias (${formatarData(ultimoBackup)}). Faça um novo backup.`
              : 'Nenhum backup feito ainda. Se o Chrome ou o celular for restaurado, os dados se perdem.'}
          </p>
        ) : (
          <p>Último backup: {formatarData(ultimoBackup)}.</p>
        )}
        <div className="pilha">
          <Botao bloco onClick={exportar} carregando={exportando}>
            Exportar backup
          </Botao>
          <Botao bloco variante="secundario" onClick={() => refArquivo.current?.click()} disabled={restaurando}>
            Restaurar backup
          </Botao>
          <input
            ref={refArquivo}
            type="file"
            accept=".zip,application/zip"
            hidden
            onChange={(e) => {
              void escolherArquivo(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
        <p className="texto-suave">
          O arquivo .zip contém todos os dados e fotos (inclusive fotos do corpo). Ele é salvo em Downloads; guarde-o em local seguro.
        </p>
      </section>

      <section className="cartao" aria-labelledby="t-armaz">
        <h2 id="t-armaz">Armazenamento no aparelho</h2>
        {!armaz ? (
          <p className="texto-suave">Verificando…</p>
        ) : !armaz.suportado ? (
          <p className="aviso">Este navegador não informa o armazenamento.</p>
        ) : (
          <>
            <p>
              Armazenamento persistente:{' '}
              <strong>{armaz.persistente ? 'ativado' : 'não ativado'}</strong>
            </p>
            {!armaz.persistente && (
              <Botao variante="secundario" bloco onClick={pedirPersistencia}>
                Pedir armazenamento persistente
              </Botao>
            )}
            <p style={{ marginBottom: 0 }}>
              Espaço usado: {formatarBytes(armaz.usoBytes)} de {formatarBytes(armaz.cotaBytes)} disponíveis
            </p>
            {pct !== undefined && (
              <div className="medidor" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Espaço usado">
                <div style={{ width: `${Math.max(pct, 1)}%` }} />
              </div>
            )}
          </>
        )}
        {contagens && (
          <p className="texto-suave">
            {plural(contagens.pecas, 'peça', 'peças')} · {plural(contagens.midias, 'foto de peças/looks', 'fotos de peças/looks')} ·{' '}
            {plural(contagens.midiasCorpo, 'foto do corpo', 'fotos do corpo')} · {plural(contagens.looks, 'look', 'looks')} ·{' '}
            {plural(contagens.semanas, 'semana', 'semanas')}
          </p>
        )}
      </section>

      <section className="cartao" aria-labelledby="t-priv">
        <h2 id="t-priv">Privacidade</h2>
        <p className="texto-suave" style={{ margin: 0 }}>
          Todos os dados e fotos ficam só neste aparelho. O app não envia nada pela internet.
        </p>
      </section>

      <ModalConfirmacao
        aberto={!!manifesto}
        titulo="Restaurar backup?"
        textoConfirmar="Substituir tudo"
        perigoso
        carregando={restaurando}
        aoConfirmar={() => void confirmarRestauracao()}
        aoCancelar={cancelarRestauracao}
      >
        {manifesto && (
          <>
            <p>
              Backup de <strong>{formatarData(manifesto.criadoEm)}</strong> com {manifesto.contagens.pecas ?? 0} peças,{' '}
              {(manifesto.contagens.midias ?? 0) + (manifesto.contagens.midiasCorpo ?? 0)} fotos e {manifesto.contagens.looks ?? 0} looks.
            </p>
            <p className="aviso">Todos os dados atuais deste aparelho serão apagados e substituídos pelo backup. Isso não pode ser desfeito.</p>
          </>
        )}
      </ModalConfirmacao>
    </>
  );
}
