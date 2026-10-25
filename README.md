# Closet JSA — app (PWA)

Closet digital pessoal, instalável no Chrome do celular, que funciona sem internet.
**Todos os dados e fotos ficam só no aparelho (IndexedDB).** Não há servidor, chamadas de rede
para dados, APIs externas, analytics nem fontes/CDN externas.

Especificação do modelo de dados: [`../docs/ARQUITETURA-MVP.md`](../docs/ARQUITETURA-MVP.md).

## Como rodar

Requer Node 22+ (testado com Node 25) e npm.

```bash
npm install
npm run dev        # servidor de desenvolvimento (http://localhost:5173)
npm run typecheck  # checagem de tipos (TypeScript strict)
npm test           # testes (Vitest + fake-indexeddb)
npm run build      # gera dist/ (site estático + service worker + manifest)
npm run preview    # serve o dist/ localmente para testar o PWA/offline
npm run icones     # regenera os ícones em public/ (script sem dependências)
```

O `dist/` pode ser publicado em qualquer hospedagem estática, inclusive em subpasta
(`base: './'` + `HashRouter`: as rotas ficam depois do `#`, ex.: `.../#/looks`).
O service worker só funciona em `https` ou `localhost`.

## Estrutura

```
app/
  index.html
  vite.config.ts           Vite + PWA (manifest, service worker) + config do Vitest
  public/                  ícones (gerados por scripts/gerar-icones.mjs) e favicon
  scripts/gerar-icones.mjs
  src/
    main.tsx               entrada; pede armazenamento persistente
    App.tsx                HashRouter, rotas das seções e barra de navegação inferior
    AvisoAtualizacao.tsx   registro do service worker + aviso de nova versão
    styles/global.css      variáveis CSS (cores, espaços, tamanhos), tema claro/escuro
    db/
      schema.ts            TIPOS e LISTAS DE VALORES (rótulos em pt-BR) — compartilhado
      db.ts                banco Dexie (tabelas e índices)
      repo.ts              funções CRUD (usar nas telas)
      hooks.ts             hooks reativos (useLiveQuery)
    lib/
      images.ts            miniaturas (~400 px, JPEG 0,8), original intacto
      backup.ts            exportar/restaurar .zip
      storage.ts           armazenamento persistente e espaço usado
    components/            componentes compartilhados (ver abaixo)
    pages/
      closet/  looks/  semana/  perfil/  ajustes/    uma pasta por seção (index.tsx)
    test/                  setup e utilitários de teste
```

## Regras para quem for adicionar telas

1. **Trabalhe só dentro da pasta da sua seção** (`src/pages/<secao>/`). Crie ali quantos arquivos quiser.
2. **Não edite `src/db/schema.ts` nem `src/db/db.ts`** sem necessidade real. Se faltar algo no modelo,
   registre o pedido em vez de mudar: mudança de índice exige nova versão do banco
   (`this.version(2)`) e revisão do backup.
3. Acesse dados **pelas funções de `src/db/repo.ts` e hooks de `src/db/hooks.ts`**, não pelo `db` direto
   (as funções mantêm regras: apagar peça apaga as fotos; look só com peças existentes; medida conferida
   não é sobrescrita etc.).
4. Use as **listas de `schema.ts`** (`CATEGORIAS`, `OCASIOES`, `DESCONFORTOS`, `DISPONIBILIDADES`,
   `ELASTICIDADES`, `ESTRUTURAS`, `TIPOS_MIDIA_PECA`, `REGIOES_MEDIDA`, `TIPOS_MEDIDA`…) para selects e
   chips, e `rotuloDe(lista, valor)` para mostrar o rótulo.
5. Fotos do corpo vão **só** para `midiasCorpo` (`adicionarFotoCorpo`); nunca para `midias`.
6. Use os **componentes de `src/components/`** e as **variáveis CSS** de `global.css`. Estilos próprios da
   seção podem ficar num `.css` dentro da pasta da seção (importado no `index.tsx` dela). Sem bibliotecas de UI.
7. Interface em português do Brasil, mobile-first (~412 px), toques de no mínimo 48 px (`--toque-min`).
8. Nada de rede: sem `fetch` para dados, sem CDN, sem fontes externas.

### Sub-rotas das seções

`App.tsx` registra cada seção com curinga:

