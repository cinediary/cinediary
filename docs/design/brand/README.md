# Marca do CineDiary: ícones e splash

Fonte do design. O app **não** lê nada daqui: os arquivos usados de verdade foram copiados para
`cinediary-mobile/assets/` e para `cinediary-mobile/src/shared/ui/splash/`.

| Pasta | O que tem | Usado no app como |
| --- | --- | --- |
| `icone/` | Ícone completo (`cinediary-icon-1024.png` / `.svg`), as camadas separadas (fundo, letra "c", estrela) e o `app.icon` do Icon Composer (iOS 26: claro, escuro e tingido) | `assets/icon.png` (Android e iOS antigo) e `assets/app.icon` (iOS, em `app.json` → `ios.icon`) |
| `android-e-splash/` | Ícone adaptativo do Android (foreground, monocromático, fundo) e o "c" da splash | `assets/android-icon-*.png` e `assets/splash-icon.png` |
| `android-e-splash/AnimatedSplash.tsx`, `cinediaryMark.ts` | O exemplo original da splash animada | Versão adaptada em `src/shared/ui/splash/` (`AnimatedSplash.tsx` e `brandMark.ts`) |

**Cores:**
- fundo terracota `#A9553A` (`palette.terracota600`);
- "c" creme `#FFF4E6` (`party.cream`);
- estrela `#F4C84B` (`party.butter`).

**Mudou o ícone ou o "c"?**
1. Exporte de novo para cá e copie para `cinediary-mobile/assets/`.
2. Se o "c" mudar de posição ou de forma, gere de novo os caminhos em `brandMark.ts`. Eles precisam bater com o
   `splash-icon.png`, senão a troca da splash nativa para a animada dá um "pulo".
