# CineDiary — UX-01 · Design System "Diário de Papel" (Enxovaly + Samokat)

> **Versão:** 1.2 · **Data:** 13/11/2026 (v1.1: regra de emoji, barra nativa · v1.2: 5 abas na mesma barra, iOS 27, rótulos por idioma) · **Responsável:** Designer UX/UI Senior
> **Status:** proposta pronta para implementação (FE-01) e para o teste com 5 pessoas (gate da Fase 1)
> **Tokens prontos para código:** [`tokens.ts`](./tokens.ts) · **Protótipo navegável:** [`prototipo/index.html`](./prototipo/index.html)

---

## 1. Princípios

| # | Princípio | Na prática |
| --- | --- | --- |
| 1 | **O cartaz é a cor da tela** | A interface fica em creme e tinta. A cor forte fica para os pôsteres e para o Match Story. |
| 2 | **Papel, não vidro** | Fundo de papel creme, bordas finas e sombras quentes e curtas. Sem glassmorphism nem neon. |
| 3 | **Registrar é mais rápido que lembrar** | Toda ação principal cabe em até 3 toques e tem estado otimista: a tela muda na hora e sincroniza depois. |
| 4 | **Conversa, não formulário** | O texto fala com a pessoa: "Que tal registrar o que você viu ontem?". O carinho vem das palavras e do itálico, não de emoji. |
| 5 | **Festa só no Match** | O app é calmo. Só os Stories do Match têm cor saturada, tipografia gigante e animação (estilo Samokat). |
| 6 | **Acessível por padrão** | Texto com contraste AA, alvos de toque de 44pt, suporte a fonte dinâmica, VoiceOver/TalkBack e "Reduzir movimento". |

---

## 2. Cores

Todos os contrastes foram medidos com a fórmula do WCAG 2.1 sobre o fundo `bg` `#FAF6F0`.

### 2.1. Neutros (papel e tinta)

| Token | Hex | Uso | Contraste no `bg` |
| --- | --- | --- | --- |
| `bg` | `#FAF6F0` | Fundo das telas | — |
| `surface` | `#FFFDF9` | Cards, sheets e inputs | — |
| `surfaceSunken` | `#F3ECE2` | Chips inativos, trilhos de progresso, skeleton | — |
| `border` | `#E6DCCF` | Divisores e borda de card (decorativa) | 1.26 |
| `borderStrong` | `#CBBFB1` | Borda de input e checkbox vazio (sempre acompanhados de rótulo) | 1.68 |
| `ink900` | `#2A211C` | Títulos e texto principal | **14.64** ✓ AAA |
| `ink700` | `#4F433B` | Texto secundário e ícones ativos | **8.87** ✓ AAA |
| `ink500` | `#76695F` | Legendas, metadados e placeholder | **4.93** ✓ AA |
| `ink400` | `#8E8176` | Ícones inativos e estrela vazia (não usar em texto) | 3.51 ✓ não-texto |

### 2.2. Acentos "empoeirados"

| Família | 100 (fundo) | 300 (chip/realce) | 500 (decorativo) | 600/700 (texto e ação) | Significado |
| --- | --- | --- | --- | --- | --- |
| **Terracota** | `#F6E1D7` | `#E9B8A3` | `#C2694B` | `#A9553A` (botão) · `#8C432C` (texto, 6.60) | Ação principal e marca |
| **Pipoca** | `#FBF0D4` | `#F2D58A` | `#D9A23A` | `#A9761A` (contorno de estrela) · `#7D5A12` (texto, 5.83) | Notas, estrelas e destaques |
| **Sálvia** | `#E3EBDD` | `#C5D3BC` | `#8FA685` | `#4A6243` (texto, 6.25) | Assistido, concluído, progresso, sucesso |
| **Rosa queimado** | `#F7E4E1` | `#EDC7C1` | `#D08C86` | `#8C4B47` (texto, 6.07) | Curtir/favorito, Match e afeto |

