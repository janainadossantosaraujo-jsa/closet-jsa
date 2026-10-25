import { Botao, CampoNumero, CampoTexto, Selecao } from '../../components';
import { ORIGENS_DADO, REGIOES_MEDIDA, TIPOS_MEDIDA } from '../../db/schema';
import { formatarCm, medidaCompleta, novaLinhaMedida, tipoMedidaPadrao, voltaDaLarguraAberta, type LinhaMedida } from './util';

interface EditorMedidasProps {
  linhas: LinhaMedida[];
  aoMudar: (linhas: LinhaMedida[]) => void;
}

/** Lista editável de medidas da peça (B4). */
export function EditorMedidas({ linhas, aoMudar }: EditorMedidasProps) {
  const alterar = (i: number, parcial: Partial<LinhaMedida>) =>
    aoMudar(linhas.map((l, j) => (j === i ? { ...l, ...parcial } : l)));
  const incompletas = linhas.filter((l) => !medidaCompleta(l)).length;

  return (
    <div className="closet-medidas">
      <p className="campo-dica closet-ajuda">
        <strong>Largura aberta</strong>: peça deitada e esticada, medida de um lado ao outro (é cerca de metade da volta).{' '}
        <strong>Circunferência</strong>: a volta inteira, com fita, como se mede no corpo.
      </p>
      <p className="campo-dica closet-ajuda">
        Origem: <strong>informado</strong> = da etiqueta ou loja; <strong>estimado</strong> = aproximado;{' '}
        <strong>conferido</strong> = medido com fita.
      </p>

      {linhas.map((l, i) => (
        <div className="closet-medida cartao" key={l.id}>
          <div className="closet-medida-grade">
            <Selecao
              rotulo="Região"
              opcoes={REGIOES_MEDIDA}
              valor={l.regiao}
              aoMudar={(regiao) =>
                alterar(i, regiao ? { regiao, tipo: l.regiao ? l.tipo : tipoMedidaPadrao(regiao) } : { regiao })
              }
            />
            <CampoNumero
              rotulo="Valor"
              unidade="cm"
              valor={l.valor}
              aoMudar={(valor) => alterar(i, { valor })}
              dica={
                l.tipo === 'largura_aberta' && l.valor
                  ? `≈ ${formatarCm(voltaDaLarguraAberta(l.valor))} de volta`
                  : undefined
              }
            />
          </div>
          <Selecao rotulo="Como foi medida" opcoes={TIPOS_MEDIDA} valor={l.tipo} obrigatorio aoMudar={(tipo) => tipo && alterar(i, { tipo })} />
          <Selecao rotulo="Origem" opcoes={ORIGENS_DADO} valor={l.origem} obrigatorio aoMudar={(origem) => origem && alterar(i, { origem })} />
          <CampoTexto
            rotulo="Observação (opcional)"
            valor={l.observacao}
            aoMudar={(observacao) => alterar(i, { observacao })}
            placeholder="ex.: medida na altura da cava"
          />
          <Botao variante="fantasma" onClick={() => aoMudar(linhas.filter((_, j) => j !== i))}>
            Remover medida
          </Botao>
        </div>
      ))}

      {incompletas > 0 && (
        <p className="campo-dica">Medidas sem região ou valor não são salvas.</p>
      )}
      <Botao variante="secundario" bloco onClick={() => aoMudar([...linhas, novaLinhaMedida()])}>
        ＋ Adicionar medida
      </Botao>
    </div>
  );
}