| Seção   | Rota registrada | Exemplo de sub-rota (definida dentro da seção) |
|---------|-----------------|-------------------------------------------------|
| Closet  | `/*`            | `peca/:id` → `/#/peca/123`, `nova` → `/#/nova` |
| Looks   | `/looks/*`      | `:id` → `/#/looks/abc`                          |
| Semana  | `/semana/*`     | `:inicio` → `/#/semana/2026-10-19`              |
| Perfil  | `/perfil/*`     | `medidas` → `/#/perfil/medidas`                 |
| Ajustes | `/ajustes/*`    | —                                               |

O Closet é dono da raiz e de qualquer caminho que **não** comece com `/looks`, `/semana`, `/perfil` ou
`/ajustes`. Cada `index.tsx` define as suas com `<Routes>` aninhado e caminhos **relativos**:

```tsx
export default function LooksPage() {
  return (
    <Routes>
      <Route index element={<ListaLooks />} />
      <Route path="novo" element={<EditorLook />} />
      <Route path=":id" element={<DetalheLook />} />
    </Routes>
  );
}
```

Links entre seções usam caminhos absolutos (`<Link to="/peca/123">`, `navigate('/looks/abc')`).

## Componentes compartilhados (`src/components`)

Importe de `../../components`.

| Componente | Uso |
|---|---|
| `Botao` | `<Botao variante="primario\|secundario\|perigo\|fantasma" bloco carregando onClick>` — altura mínima 48 px |
| `CampoTexto` | `<CampoTexto rotulo valor aoMudar dica erro />` (aceita props de `<input>`) |
| `CampoNumero` | `<CampoNumero rotulo valor={number\|undefined} aoMudar unidade="cm" />` — aceita vírgula, teclado numérico |
| `CampoArea` | texto longo (observações) |
| `Selecao` | `<Selecao rotulo opcoes={CATEGORIAS} valor aoMudar obrigatorio vazio="…" />` — select nativo |
| `Chips` | `<Chips rotulo opcoes={OCASIOES} valor={[...]} aoMudar unico? />` — múltipla escolha |
| `Cabecalho` | `<Cabecalho titulo voltar acoes={...} />` — `h1` da página; `voltar` = true (histórico) ou caminho |
| `ModalConfirmacao` | `<ModalConfirmacao aberto titulo perigoso carregando aoConfirmar aoCancelar>texto</…>` |
| `SeletorFoto` | `<SeletorFoto fotos={File[]} aoMudar multiplas camera="environment\|user\|false" maximo />` — botões "Tirar foto" (input com `capture`) e "Galeria" (várias), com prévias removíveis |
| `MiniaturaBlob` | `<MiniaturaBlob blob alt />` — mostra Blob via object URL e revoga ao trocar/desmontar |
| `MiniaturaMidia` | `<MiniaturaMidia midiaId alt original? />` — carrega a mídia pelo ID |
| `useObjectUrl(blob)` | hook para usar um Blob como `src` com revogação automática |
| `EmConstrucao` | placeholder de página |

Classes CSS úteis: `cartao`, `aviso`, `pilha`, `linha`, `texto-suave`, `grade-fotos`, `miniatura`, `placeholder`.

## Dados (resumo)

Tabelas (Dexie, versão 1): `pecas`, `midias` (fotos de peças/looks/compras), `midiasCorpo` (fotos do corpo,
separadas), `looks`, `semanas`, `perfil` (registro único `id = "perfil"`), `medidasCorporais` (uma linha por
região, com histórico), `compras` (compra candidata, etapa E), `meta` (chave-valor: `ultimoBackup` etc.).

IDs com `crypto.randomUUID()` (`novoId()`), datas em ISO (`agoraISO()`), dias como `AAAA-MM-DD`,
medidas em cm com origem `informado | estimado | conferido`.

**Medidas corporais:** `registrarMedidaCorporal(regiao, valor, origem)` sempre acrescenta ao histórico.
Um valor conferido só é substituído por outro conferido ou por escolha explícita
(`resolverConflitoMedida`, `definirMedidaAtual`). Se um estimado/informado diverge do conferido
(> 1 cm), a medida fica com `conflito` para a usuária decidir.

**Backup:** `.zip` com `manifesto.json`, `dados.json`, `midias/<id>/original.*`, `midias/<id>/miniatura.jpg`
e `corpo/<id>/…`. A restauração valida tudo antes e substitui o banco numa única transação.