**Regras de uso**
- Botão primário: fundo `terracota600` `#A9553A` com texto `surface` (5.11 ✓ AA).
- O tom 500 nunca é usado em texto pequeno (terracota500 tem 3.60 e só serve para ícone ou texto ≥ 24px).
- Estrela cheia: preenchimento `pipoca500` `#D9A23A` com contorno de 1.5px `pipoca600` `#A9761A` (3.68 ✓ não-texto). Estrela vazia: contorno `ink400`.
- Estados semânticos: sucesso = sálvia, aviso = pipoca, erro = `#A23B2E` (texto 6.2 ✓), sempre com ícone e texto, nunca só com cor.

### 2.3. Paleta "Festa" (somente Match Story)

| Token | Hex | Texto sobre ele | Contraste |
| --- | --- | --- | --- |
| `party.tomato` | `#B4532F` | `#FFF4E6` | 4.58 ✓ (usar texto ≥ 18pt) |
| `party.butter` | `#F4C84B` | `#2A211C` | 9.91 ✓ |
| `party.plum` | `#5B2A44` | `#FFF4E6` | 10.40 ✓ |
| `party.sage` | `#A9C49A` | `#1F2A1C` | 7.86 ✓ |
| `party.blush` | `#F2A8A0` | `#2A211C` | 8.17 ✓ |
| `party.ink` | `#2A211C` | `#FFF4E6` | 14.6 ✓ |

Cada slide usa **uma cor de fundo + uma cor de forma (blob/sticker) + tinta**. Nunca mais de 3 cores por slide.

---

## 3. Tipografia

| Papel | Fonte | Pacote Expo | Por quê |
| --- | --- | --- | --- |
| Display / títulos | **Fraunces** (serifada variável, com itálico e eixo "SOFT") | `@expo-google-fonts/fraunces` | Serifada calorosa com itálico expressivo, lembra capa de diário. Licença OFL. |
| Texto / UI | **Nunito** (sem-serifa arredondada) | `@expo-google-fonts/nunito` | Arredondada e muito legível em tamanhos pequenos. Licença OFL. |

**Regra do itálico:** em todo título, a palavra emocional vai em itálico: "Seu ano em *filmes*", "Vocês dois *amam*", "O que você viu *ontem*?".

### Escala (pt, com suporte a Dynamic Type até 200%)

| Token | Fonte | Tamanho / altura de linha | Uso |
| --- | --- | --- | --- |
| `display` | Fraunces 600, SOFT 100 | 40 / 44 | Porcentagem do Match e números de destaque |
| `h1` | Fraunces 600 | 30 / 36 | Título de tela |
| `h2` | Fraunces 600 | 22 / 28 | Título de seção e nome do filme na página |
| `h3` | Nunito 800 | 17 / 22 | Título de card e de sheet |
| `body` | Nunito 500 | 16 / 24 | Texto corrido e reviews |
| `bodyStrong` | Nunito 700 | 16 / 24 | Botões e rótulos |
| `caption` | Nunito 600 | 13 / 18 | Metadados (ano · duração · gênero) |
| `overline` | Nunito 800, caixa alta, +0.8 de espaçamento | 11 / 14 | Rótulos de seção ("CONTINUE ASSISTINDO") |
| `story.hero` | Fraunces 700 itálico, SOFT 100 | 72–120 / 0.95 | Match Story |

O título nunca deve passar de 2 linhas: trunque com reticências e mostre o título completo no leitor de tela.

---

## 4. Espaçamento, raio, elevação e grade

