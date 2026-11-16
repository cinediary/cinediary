# CineDiary — Roteiro do Teste de Usabilidade (Gate da Fase 1)

> **Objetivo do gate:** "Protótipo testado com 5 pessoas" ([Mvp Inicial.md §8](../Mvp%20Inicial.md)).
> **Material:** [`prototipo/index.html`](./prototipo/index.html), aberto no navegador do notebook ou espelhado no celular.
> **Duração:** 25 a 30 minutos por pessoa · moderado · gravar tela e áudio com consentimento.

## Quem recrutar (5 pessoas)
- 3 pessoas que usam Letterboxd e também assistem séries.
- 1 pessoa que só acompanha séries (TV Time, Serializd ou anotações).
- 1 pessoa que nunca usou app de cinema, para testar o onboarding "frio".
- Nenhuma delas pode ser amigo próximo do time (mesma regra da Fase 0).

## Preparação no protótipo (painel da esquerda)
- Tarefas 1 a 3: cenário padrão.
- Tarefa 5: marcar "Chegou por convite da Ana".
- Tarefa 6: rodar uma vez normal e uma vez com "Match em Modo Descoberta".

## Tarefas

| # | Cenário falado para a pessoa | Começa em | Sucesso quando | Métrica |
| --- | --- | --- | --- | --- |
| 1 | "Você acabou de baixar o app. Crie sua conta e deixe tudo pronto para usar." (observar se marca filmes mesmo sem obrigação) | AU-01a | Chega ao IN-01 | Tempo < 60s · entendeu o checkbox? (pergunta pós-tarefa) |
| 2 | "Ontem você viu *Duna: Parte Dois* e achou nota 4. Registre isso." | IN-01 | Toast "Registrado" | Nº de toques (meta ≤ 3 após digitar) · hesitações · foi pela aba Registrar ou pela Buscar? |
| 3 | "Você está vendo *Ruptura*. Marque que viu o episódio 5 da 2ª temporada e todos antes dele." | IN-01 | T2 com 5 de 10 | Descobriu o "+1 ep", o check de temporada ou o "Marcar até aqui"? |
| 4 | "Traga seu histórico do Letterboxd para cá." | IN-01 | IM-04 | Entendeu as instruções sem ajuda? Confia no resumo? |
| 5 | "A Ana te mandou um link de Match. Siga até ver o resultado." | AU-01 (convite) | Vê o slide 2 (porcentagem) | Tempo total · percebeu que o Match começou sozinho? |
| 6 | "Olhe o resultado e me conte o que achou. Mostraria para alguém?" | MA-05 | Chega ao fim ou compartilha | Consegue explicar de onde veio o número? (sim, parcial ou não) |
| 7 | "Salve um filme para verem juntos e depois encontre essa lista." | MA-05 slide 7 | Vê o filme em MA-06 | Encontrou a "Watchlist de vocês"? |

## Perguntas pós-teste
1. De 1 a 5, quão fácil foi registrar um filme? E um episódio de série?
2. O que você acha que acontece com os filmes marcados no onboarding quando a caixinha fica desmarcada? (valida o entendimento do sinal versus diário)
3. A porcentagem do Match pareceu justa? O que faria você confiar mais nela?
4. Em qual slide você tiraria print ou compartilharia? Por quê?
5. O visual claro de "papel" combina com um app de cinema para você? (comparar com Letterboxd)
6. O que faria você voltar ao app na semana seguinte?
7. Os nomes das 5 abas (Início, Buscar, Registrar, Juntos, Perfil) deixam claro o que tem em cada uma? O que você espera achar em "Juntos"?

## Critérios para passar no gate
- ≥ 4 de 5 pessoas completam as tarefas 1, 2 e 5 sem ajuda.
- Mediana da tarefa 2 em ≤ 3 toques após digitar o nome.
- ≥ 3 de 5 explicam, com as próprias palavras, de onde vem a porcentagem (tarefa 6).
- ≥ 3 de 5 dizem que compartilhariam pelo menos um slide.
- Nenhum problema "bloqueante" sem uma correção planejada.

## Registro dos achados
| Pessoa | Tarefa | Problema observado | Severidade (0–4) | Citação | Correção proposta |
| --- | --- | --- | --- | --- | --- |
| P1 | | | | | |

Severidade: 0 = não é problema · 1 = cosmético · 2 = menor · 3 = maior · 4 = bloqueante.