- **Espaçamento (base 4):** `xs 4 · sm 8 · md 12 · lg 16 · xl 24 · 2xl 32 · 3xl 48`. As margens laterais da tela são de **20pt**.
- **Raio:** `sm 8` (chip pequeno, poster mini) · `md 12` (poster) · `lg 20` (card) · `xl 28` (sheet) · `pill 999` (botões e chips).
- **Elevação (sombra quente, nunca cinza):**
  - `e1`: `0 1 2 rgba(74,52,38,0.06)`, para cards.
  - `e2`: `0 6 16 rgba(74,52,38,0.10)`, para sheets e o FAB.
  - `e3`: `0 12 32 rgba(74,52,38,0.16)`, para modais.
- **Pôster:** proporção 2:3. Tamanhos: `xs 40×60` (lista), `sm 72×108` (grade de 4 colunas), `md 104×156` (carrossel), `lg 140×210` (detalhe). Sempre com raio de 12, borda interna de 1px `rgba(42,33,28,0.08)` e fallback com o título em Fraunces sobre `surfaceSunken`.
- **Grade:** 4 colunas com gutter de 12 para grades de pôster e 1 coluna para listas.

---

## 5. Movimento

| Token | Duração | Curva | Uso |
| --- | --- | --- | --- |
| `quick` | 120ms | `ease-out` | Toque, troca de estado do chip e estrela |
| `base` | 220ms | `cubic-bezier(.2,.8,.2,1)` | Abrir sheet e navegar |
| `gentle` | 400ms | `cubic-bezier(.2,.8,.2,1)` | Barra de progresso e contadores |
| `party` | 600–900ms | spring (damping 12) | Somente no Match Story: número subindo, stickers e pôsteres entrando |

- Haptics (`expo-haptics`): `selection` ao escolher estrela ou chip, `success` ao registrar, `impactLight` ao marcar episódio.
- **Reduzir movimento** ativo: o Story troca animações por fade de 150ms e o contador da porcentagem aparece direto no valor final.

---

## 6. Componentes base

| Componente | Anatomia | Estados | Notas de acessibilidade |
| --- | --- | --- | --- |
| **Button** | Pílula de 52pt de altura (primário) ou 44pt (secundário) com rótulo `bodyStrong` e ícone opcional | default, pressed (escurece 8% e escala para 0.98), disabled (40% de opacidade com motivo visível embaixo), loading (spinner no lugar do rótulo) | `accessibilityRole="button"`, rótulo com verbo ("Registrar filme") |
| Variantes | `primary` (terracota600), `secondary` (surface + borda ink900), `ghost` (texto terracota700), `danger` (texto erro) | | |
| **PosterCard** | Pôster + selos sobrepostos (✓ assistido em sálvia, ♥ em rosa, nota mini em pipoca) + título e ano opcionais | default, selecionado (borda de 3px terracota600 + check no canto), carregando (skeleton) | Rótulo: "Duna: Parte Dois, 2024, assistido, nota 4 e meia" |
| **StarRating** | 5 estrelas de 32pt (sheet) ou 14pt (mini). Meia estrela: toque na metade esquerda ou arraste horizontal | vazio, hover/arraste (preview), definido; tocar na mesma nota de novo limpa | `accessibilityRole="adjustable"`, incremento de 0,5, valor lido como "3 e meia estrelas" |
| **LikeButton** | Coração de 28pt | off (contorno ink400), on (preenchido rosa500 com pequeno "pop") | Rótulo "Curtir" / "Curtido" |
| **Chip** | Pílula de 40pt com emoji opcional e rótulo | off (surfaceSunken), on (fundo da cor do acento + check) | Papel `checkbox` ou `radio` |
| **QuickLogSheet** | Bottom sheet: pôster + título; ações (Assistido, Curtir, Watchlist); StarRating; data ("Hoje" editável); "Rever" (rewatch); campo de review recolhido; CTA "Registrar" | Ver UX-03 | O foco vai para o título do sheet ao abrir |
| **ProgressBar** | Trilho surfaceSunken de 8pt com preenchimento sálvia500 e rótulo "23 de 62 ep." | 0%, parcial, 100% (preenchimento sálvia700 + ✓) | Leitor: "Temporada 2, 6 de 10 episódios assistidos" |
| **EpisodeRow** | Número + título + duração + checkbox circular de 28pt (alvo de 44) | não visto, visto, futuro (não lançado: desabilitado com data) | Pressão longa = "Marcar até aqui" (também disponível no menu de acessibilidade) |
| **Barra de abas (nativa)** | 5 abas na mesma barra: **Início · Buscar · Registrar · Juntos · Perfil** (em inglês: Home · Search · Log · Together · Profile, conforme o idioma do aparelho), usando `NativeTabs` do Expo Router: Liquid Glass no iOS e Material 3 no Android. Detalhes na seção 7.1 | ativa: tint terracota600; inativa: cor do sistema | Badge do Match quando há convite aceito ou Story novo. Os rótulos e o VoiceOver/TalkBack vêm do sistema |
| **EmptyState** | Ilustração de linha (pôster, pipoca ou ingresso) + título em Fraunces + texto + CTA | | Sempre com uma ação, nunca vazio "seco" |
| **Toast / Snackbar** | Pílula ink900 com texto creme e ação "Desfazer" | 4s; persiste se o leitor de tela estiver ativo | Anunciado via `AccessibilityInfo.announceForAccessibility` |
| **StoryCanvas** | Moldura 9:16, barras de progresso no topo, X para fechar, botão "Compartilhar este" | playing, paused (pressão longa), exporting | Ver UX-05 |

---

## 7. Iconografia, ilustração e emoji

- Ícones dentro das telas: **Phosphor Icons** (`phosphor-react-native`), peso *regular* para inativo e *fill* para ativo. O traço arredondado combina com a Nunito.
- **Emoji: proibido na interface do app.** Não usamos emoji em botões, chips, títulos, toasts, estados vazios, rótulos nem mensagens de convite. No lugar, usamos ícone Phosphor ou nenhum ícone.
  - Exceção: o **Match Story**, que é o "momento festa" e pode ter no máximo 1 emoji por slide, como sticker.
  - Texto escrito pela pessoa (reviews, @, nome) mostra os emojis que ela digitou, sem restrição.
- Gêneros no onboarding: chips só com texto (sem emoji nem ícone).

- Ilustrações: traço de linha de 2px ink900 com preenchimento de um acento, no estilo de caderno de rabiscos (pôster dobrado, balde de pipoca, ingresso). Só aparecem em vazios, sucesso e onboarding.
- Stickers do Story (Samokat): formas orgânicas chapadas (blob, estrela de 8 pontas, flor, arco) nas cores da festa, giradas de -8° a 8°.

### 7.1. Barra de abas nativa (decisão v1.2, iOS 27)
Usamos a barra de abas do próprio sistema, e não uma barra desenhada por nós. Ela é implementada com `NativeTabs` do Expo Router 58.

**5 abas, todas dentro da mesma barra.** A busca é uma aba comum: não usamos `role="search"`, que no iOS 26 separava a lupa num botão redondo. No iOS 27, a Apple voltou a recomendar a busca como aba do tab bar, com a mesma aparência das outras (WWDC26, "Design intuitive search experiences"). Assim, a barra fica igual em todas as versões.

| # | Rótulo (pt) | Rótulo (en) | SF Symbol (iOS) | Material Symbol (Android) | Tela |
| --- | --- | --- | --- | --- | --- |
| 1 | Início | Home | `house` / `house.fill` | `home` | IN-01 |
| 2 | Buscar | Search | `magnifyingglass` | `search` | BU-01 |
| 3 | Registrar | Log | `plus.circle` / `plus.circle.fill` | `add_circle` | RG-01 |
| 4 | Juntos | Together | `person.2` / `person.2.fill` | `group` | MA-01 (Matches) |
| 5 | Perfil | Profile | `person.crop.circle` / `.fill` | `account_circle` | PE-01 |

**Idioma dos rótulos:** os rótulos seguem o idioma do aparelho (`expo-localization`). Português usa a coluna "pt"; qualquer outro idioma usa a coluna "en". O resto do app continua em PT-BR no MVP. Traduzir o app inteiro é uma decisão de escopo do Architect: por isso, todos os textos já devem nascer num arquivo de traduções.

| | iOS 27 (alvo) | iOS 18–26 | Android |
| --- | --- | --- | --- |
| Visual | **Liquid Glass**: barra de vidro com as 5 abas e o conteúdo rolando por baixo | iOS 26: Liquid Glass. iOS 18–25: barra translúcida padrão | Barra Material 3 com 5 itens e indicador em pílula |
| Aba em destaque | Nenhuma: não usamos aba "prominent" do iOS 27, para as 5 ficarem iguais | — | — |
| Ao rolar | `minimizeBehavior="onScrollDown"` no Início | iOS 26 igual; antes, fixa | Fixa |
| Cor | `tintColor` terracota600 `#A9553A` | Igual | `indicatorColor` terracota100 `#F6E1D7`, ícone ativo terracota700, `backgroundColor` surface `#FFFDF9` |
| Rótulos | Sempre visíveis | Sempre visíveis | `labelVisibilityMode="labeled"` (com 5 itens o Android esconderia os rótulos inativos) |

**Regras de layout com a barra nativa**
- O conteúdo passa por baixo do vidro. Toda lista rolável usa `contentInsetAdjustmentBehavior="automatic"` (iOS) ou o inset inferior da área segura, para o último item não ficar escondido.
- Nada de botão flutuante perto da barra: o registro tem a própria aba (Registrar).
- Telas que **escondem** a barra: Match Story (modal em tela cheia), fluxo de importação e registro rápido (sheet). O onboarding e o login ficam fora do grupo `(tabs)`.
- Não pintar o fundo da barra no iOS: o vidro precisa do creme e dos pôsteres por trás.
- Badge: ponto na aba Juntos quando um convite é aceito ou há um Story novo.
- Risco: a API de abas nativas do Expo ainda pode mudar entre versões. Se algo quebrar, o fallback é o `Tabs` JS atual, com as mesmas 5 abas.

---

## 8. Tom de voz (PT-BR)

| Em vez de | Escreva |
| --- | --- |
| "Log your film" / "Registrar entrada" | "Que tal registrar o que você viu *ontem*?" |
| "Nenhum resultado" | "Não achamos esse título. Tente o nome original ou o ano." |
| "Erro 500" | "Algo saiu do roteiro. Tente de novo em instantes." |
| "Import completed" | "Pronto! Trouxemos **842 filmes** do seu Letterboxd." |
| "Match pending" | "Aguardando seu amigo *topar*" |
| "Compatibility: 78%" | "Vocês são **78%** cinema juntos" |

Regras: segunda pessoa ("você"), frases curtas, **sem emoji** (exceto no Match Story), nunca culpar a pessoa e números sempre com separador brasileiro (1.000, 4,5).

---

## 9. Handoff para FE-01

1. Copiar [`tokens.ts`](./tokens.ts) para `cinediary-mobile/src/theme/tokens.ts`.
2. Instalar `@expo-google-fonts/fraunces`, `@expo-google-fonts/nunito`, `phosphor-react-native` e `expo-haptics`. O sheet do registro rápido é o `BottomSheet` próprio de `src/shared/ui/` (gesture-handler + Reanimated), sem `@gorhom/bottom-sheet`.
   Trocar o `Tabs` de `src/app/(tabs)/_layout.tsx` por `NativeTabs` conforme a seção 7.1.
3. Criar os componentes da seção 6 em `src/components/` com stories de referência na própria rota `/_dev/design-system` (só em desenvolvimento).
4. Forçar o tema claro no MVP (`userInterfaceStyle: "light"` no `app.json`). O modo escuro fica fora do MVP.
