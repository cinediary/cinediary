# CineDiary
## Visão geral do produto, funcionalidades e arquitetura

**Versão:** 1.3  
**Tipo de produto:** Rede social cinematográfica  
**Plataformas:** Aplicativo mobile (iOS e Android), com possibilidade de expansão para Web.  
**Modelo de negócio:** Freemium.

---

# 1. O que é o CineDiary?

O **CineDiary** é uma rede social voltada para pessoas que amam filmes e séries. A proposta é criar um espaço onde os usuários possam registrar suas experiências cinematográficas, compartilhar opiniões, acompanhar o que seus amigos estão assistindo e descobrir novas produções a partir de seus próprios gostos e de suas conexões sociais.

Mais do que um catálogo de filmes ou uma plataforma de avaliações, o CineDiary pretende ser um ambiente onde o consumo de entretenimento se transforma em uma experiência social e personalizada.

Atualmente, existem plataformas que resolvem partes desse problema. O Letterboxd, por exemplo, oferece uma experiência muito interessante de registro e avaliação de filmes. O TV Time trabalha com acompanhamento de séries e episódios. Entretanto, o CineDiary busca combinar essas experiências com recursos de descoberta inteligente, compatibilidade entre usuários e experiências colaborativas.

A ideia central é que o usuário não apenas registre o que assistiu, mas também descubra o que assistir a seguir por meio das pessoas com quem compartilha gostos.

**Proposta de valor:**

Uma plataforma social onde pessoas registram suas experiências cinematográficas, compartilham opiniões e descobrem novas histórias através de seus gostos e conexões sociais.

**Posicionamento:**

Encontre filmes e séries que você vai amar através das pessoas e histórias que fazem parte do seu universo cinematográfico.

# 2. Os pilares do produto

O CineDiary será construído em torno de cinco grandes pilares:

1. **Cinematic Diary:** registro e organização de filmes e séries assistidos.
2. **Social Cinema:** interação entre usuários, compartilhamento de experiências e construção de uma comunidade.
3. **Taste Intelligence:** inteligência de compatibilidade e recomendações baseadas nos gostos dos usuários.
4. **Conversational Discovery:** descoberta de filmes e séries utilizando linguagem natural e inteligência artificial.
5. **Cinematic Analytics:** estatísticas e visualizações sobre os hábitos e preferências cinematográficas de cada usuário.

Esses pilares representam diferentes partes da experiência, mas devem funcionar de maneira integrada.

---

# 3. Funcionalidades

## 3.1. Cinematic Diary

O Cinematic Diary será o núcleo do produto. É onde os usuários poderão organizar seu histórico cinematográfico, registrar o que assistiram e construir seu próprio perfil de preferências.

A experiência deve ser simples e intuitiva, permitindo que o usuário registre uma produção sem precisar passar por um processo complicado.

### Registro de filmes e séries

O usuário poderá pesquisar um filme ou uma série e realizar diferentes ações:

- Marcar como assistido.
- Avaliar com uma nota de até cinco estrelas.
- Curtir ou favoritar uma produção.
- Adicionar à watchlist.
- Escrever uma review.
- Registrar uma experiência de visualização no diário.

Essas ações devem ser independentes entre si. Por exemplo, o usuário pode adicionar um filme à watchlist sem avaliá-lo, curtir uma produção sem escrever uma review ou registrar que assistiu sem necessariamente dar uma nota.

### Diary Entries

O diário será responsável por registrar as experiências de visualização do usuário.

Cada registro poderá conter informações como:

- Filme ou série assistida.
- Data em que assistiu.
- Nota atribuída.
- Review ou comentário.
- Indicação de que gostou ou não da produção.
- Informações adicionais da experiência, quando aplicável.

Uma característica importante é permitir que o usuário registre a mesma produção mais de uma vez.

Por exemplo, alguém pode assistir a um filme em janeiro e novamente em dezembro. Essas são duas experiências diferentes e devem poder aparecer separadamente no diário.

O histórico permitirá visualizar a jornada cinematográfica do usuário ao longo do tempo.

### Reviews

As reviews serão avaliações textuais publicadas pelos usuários sobre filmes e séries.

O usuário poderá escrever uma opinião, compartilhar impressões e explicar o que achou de determinada produção.

As reviews poderão aparecer:

- No perfil do usuário.
- Na página do filme ou série.
- No feed social.
- Nas atividades dos amigos.

Outros usuários poderão curtir e comentar essas publicações.

A avaliação por estrelas e a review textual são complementares, não obrigatórias uma para a outra.

### Watchlist

A watchlist será uma lista de produções que o usuário deseja assistir futuramente.

O usuário poderá adicionar filmes e séries à sua lista e removê-los quando quiser.

A watchlist também poderá servir como fonte para recomendações e para experiências futuras, como o Movie Blend.

### Listas personalizadas

Além da watchlist, os usuários poderão criar listas próprias para organizar suas produções favoritas ou agrupar filmes e séries por algum critério.

Exemplos:

- Meus filmes favoritos.
- Melhores filmes de terror.
- Filmes para assistir no Halloween.
- Séries que preciso terminar.
- Filmes que quero assistir com meus amigos.

As listas poderão ser públicas ou privadas, conforme as configurações de privacidade definidas pelo usuário.

### Acompanhamento de séries

Séries exigem uma experiência diferente de filmes, porque envolvem temporadas, episódios e progresso de visualização.

O CineDiary deverá permitir que o usuário:

- Acompanhe uma série.
- Visualize suas temporadas e episódios.
- Marque episódios como assistidos.
- Acompanhe seu progresso.
- Marque uma série como concluída ou abandonada.
- Avalie a série.
- Registre experiências relacionadas à série.

Também existe a possibilidade de permitir avaliações por temporada, oferecendo uma visão mais detalhada da experiência do usuário.

Uma evolução interessante seria criar espaços de discussão por episódio, com proteção contra spoilers. Assim, usuários poderiam conversar sobre um episódio sem estragar a experiência de quem ainda não assistiu.

### Importação de dados de outras plataformas

Uma das preocupações do CineDiary é reduzir a barreira de entrada para pessoas que já utilizam outras plataformas cinematográficas.

Um usuário que utiliza o Letterboxd há anos, por exemplo, pode possuir centenas ou milhares de filmes registrados, avaliações, reviews e listas personalizadas.

Pedir que essa pessoa comece tudo novamente seria uma experiência ruim e poderia desestimular a migração.

Por isso, queremos desenvolver futuramente uma funcionalidade de **importação de histórico cinematográfico**, permitindo que os usuários tragam seus dados de outros serviços para dentro do CineDiary.

O primeiro provedor considerado é o Letterboxd.

A ideia é permitir que o usuário exporte seus dados na plataforma de origem, normalmente por meio de um arquivo ZIP, e importe esse arquivo diretamente no CineDiary.

O fluxo imaginado é:

1. O usuário acessa a área de importação do CineDiary.
2. Seleciona o provedor de origem, inicialmente Letterboxd.
3. O aplicativo apresenta instruções para exportar os dados na plataforma de origem.
4. O usuário realiza a exportação e obtém o arquivo ZIP.
5. O usuário retorna ao CineDiary e seleciona o arquivo.
6. O aplicativo realiza o envio do arquivo para o backend.
7. O backend processa o conteúdo, identifica os registros e relaciona as produções com o catálogo do CineDiary.
8. O usuário visualiza um resumo da importação.
9. Após a confirmação, os dados são incorporados ao seu perfil e diário.

A intenção é oferecer uma experiência integrada, sem obrigar o usuário a sair do aplicativo para realizar o processamento manualmente.

Uma possibilidade técnica é utilizar uma experiência de navegador interno ou uma interface web com Expo Web para orientar o usuário durante o processo de exportação. Entretanto, a disponibilidade e o comportamento do download dependerão das políticas do provedor, do sistema operacional e das capacidades do navegador.

O CineDiary não deverá depender de scraping ou de acesso não autorizado à conta de terceiros. A proposta é trabalhar com arquivos que o próprio usuário tenha exportado legitimamente.

**Responsabilidades do backend na importação:**

- Receber o arquivo enviado.
- Validar formato, tamanho e estrutura.
- Extrair o conteúdo do ZIP de forma segura.
- Identificar os tipos de registros disponíveis.
- Interpretar filmes, datas, avaliações, reviews e listas.
- Relacionar as produções aos identificadores internos e externos do catálogo.
- Identificar possíveis duplicidades.
- Apresentar inconsistências para revisão, quando necessário.
- Persistir os dados após a confirmação do usuário.

A importação deverá ser idempotente sempre que possível, evitando que uma segunda tentativa duplique todo o histórico.

Também será importante preservar informações relevantes, como datas originais de visualização e avaliações, respeitando as diferenças entre o modelo de dados do provedor de origem e o modelo do CineDiary.

O objetivo é permitir que o usuário comece sua jornada no CineDiary sem perder a história que construiu em outras plataformas.

No futuro, essa funcionalidade poderá ser expandida para outros provedores que ofereçam exportação de dados compatível.

---

## 3.2. Social Cinema

O Social Cinema transforma o CineDiary em uma rede social de verdade.

A proposta é permitir que os usuários acompanhem as atividades de outras pessoas, compartilhem experiências e descubram produções através de suas conexões.

### Seguir usuários

Os usuários poderão seguir outros perfis para acompanhar suas atividades.

O relacionamento poderá ser unilateral, como acontece em redes sociais tradicionais.

Ao seguir alguém, o usuário poderá visualizar suas atividades públicas no feed, incluindo novos registros, avaliações, reviews e listas compartilhadas.

### Feed social

O feed será uma linha do tempo com atividades dos usuários seguidos.

Exemplos de atividades:

- Eduardo assistiu a um filme.
- Maria avaliou uma série com cinco estrelas.
- João publicou uma review.
- Ana adicionou uma produção à sua lista pública.
- Pedro terminou uma temporada.

O objetivo é fazer com que o usuário descubra novas produções naturalmente enquanto acompanha as atividades das pessoas que segue.

As publicações poderão receber curtidas e comentários.

O feed também deverá considerar privacidade e relevância, evitando exibir atividades que o usuário decidiu manter privadas.

### Marcação de amigos em filmes e séries

Uma funcionalidade interessante será permitir que o usuário marque outras pessoas em uma produção que assistiram juntas.

Por exemplo, Eduardo registra que assistiu a um filme e marca um amigo que estava com ele.

Essa experiência é inspirada no comportamento de marcação de pessoas em redes sociais, mas adaptada ao contexto cinematográfico.

A marcação não significa que o usuário marcado automaticamente assistiu à produção. Ela representa uma associação social entre pessoas e uma experiência cinematográfica.

O fluxo proposto será:

1. O usuário registra uma experiência no diário.
2. Seleciona a opção de marcar pessoas.
3. Escolhe os usuários que participaram daquela experiência.
4. Os usuários marcados recebem uma notificação.
5. Cada pessoa poderá aprovar ou rejeitar a marcação.
6. Após a aprovação, a experiência poderá aparecer também no perfil da pessoa marcada, respeitando suas configurações de privacidade.

É importante que a marcação seja independente do registro original. Se alguém rejeitar ou ocultar uma marcação, isso não deverá apagar o registro de quem realmente assistiu à produção.

Também pensamos em regras de privacidade para controlar quem pode marcar quem. Uma hipótese é permitir marcações mais simples entre pessoas que se seguem mutuamente e exigir aprovação em situações com menor proximidade social.

Essas regras ainda precisarão ser validadas durante o desenho da experiência.

### Compartilhamento de experiências

O CineDiary também poderá permitir que os usuários compartilhem suas atividades fora do aplicativo.

Por exemplo, compartilhar uma review, uma avaliação ou um resumo do próprio perfil em outras redes sociais.

Essa funcionalidade poderá ajudar na aquisição de novos usuários, transformando as atividades do CineDiary em conteúdo compartilhável.

### Notificações push

As notificações push serão utilizadas para manter os usuários informados sobre acontecimentos relevantes dentro do CineDiary, mesmo quando o aplicativo estiver fechado.

Elas serão especialmente importantes para as interações sociais e para as experiências colaborativas.

Alguns exemplos:

- Um usuário começou a seguir você.
- Alguém curtiu sua review.
- Alguém comentou uma publicação sua.
- Você foi marcado em um filme ou série.
- Alguém enviou uma solicitação de marcação.
- Sua marcação foi aprovada ou rejeitada.
- Você recebeu um convite para participar de um Taste Match.
- Um amigo convidou você para um Movie Blend.
- Um novo participante entrou em um Blend.
- Novas recomendações foram disponibilizadas em um Blend.

No caso do Taste Match e do Movie Blend, as notificações poderão ser utilizadas para avisar os participantes sobre atualizações importantes, como novos convites, participação de amigos e novas recomendações.

### Notificações inteligentes e recomendações contextuais

Além das notificações tradicionais, queremos explorar um tipo de notificação mais inteligente e contextual, que utilize os dados do CineDiary para criar oportunidades de interação entre os usuários.

A ideia é que o aplicativo consiga identificar momentos interessantes para sugerir uma produção.

Por exemplo, imagine que seja sexta-feira à noite e um novo filme de suspense tenha acabado de ser lançado.

O sistema identifica que:

- O usuário gosta de filmes de suspense.
- Um amigo possui preferências semelhantes.
- A produção ainda não foi assistida pelos dois.
- A compatibilidade entre os gostos dos dois usuários é de aproximadamente 95%.

O CineDiary poderia enviar uma notificação como:

"Lançou um filme de suspense hoje que tem 95% de match entre você e o João. Partiu?"

A notificação funciona como um convite para uma experiência compartilhada, aproximando a descoberta de conteúdo das relações sociais.

Outras possibilidades:

- Um novo filme combina com os gostos de um Taste Match ativo.
- Uma produção recém-lançada possui alta compatibilidade com um grupo de Movie Blend.
- Uma série que vários amigos acompanham lançou uma nova temporada.
- Uma produção muito bem avaliada por pessoas com gostos semelhantes acabou de chegar ao catálogo.
- Um filme que está na watchlist do usuário entrou em um serviço de streaming disponível em sua região, caso essa informação esteja disponível.

Essas notificações poderão considerar horário, contexto, preferências e comportamento dos usuários.

A proposta é evitar mensagens genéricas e oferecer sugestões que realmente façam sentido para aquela pessoa.

O sistema deverá respeitar as preferências de notificação e os horários definidos pelo usuário. Também deverá existir controle de frequência para evitar excesso de notificações.

A intenção não é transformar o CineDiary em um aplicativo que fica disputando a atenção do usuário, mas criar notificações que tenham valor real.

---

## 3.3. Taste Intelligence

O Taste Intelligence será um dos principais diferenciais do CineDiary.

A proposta é utilizar os dados de consumo cinematográfico dos usuários para identificar afinidades, encontrar pessoas com gostos semelhantes e recomendar produções de maneira mais inteligente.

Em vez de recomendar apenas com base em gênero ou popularidade, o sistema deverá considerar o comportamento real dos usuários.

### Onboarding cinematográfico para convidados

Uma situação importante que queremos resolver acontece quando um usuário recebe um convite para participar de um Taste Match ou Movie Blend, mas ainda não possui uma conta no CineDiary.

Não faria sentido calcular a compatibilidade de duas pessoas quando uma delas ainda não possui informações suficientes sobre seus gostos cinematográficos.

Ao mesmo tempo, não queremos obrigar o novo usuário a realizar um cadastro longo e preencher todo o seu histórico antes de participar da experiência que o trouxe até o aplicativo.

Por isso, queremos criar um **onboarding cinematográfico contextual**, apresentado depois do cadastro e antes da entrada efetiva no Match ou Blend.

O objetivo é coletar um pequeno conjunto de informações para permitir que o sistema tenha uma base inicial de preferências.

O fluxo imaginado será:

1. Uma pessoa recebe um link de convite para um Taste Match ou Movie Blend.
2. Acessa o link e é direcionada ao CineDiary.
3. Caso ainda não possua uma conta, realiza o cadastro ou login.
4. Após criar a conta, o aplicativo apresenta algumas telas rápidas de personalização cinematográfica.
5. O usuário seleciona alguns gêneros de que gosta.
6. O aplicativo apresenta uma seleção de filmes conhecidos para que ele indique quais já assistiu.
7. O usuário seleciona as produções que reconhece.
8. O aplicativo oferece uma opção para adicionar esses filmes ao histórico de assistidos do CineDiary.
9. Essa opção será apresentada por meio de um checkbox inicialmente desmarcado.
10. Caso o usuário marque o checkbox, os filmes selecionados também serão adicionados ao seu histórico.
11. Caso não marque, as seleções serão utilizadas apenas para construir seu perfil inicial de preferências.
12. Ao finalizar, o usuário entra automaticamente no convite recebido.
13. O sistema já possui informações suficientes para iniciar uma primeira análise de compatibilidade.

A experiência deverá ser rápida, visual e agradável, evitando transformar o onboarding em um questionário extenso.

### Informações coletadas inicialmente

O onboarding poderá coletar:

- Gêneros favoritos.
- Filmes que o usuário já assistiu.
- Algumas produções favoritas, caso essa informação seja solicitada.
- Preferências cinematográficas básicas.

A seleção de filmes deverá utilizar produções conhecidas e variadas, permitindo que o usuário identifique rapidamente algumas opções.

Não é necessário que ele informe todo o seu histórico. A intenção é criar um pequeno conjunto inicial de informações.

### Separação entre perfil de preferências e histórico de visualização

Uma decisão importante é não confundir as informações coletadas durante o onboarding com registros reais do diário.

O usuário poderá informar que já assistiu a determinado filme para ajudar o sistema a entender seu gosto, mas isso não significa necessariamente que deseja criar um registro formal no CineDiary.

Por isso, o checkbox de importação para o histórico deverá começar desmarcado.

Se o usuário não selecionar essa opção, as informações serão utilizadas como sinais iniciais de preferência, sem criar automaticamente Diary Entries.

Se selecionar, o CineDiary poderá registrar as produções selecionadas como assistidas, seguindo as regras definidas para esse tipo de registro.

Essa separação evita que o diário seja preenchido com atividades que o usuário não decidiu registrar.

### Benefícios para a experiência

Esse onboarding permite que novos usuários participem de experiências sociais sem precisar construir todo o seu perfil antecipadamente.

Também cria uma oportunidade de apresentar funcionalidades importantes do CineDiary antes mesmo de o usuário começar a explorar o aplicativo sozinho.

A experiência poderá ser reutilizada em outros pontos de entrada, como convites compartilhados e campanhas de aquisição.

### Taste Match

O Taste Match será uma experiência de compatibilidade cinematográfica entre duas pessoas.

A inspiração inicial vem do Spotify Blend, que combina os gostos musicais de diferentes usuários para criar uma experiência compartilhada.

No CineDiary, a ideia é fazer algo semelhante com filmes e séries.

Dois usuários poderão criar um Match e visualizar o quanto seus gostos cinematográficos são compatíveis.

A experiência poderá apresentar:

- Percentual de compatibilidade.
- Filmes e séries que ambos assistiram.
- Produções que receberam avaliações semelhantes.
- Gêneros favoritos em comum.
- Produções que um usuário gostou e o outro ainda não assistiu.
- Diferenças interessantes entre os gostos.
- Recomendações baseadas na combinação dos dois perfis.

O percentual de compatibilidade deverá ser calculado a partir de critérios explicáveis, como similaridade de avaliações, gêneros preferidos e produções em comum.

Não queremos apresentar o resultado como uma verdade científica. Ele deve ser uma métrica divertida e útil para estimular a descoberta.

O Taste Match poderá ser atualizado conforme os usuários registrarem novas experiências.

### Fluxo de criação do Taste Match

O Taste Match terá uma experiência própria de criação, diferente do Movie Blend.

Como se trata de uma experiência entre duas pessoas, queremos que o Match seja iniciado automaticamente quando o convidado aceitar o convite.

O fluxo imaginado será:

1. O usuário A acessa a área de Taste Match.
2. Seleciona a opção de criar um novo Match.
3. O sistema cria uma experiência de Match vinculada ao usuário A.
4. O usuário A recebe um link de convite para compartilhar com o usuário B.
5. Enquanto o convite não for aceito, o Match aparece na lista do usuário A como pendente.
6. A experiência fica bloqueada, apresentando um estado de espera, como "Aguardando seu amigo aceitar o convite".
7. O usuário B recebe o link e acessa o convite.
8. Caso ainda não tenha conta, realiza o cadastro e o onboarding cinematográfico.
9. Após concluir o onboarding, o usuário B aceita o convite.
10. O Match é iniciado automaticamente.
11. O sistema executa as análises de compatibilidade e apresenta o resultado para os dois participantes.

Não será necessário que o usuário B procure manualmente pelo Match ou execute uma segunda ação para iniciá-lo depois da aceitação.

### Apresentação do resultado: Match Story

A apresentação do resultado será uma parte muito importante da experiência.

Queremos que o Taste Match tenha uma apresentação visual semelhante ao Spotify Blend, com uma sequência de telas no estilo Stories.

Em vez de simplesmente exibir uma porcentagem em um card, o CineDiary deverá transformar o resultado em uma experiência visual e compartilhável.

A sequência poderá apresentar:

- Percentual de compatibilidade entre os usuários.
- Gêneros que compartilham.
- Filmes que ambos adoram.
- Produções em que tiveram opiniões diferentes.
- Recomendações para assistirem juntos.
- Curiosidades sobre as preferências de cada participante.

A apresentação poderá utilizar animações, elementos visuais, posters e informações personalizadas.

O objetivo é criar um momento de descoberta divertido, que incentive os usuários a compartilhar o resultado e explorar as recomendações.

### Implementação técnica: Neo4j + Graph Data Science (GDS)

O Taste Match será construído utilizando o Neo4j como estrutura de relacionamento e o Graph Data Science (GDS) como ferramenta para executar algoritmos de análise de grafos.

A ideia é representar os usuários, filmes, séries, gêneros e suas interações por meio de nós e relacionamentos.

A partir dessa estrutura, o GDS poderá ajudar a identificar similaridades entre usuários, utilizando algoritmos de análise de grafos e medidas de similaridade.

Algumas possibilidades de exploração incluem:

- Similaridade entre usuários com base em produções assistidas.
- Similaridade entre usuários considerando avaliações.
- Identificação de comunidades com gostos semelhantes.
- Análise de relações entre gêneros e produções.
- Descoberta de conexões cinematográficas entre perfis.

Os resultados dos algoritmos serão utilizados pelo backend para construir a experiência apresentada no aplicativo.

O cálculo final do percentual de compatibilidade poderá combinar diferentes sinais, pesos e regras de negócio. O GDS será uma ferramenta para análise e descoberta, não necessariamente o responsável sozinho por definir toda a pontuação.

### Movie Blend

O Movie Blend será uma evolução do conceito de Taste Match.

Enquanto o Taste Match compara duas pessoas, o Movie Blend terá como objetivo ajudar duas ou mais pessoas a escolherem algo para assistir juntas.

O problema que queremos resolver é bastante comum: um grupo de amigos quer assistir a um filme, mas cada pessoa tem gostos diferentes e ninguém consegue decidir.

O usuário poderá criar um Blend, convidar amigos e combinar os perfis cinematográficos dos participantes.

O sistema analisará as preferências de todos e apresentará recomendações que tenham potencial de agradar ao grupo.

A experiência poderá considerar:

- Avaliações anteriores dos participantes.
- Gêneros favoritos.
- Produções já assistidas.
- Produções que os participantes não gostaram.
- Preferências individuais.
- Popularidade e relevância das produções.

Um ponto importante é evitar que o sistema recomende apenas filmes que agradem muito a uma pessoa e sejam indiferentes para as demais.

A lógica deverá buscar um equilíbrio entre as preferências do grupo.

Por exemplo, se três amigos gostam muito de ficção científica e um prefere comédia, o sistema poderá buscar produções que combinem elementos dos dois gêneros ou apresentar alternativas que atendam a diferentes participantes.

O Blend poderá apresentar recomendações acompanhadas de explicações, mostrando por que determinada produção foi selecionada e quais participantes têm maior afinidade com ela.

### Fluxo de criação do Movie Blend

Diferentemente do Taste Match, o Movie Blend será uma experiência em grupo e, por isso, terá um processo de criação mais controlado.

O usuário responsável pela criação será o organizador do Blend.

O fluxo imaginado será:

1. O usuário A cria um novo Movie Blend.
2. Define o nome ou a identificação do grupo, caso essa opção exista.
3. Convida os amigos por meio de links ou convites dentro do aplicativo.
4. Os convidados recebem as notificações e entram no grupo.
5. Caso algum convidado ainda não possua conta, realiza o cadastro e o onboarding cinematográfico.
6. Após concluir o onboarding, o convidado entra no grupo.
7. Enquanto o Blend não for iniciado, o organizador poderá acompanhar os participantes e enviar novos convites.
8. O grupo permanece em estado de preparação.
9. Quando considerar que existem participantes suficientes, o organizador seleciona o botão **Iniciar Blend**.
10. O sistema registra o grupo de participantes daquele Blend.
11. O processo de análise de compatibilidade coletiva é executado.
12. As recomendações são apresentadas para os participantes.

**O botão Iniciar Blend será o marco de fechamento do grupo.**

Após o organizador iniciar o Blend, não será mais possível adicionar novos participantes àquela experiência.

Essa regra é importante porque as recomendações serão calculadas considerando um conjunto definido de usuários. Permitir entradas depois do início poderia alterar a composição do grupo e invalidar os resultados apresentados.

Caso o grupo queira incluir outra pessoa, poderá ser necessário criar uma nova experiência ou iniciar outro Blend.

O comportamento final para encerramento, arquivamento e criação de novos Blends ainda será detalhado durante o desenho dos fluxos.

### Apresentação do resultado: Movie Blend Story

Assim como o Taste Match, o Movie Blend também terá seu resultado apresentado por meio de uma experiência no formato Stories.

A proposta é transformar as recomendações coletivas em uma apresentação visual e interativa, em vez de simplesmente mostrar uma lista de filmes.

A sequência poderá apresentar:

- Nome ou identificação do grupo.
- Participantes do Blend.
- Compatibilidade coletiva.
- Gêneros predominantes do grupo.
- Preferências compartilhadas.
- Diferenças entre os participantes.
- Filmes que representam bem o gosto coletivo.
- Recomendações selecionadas para o grupo.
- Explicações sobre por que cada produção foi recomendada.

Uma possibilidade interessante é apresentar como cada filme se relaciona com os participantes.

Por exemplo:

"Esse filme combina com 4 dos 5 participantes."

"João ainda não assistiu, mas os outros quatro avaliaram produções semelhantes com notas altas."

"Essa é uma das recomendações com maior equilíbrio entre todos os participantes."

A experiência deverá utilizar elementos visuais, posters, animações e uma narrativa própria.

O resultado poderá ser compartilhado pelos participantes, incentivando a divulgação do CineDiary e a criação de novos grupos.

A principal diferença entre as duas experiências estará no conteúdo da narrativa:

- **Taste Match Story:** explora a compatibilidade cinematográfica entre duas pessoas.
- **Movie Blend Story:** apresenta a identidade cinematográfica coletiva de um grupo e suas recomendações.

### Implementação técnica: Neo4j + Graph Data Science (GDS)

Assim como o Taste Match, o Movie Blend utilizará o Neo4j e o GDS para analisar as relações entre os participantes e o catálogo cinematográfico.

O objetivo será construir uma representação do grupo e identificar produções que apresentem boa compatibilidade coletiva.

Os algoritmos poderão ajudar a encontrar padrões de preferência, similaridade entre participantes e relações entre filmes, séries e gêneros.

A camada de negócio do backend será responsável por transformar os resultados dessas análises em recomendações adequadas à experiência do Movie Blend.

A arquitetura deverá permitir que os resultados sejam atualizados quando novos participantes entrarem no grupo ou quando os usuários registrarem novas avaliações e experiências relevantes.

### Recomendações personalizadas

Além das experiências de Match e Blend, o CineDiary poderá recomendar produções individualmente.

Essas recomendações poderão considerar:

- Histórico de visualização.
- Avaliações.
- Gêneros favoritos.
- Diretores e atores preferidos.
- Atividades de pessoas seguidas.
- Produções populares entre usuários com gostos semelhantes.
- Watchlist e histórico de consumo.

A intenção é construir recomendações que tenham uma relação real com o perfil do usuário, em vez de simplesmente exibir os filmes mais populares do momento.

---

## 3.4. Conversational Discovery

O Conversational Discovery será a experiência de busca inteligente do CineDiary.

A proposta é permitir que o usuário encontre filmes e séries utilizando linguagem natural, sem precisar conhecer exatamente o gênero, o diretor ou o nome da produção.

Em vez de preencher diversos filtros, o usuário poderá simplesmente descrever o que está procurando.

Exemplos:

- Quero assistir a um filme que me faça rir, mas que também tenha super-heróis.
- Quero algo parecido com Interestelar, mas menos complexo.
- Estou procurando uma série curta para assistir durante a semana.
- Quero um filme de suspense que tenha uma reviravolta surpreendente.
- Quero assistir a algo que meus amigos provavelmente vão gostar.

A inteligência artificial interpretará a intenção do usuário e transformará o pedido em critérios de busca.

O fluxo será aproximadamente assim:

1. O usuário envia uma mensagem.
2. O backend encaminha a solicitação para o modelo de IA.
3. O modelo identifica gênero, clima, temática, restrições e outras características relevantes.
4. O sistema consulta o catálogo de filmes e séries.
5. O sistema considera informações do perfil do usuário, quando disponíveis.
6. Os resultados são ordenados de acordo com a relevância.
7. O aplicativo apresenta as recomendações acompanhadas de explicações.

A experiência poderá ser conversacional.

Por exemplo, depois de receber algumas recomendações, o usuário poderá responder:

"Quero algo menos violento."

A IA deverá interpretar essa nova informação e refinar os resultados anteriores.

Uma evolução interessante será integrar essa experiência ao Taste Intelligence, permitindo buscas como:

"Encontre um filme que eu e meus amigos gostaríamos de assistir."

Nesse caso, o sistema poderá utilizar também os dados de compatibilidade dos participantes.

A inteligência artificial será integrada ao backend Java, que continuará responsável pelas regras de negócio, acesso aos dados e consultas ao catálogo.

O Sanity foi considerado como uma possível ferramenta para gerenciamento de conteúdo editorial e curadoria, mas não será tratado como o motor de inteligência artificial. A busca conversacional deverá utilizar diretamente um modelo de linguagem integrado ao backend.

---

## 3.5. Cinematic Analytics

O Cinematic Analytics será responsável por transformar o histórico do usuário em estatísticas e informações visuais.

A ideia é criar uma experiência semelhante a um resumo pessoal do consumo cinematográfico.

O usuário poderá visualizar informações como:

- Quantidade de filmes assistidos.
- Quantidade de séries acompanhadas.
- Tempo total assistindo.
- Filmes assistidos por mês e por ano.
- Gêneros mais consumidos.
- Atores e diretores favoritos.
- Países de origem das produções assistidas.
- Média das avaliações atribuídas.
- Evolução das notas ao longo do tempo.
- Períodos de maior atividade.

Também podemos explorar visualizações mais interessantes, como um calendário de atividades, mapas de gêneros e resumos anuais.

### My Cinematic DNA

A experiência poderá ser chamada de **My Cinematic DNA**, representando o perfil cinematográfico de cada usuário.

A proposta é que o perfil não seja apenas um espaço com estatísticas, mas uma representação visual da identidade cinematográfica daquela pessoa.

O usuário poderá visualizar informações como:

- Gêneros predominantes.
- Diretores e atores favoritos.
- Produções favoritas.
- Tendências de avaliação.
- Hábitos de consumo.
- Estatísticas do histórico.
- Características que representam seu gosto cinematográfico.

O My Cinematic DNA deverá ser uma experiência visual interessante, que incentive o usuário a explorar seus próprios dados e compartilhar seu perfil.

### Compartilhamento do Cinematic DNA

Uma funcionalidade importante será permitir que o usuário compartilhe seu Cinematic DNA fora do CineDiary.

A ideia é gerar uma apresentação visual com as principais características do perfil cinematográfico, preparada para ser compartilhada em redes sociais.

O conteúdo poderá ser exportado como imagem ou outro formato adequado, incluindo elementos da identidade visual do CineDiary.

Exemplos de informações compartilháveis:

- Meu gênero favorito.
- Meu diretor mais assistido.
- Minha nota média.
- Minha produção favorita.
- Quantidade de filmes assistidos.
- Meu perfil cinematográfico.

O objetivo é transformar os dados do usuário em conteúdo social, incentivando outras pessoas a conhecerem o aplicativo.

### Cinematic Wrapped

Além do Cinematic DNA permanente, queremos desenvolver uma experiência anual chamada **Cinematic Wrapped**.

A inspiração vem de experiências como Spotify Wrapped e retrospectivas anuais de outras plataformas.

Ao final de cada ano, o CineDiary poderá gerar uma retrospectiva personalizada com os principais acontecimentos cinematográficos do usuário.

A experiência poderá apresentar:

- Quantidade de filmes assistidos durante o ano.
- Quantidade de séries acompanhadas.
- Tempo total de visualização.
- Filme mais bem avaliado.
- Filme mais assistido, quando houver registros de revisualização.
- Gênero predominante.
- Diretor e ator mais presentes no histórico.
- Melhor mês cinematográfico.
- Evolução das avaliações.
- Descobertas e curiosidades sobre o comportamento do usuário.

A apresentação deverá funcionar como uma sequência de telas narrativas, com animações, estatísticas e elementos visuais que tornem a retrospectiva interessante.

O usuário poderá navegar pela experiência e compartilhar cards específicos ou a retrospectiva completa em outras redes sociais.

O Cinematic Wrapped deverá ser gerado considerando o período anual, normalmente entre janeiro e dezembro, com uma experiência especial disponibilizada no encerramento do ano.

Essa funcionalidade poderá se tornar um dos principais momentos de engajamento e divulgação do CineDiary, pois os usuários terão um motivo para compartilhar sua retrospectiva e convidar outras pessoas para conhecer a plataforma.

### Freemium aplicado às estatísticas

Uma possibilidade de monetização é disponibilizar estatísticas básicas gratuitamente e reservar análises mais avançadas para usuários Premium.

O objetivo não é bloquear informações essenciais, mas oferecer experiências adicionais para quem deseja explorar seus dados com mais profundidade.

A disponibilidade do Cinematic DNA e do Wrapped deverá ser pensada para que todos os usuários tenham uma experiência interessante, mesmo sem assinatura.

---

# 4. Monetização: modelo Freemium

O CineDiary deverá utilizar um modelo Freemium, permitindo que qualquer pessoa utilize as principais funcionalidades gratuitamente e oferecendo recursos adicionais por meio de uma assinatura Premium.

A ideia é que a versão gratuita seja suficientemente completa para criar uma comunidade ativa.

Não queremos colocar funcionalidades essenciais, como registrar filmes, avaliar produções ou escrever reviews, atrás de um paywall.

## Plano Free

O usuário gratuito poderá utilizar:

- Diário cinematográfico.
- Registro de filmes e séries.
- Avaliações por estrelas.
- Reviews.
- Watchlist.
- Listas personalizadas.
- Feed social.
- Seguir outros usuários.
- Curtir e comentar publicações.
- Estatísticas básicas.
- Participar de Taste Matches e Movie Blends criados por outras pessoas.

Uma proposta inicial de limites:

- Até três Taste Matches ativos criados pelo próprio usuário.
- Um Movie Blend ativo criado pelo próprio usuário.
- Até cinco participantes por Movie Blend.

Os limites deverão ser aplicados às experiências ativas, não ao total de experiências já criadas. Assim, o usuário poderá arquivar um Match ou Blend antigo e criar outro.

Participar de uma experiência criada por outra pessoa não deverá consumir a cota do usuário.

### Publicidade no plano Free

O plano gratuito também contará com publicidade.

A proposta é utilizar anúncios convencionais integrados à experiência de navegação, aparecendo em determinadas telas e espaços do aplicativo.

Não queremos utilizar anúncios que obriguem o usuário a assistir a um vídeo ou esperar determinado período para continuar utilizando uma funcionalidade.

A publicidade deverá funcionar como uma forma de monetização passiva, sem interromper o fluxo de utilização do aplicativo.

Alguns espaços que poderão receber anúncios:

- Feed social.
- Telas de descoberta.
- Páginas de catálogo.
- Outras áreas de navegação que comportem publicidade sem prejudicar a experiência.

A implementação deverá considerar a frequência, o posicionamento e a relevância dos anúncios, evitando poluir visualmente a interface ou comprometer a experiência do usuário.

## Plano Premium

O Premium poderá oferecer:

- Taste Matches ilimitados.
- Movie Blends ilimitados.
- Grupos maiores nos Blends.
- Estatísticas avançadas.
- Recomendações mais personalizadas.
- Recursos adicionais de descoberta.
- Experiências avançadas de análise do perfil cinematográfico.
- Experiência completamente livre de anúncios.

A ausência de publicidade será um dos benefícios diretos da assinatura Premium.

Assim, o usuário terá duas opções: utilizar o CineDiary gratuitamente com anúncios integrados à navegação ou assinar o Premium para ter acesso aos benefícios adicionais e utilizar o aplicativo sem publicidade.

Os valores e os benefícios definitivos ainda não foram definidos.

### Gerenciamento de assinaturas: RevenueCat

Uma possibilidade considerada para gerenciar as assinaturas Premium é utilizar o **RevenueCat**.

A proposta é centralizar a lógica de assinaturas e facilitar a integração com diferentes lojas e plataformas de pagamento.

O RevenueCat poderá ajudar a gerenciar:

- Assinaturas realizadas pela App Store.
- Assinaturas realizadas pelo Google Play.
- Status das assinaturas.
- Renovações.
- Cancelamentos.
- Períodos de teste, caso sejam oferecidos.
- Direitos de acesso aos recursos Premium.

A intenção é evitar implementar separadamente toda a lógica de assinaturas de cada loja.

O backend continuará responsável por aplicar as regras de acesso do CineDiary, utilizando as informações de entitlement e assinatura disponibilizadas pela integração.

O RevenueCat será uma opção de infraestrutura para a monetização, mas ainda será necessário definir os produtos, preços, períodos de cobrança e regras comerciais.

## Estratégia de aquisição

O Movie Blend também poderá funcionar como um mecanismo de crescimento.

Quando uma pessoa criar um Blend, precisará convidar amigos para participar.

Esses convites poderão trazer novos usuários para a plataforma, criando um ciclo de aquisição orgânica.

O Taste Match, o compartilhamento do Cinematic DNA e o Cinematic Wrapped também poderão contribuir para esse crescimento, transformando experiências pessoais em conteúdo compartilhável.

---

# 5. Tecnologias e arquitetura

A arquitetura inicial do CineDiary será baseada em um backend Java com Spring Boot e um aplicativo mobile desenvolvido com React Native e Expo.

A proposta é começar com uma arquitetura simples, organizada e preparada para evoluir conforme o crescimento do produto.

## Mobile: React Native + Expo

O aplicativo será desenvolvido utilizando:

- React Native.
- Expo.
- TypeScript.
- Expo Router.

A escolha permite desenvolver para iOS e Android utilizando uma única base de código.

O Expo Router será responsável pela navegação entre telas e organização das rotas do aplicativo.

A interface deverá seguir uma identidade visual própria, com uma experiência moderna, arredondada, amigável e tecnológica.

A inspiração visual inicial vem de aplicativos como o Samokat, principalmente pela utilização de componentes arredondados, elementos visuais expressivos e uma interface moderna.

Também queremos explorar uma navegação inferior com aparência nativa no iOS, incluindo a estética Liquid Glass quando suportada pela plataforma e pela implementação escolhida.

A experiência deverá continuar consistente no Android, respeitando os padrões de cada sistema operacional.

O Expo também poderá ser utilizado futuramente para implementar experiências web auxiliares, como a interface de orientação e importação de dados de outros provedores.

## Plataforma Web

Além dos aplicativos mobile, existe a intenção de disponibilizar uma versão Web do CineDiary.

A referência é a experiência oferecida pelo Letterboxd, que permite utilizar a plataforma diretamente pelo navegador.

A versão Web poderá permitir que os usuários:

- Acessem seus perfis.
- Consultem filmes e séries.
- Visualizem o diário.
- Leiam e escrevam reviews.
- Acompanhem o feed.
- Gerenciem listas.
- Consultem Taste Matches e Movie Blends.
- Visualizem o Cinematic DNA e o Wrapped.

A ideia é oferecer uma experiência consistente entre dispositivos, permitindo que o usuário escolha onde deseja utilizar o CineDiary.

Entretanto, a versão Web não será uma prioridade inicial.

O foco do desenvolvimento será o aplicativo mobile, e a experiência Web será explorada em uma etapa futura, depois que os principais fluxos e funcionalidades estiverem consolidados.

A arquitetura deverá evitar acoplamentos desnecessários ao mobile, permitindo que a mesma API Spring Boot seja consumida futuramente por uma aplicação Web.

A tecnologia da versão Web ainda não foi definida.

## Backend: Java 25 + Spring Boot + Gradle Kotlin DSL

O backend será desenvolvido utilizando **Java 25** e Spring Boot.

O gerenciamento de dependências e a automação do build serão feitos com **Gradle utilizando Kotlin DSL**.

A escolha do Kotlin DSL permitirá manter a configuração do projeto em um formato tipado e integrado ao ecossistema Gradle.

Também será utilizado um **Makefile** para centralizar comandos de desenvolvimento e facilitar a execução de tarefas recorrentes.

Exemplos de responsabilidades do Makefile:

- Subir ambientes locais.
- Inicializar dependências.
- Executar o backend.
- Executar testes.
- Executar builds.
- Parar serviços.
- Gerenciar comandos do Docker Compose.
- Facilitar tarefas de setup para novos desenvolvedores.

A ideia é que os dois integrantes consigam preparar o ambiente de desenvolvimento utilizando comandos padronizados, sem precisar memorizar uma sequência grande de comandos manuais.

O backend será responsável por:

- Regras de negócio.
- Autorização.
- Gerenciamento de usuários.
- Registro de filmes e séries.
- Diário e reviews.
- Watchlist e listas.
- Feed social.
- Marcação de usuários.
- Taste Match e Movie Blend.
- Integração com serviços externos.
- Recomendações.
- Integração com inteligência artificial.
- Gerenciamento de assinaturas.
- Processamento de eventos.
- Envio de notificações push.
- Importação de dados de outros provedores.

O backend será responsável por validar as requisições recebidas do aplicativo, aplicar as regras de negócio e controlar o acesso aos recursos.

A comunicação entre o aplicativo e o backend será feita inicialmente por meio de uma API REST.

O backend começará como um **monólito modular**, separando as responsabilidades por domínio.

Não existe necessidade de começar com microsserviços. A arquitetura deverá evoluir quando houver motivos técnicos e de negócio para isso.

### Autenticação e ciclo de vida do usuário: Clerk + Webhooks + Svix

O Clerk será responsável pela autenticação e pelo gerenciamento da identidade dos usuários.

O backend do CineDiary atuará como um **OAuth2 Resource Server**, validando os tokens JWT enviados pelo aplicativo.

Isso significa que o Spring Boot não será responsável por implementar o processo de login, cadastro ou gerenciamento de sessões. Essas responsabilidades ficarão concentradas no Clerk.

O backend receberá o token de sessão no header:

Authorization: Bearer <token>

O Spring Security validará a assinatura do JWT utilizando as chaves públicas disponibilizadas pelo Clerk, além de validar os claims necessários, como issuer e expiração.

O identificador externo do usuário, presente no claim `sub`, será utilizado para relacionar a identidade do Clerk ao usuário interno armazenado no PostgreSQL.

O CineDiary manterá seu próprio cadastro de usuários, com identificador interno e uma referência única ao identificador do Clerk.

**Sincronização por Webhooks**

Além da validação dos tokens, o backend terá uma integração com os webhooks do Clerk.

O Clerk disponibiliza eventos relacionados ao ciclo de vida e às alterações dos usuários. O CineDiary irá escutar esses eventos para manter seus próprios dados sincronizados.

Exemplos:

- Criação de usuário.
- Atualização de informações do usuário.
- Exclusão de usuário.
- Outras alterações relevantes disponibilizadas pelo Clerk.

A integração utilizará o **Svix** para validação e processamento seguro das mensagens recebidas.

O fluxo será:

1. O usuário realiza uma ação relacionada à sua conta no Clerk.
2. O Clerk gera um evento correspondente.
3. O Clerk envia o evento para o endpoint de webhook do CineDiary.
4. O backend recebe a mensagem.
5. O Svix é utilizado para verificar a autenticidade da mensagem.
6. Após a validação, o backend interpreta o evento.
7. O backend atualiza os dados correspondentes no PostgreSQL.

A implementação deverá considerar idempotência, pois webhooks podem ser reenviados. O processamento de um mesmo evento não poderá provocar alterações duplicadas ou inconsistências.

Também será importante registrar os identificadores dos eventos processados e tratar falhas de processamento.

Dessa forma, o backend não precisará consultar o Clerk a cada requisição para descobrir se os dados do usuário foram alterados. A sincronização acontecerá por eventos, enquanto a autenticação das requisições continuará sendo feita localmente por validação de JWT.

## Banco de dados principal: PostgreSQL

O PostgreSQL será o banco de dados principal e a fonte oficial dos dados do produto.

Ele armazenará informações como:

- Usuários.
- Perfis.
- Registros do diário.
- Avaliações.
- Reviews.
- Watchlists.
- Listas.
- Relacionamentos sociais.
- Marcações.
- Notificações.
- Dados de Match e Blend.
- Assinaturas.
- Eventos de integração e sincronização.
- Dados e metadados de importações.

A modelagem deverá considerar as relações entre usuários, produções e atividades.

O PostgreSQL será responsável pela persistência transacional e pela integridade dos dados.

### Sincronização PostgreSQL → Neo4j: Outbox Pattern

Como o PostgreSQL será a fonte oficial dos dados e o Neo4j será utilizado para inteligência baseada em grafos, será necessário manter os dois bancos sincronizados.

Para isso, utilizaremos o **Outbox Pattern**.

A ideia é evitar inconsistências entre os bancos quando uma operação no PostgreSQL também precisar refletir uma alteração no Neo4j.

Por exemplo, quando um usuário registrar que assistiu a um filme, essa informação deverá ser armazenada no PostgreSQL e posteriormente refletida no grafo.

O fluxo será:

1. O backend recebe uma operação do aplicativo.
2. O serviço executa a operação de negócio.
3. Na mesma transação do PostgreSQL, persiste a alteração principal e registra um evento na tabela de Outbox.
4. A transação é confirmada.
5. Um processador de Outbox identifica os eventos pendentes.
6. O processador interpreta o evento e atualiza o Neo4j.
7. Após o processamento bem-sucedido, o evento é marcado como processado.

Por exemplo:

Um usuário avalia um filme com cinco estrelas.

Na mesma transação do PostgreSQL:

- A avaliação é persistida.
- Um evento `USER_RATED_MOVIE` é registrado na Outbox.

Posteriormente, o processador consome esse evento e atualiza o relacionamento correspondente no Neo4j.

O mesmo princípio poderá ser aplicado a eventos como:

- USER_WATCHED_MOVIE.
- USER_RATED_MOVIE.
- USER_LIKED_MOVIE.
- USER_FOLLOWED_USER.
- USER_UPDATED_PREFERENCES.

**Por que utilizar o Outbox Pattern?**

Sem esse padrão, o backend poderia executar duas operações independentes:

1. Salvar a informação no PostgreSQL.
2. Atualizar o Neo4j.

Imagine que a primeira operação funcione, mas a segunda falhe. Os bancos ficariam inconsistentes.

O Outbox Pattern resolve esse problema garantindo que a alteração principal e o registro do evento sejam persistidos na mesma transação do PostgreSQL.

A atualização do Neo4j acontecerá posteriormente, de maneira assíncrona.

Isso significa que a sincronização não será necessariamente instantânea, mas será confiável e poderá ser repetida em caso de falha.

O processador deverá considerar:

- Idempotência dos eventos.
- Tentativas de reprocessamento.
- Tratamento de falhas.
- Ordenação quando necessária.
- Monitoramento de eventos pendentes.
- Estratégias para evitar duplicidade de relacionamentos no Neo4j.

A comunicação será orientada a eventos, mas isso não significa que precisaremos introduzir Kafka desde o início. Um processador próprio de Outbox poderá atender à necessidade inicial.

## Banco de grafos: Neo4j + Graph Data Science

O Neo4j será utilizado para funcionalidades que envolvam relações complexas entre usuários, produções e preferências.

A ideia é representar informações como:

- Usuários que assistiram a filmes.
- Usuários que avaliaram produções.
- Usuários que gostam de determinados gêneros.
- Pessoas que seguem outras pessoas.
- Atores e diretores relacionados a produções.
- Produções semelhantes.

Exemplos de relacionamentos:

- User WATCHED Movie.
- User RATED Movie.
- User LIKED Movie.
- User FOLLOWS User.
- Actor ACTED_IN Movie.
- Director DIRECTED Movie.
- Movie HAS_GENRE Genre.

Com essas relações, poderemos realizar consultas para descobrir afinidades e encontrar recomendações.

Por exemplo, o sistema poderá identificar filmes assistidos e bem avaliados por pessoas que possuem gostos semelhantes aos do usuário atual.

### Dados de filmes, elenco e direção no grafo

Uma decisão técnica que ainda precisará ser tomada é o nível de detalhamento dos dados cinematográficos que serão armazenados no Neo4j.

Uma possibilidade é manter no grafo não apenas os usuários, filmes, séries e gêneros, mas também informações sobre:

- Atores.
- Diretores.
- Roteiristas.
- Produtores.
- Países de produção.
- Franquias.
- Produtoras.
- Outras características relevantes do catálogo.

Por exemplo:

- Actor ACTED_IN Movie.
- Director DIRECTED Movie.
- Movie BELONGS_TO Collection.
- Movie PRODUCED_BY Company.
- Movie HAS_GENRE Genre.

Isso permitiria explorar relações cinematográficas que vão além do comportamento dos usuários.

Imagine que duas pessoas assistam a filmes diferentes, mas ambos tenham sido dirigidos pelo mesmo diretor ou possuam atores em comum.

Essas informações poderiam ajudar a identificar afinidades que ainda não seriam percebidas apenas pela comparação de avaliações e gêneros.

Também poderíamos recomendar filmes relacionados a produções que o usuário gostou por meio de atores, diretores, franquias e outros elementos compartilhados.

A proposta é avaliar se essas informações realmente melhoram os resultados do Taste Match, Movie Blend e das recomendações individuais.

A decisão sobre quais dados do TMDB serão replicados no grafo ainda está pendente.

### Graph Data Science (GDS)

Além das consultas Cypher tradicionais, o CineDiary utilizará a biblioteca **Neo4j Graph Data Science (GDS)** para análises mais avançadas sobre o grafo.

O GDS disponibiliza algoritmos que permitem analisar estruturas e padrões de relacionamento.

Ele será especialmente importante para as funcionalidades de Taste Match e Movie Blend.

Algumas possibilidades:

- Similaridade entre usuários.
- Identificação de comunidades com preferências semelhantes.
- Análise de relacionamentos entre produções.
- Descoberta de padrões de consumo.
- Identificação de usuários com interesses cinematográficos próximos.
- Geração de recomendações a partir das conexões do grafo.

A implementação deverá considerar projeções do grafo, escolha de algoritmos, parâmetros e estratégia de execução.

Os resultados poderão ser calculados sob demanda ou por processos periódicos, dependendo do custo computacional e da necessidade de atualização das recomendações.

O Neo4j não substituirá o PostgreSQL. O PostgreSQL continuará sendo a fonte de verdade, enquanto o Neo4j será uma estrutura especializada para consultas de relacionamento, análise e descoberta.

## Catálogo de filmes e séries: TMDB

O CineDiary utilizará inicialmente a API do TMDB para obter informações sobre filmes e séries.

O serviço poderá fornecer:

- Títulos.
- Sinopses.
- Posters.
- Imagens.
- Datas de lançamento.
- Gêneros.
- Elenco.
- Diretores.
- Temporadas.
- Episódios.
- Informações relacionadas às produções.

O TMDB será a principal fonte externa de metadados do catálogo.

A aplicação deverá manter referências aos identificadores externos, permitindo relacionar os dados do catálogo com as informações dos usuários.

A integração deverá respeitar os termos de uso, requisitos de atribuição e condições comerciais do TMDB.

Documentação: https://developer.themoviedb.org/docs

**Decisão pendente: onde realizar as chamadas ao TMDB?**

Ainda precisamos decidir se a integração será realizada diretamente pelo aplicativo mobile ou se todas as chamadas passarão pelo backend.

Uma possibilidade é o aplicativo consultar diretamente o TMDB para buscas e informações de catálogo, enquanto o backend seria responsável pelas operações que exigem persistência e regras de negócio.

Outra possibilidade é centralizar todas as chamadas no backend, utilizando uma integração Java com OpenFeign.

Nesse cenário, o backend funcionaria como uma camada de integração, controlando credenciais, cache, tratamento de erros e padronização das respostas.

A decisão deverá considerar segurança, exposição de credenciais, controle de consumo da API, cache, desempenho e complexidade de implementação.

O uso de OpenFeign também ainda não está definido.

## Autenticação: Clerk

O Clerk será utilizado para gerenciar a autenticação dos usuários.

Ele ficará responsável por recursos como:

- Cadastro.
- Login.
- Sessões.
- Recuperação de acesso.
- Gerenciamento de identidade.

A integração será feita tanto no aplicativo React Native quanto no backend Spring Boot.

O aplicativo utilizará o SDK oficial do Clerk para Expo e obterá o token da sessão do usuário.

Esse token será enviado nas requisições para o backend por meio do header:

Authorization: Bearer <token>

O Spring Security funcionará como Resource Server, validando a assinatura e os claims do JWT utilizando as chaves públicas disponibilizadas pelo Clerk.

O backend deverá manter seu próprio cadastro de usuários no PostgreSQL, relacionando o identificador interno com o identificador externo do Clerk.

É importante separar autenticação de autorização: o Clerk confirma a identidade do usuário, mas o backend continua responsável por verificar permissões, privacidade e acesso aos recursos Premium.

As alterações no cadastro externo serão sincronizadas por webhooks do Clerk, validados com Svix, conforme descrito anteriormente.

## Analytics: PostHog

O PostHog será utilizado para acompanhar o comportamento dos usuários dentro do aplicativo.

Poderemos registrar eventos como:

- user_signed_up.
- movie_logged.
- review_created.
- user_followed.
- taste_match_created.
- movie_blend_created.
- premium_started.
- data_import_started.
- data_import_completed.
- cinematic_wrapped_shared.

Esses dados permitirão entender como as pessoas utilizam o produto e identificar quais funcionalidades geram mais engajamento.

Também poderemos acompanhar métricas como:

- DAU e MAU.
- Retenção D1, D7 e D30.
- Conversão para Premium.
- Quantidade de registros por usuário.
- Compartilhamento de experiências.
- Utilização de Match e Blend.
- Taxa de sucesso das importações.
- Compartilhamentos do Cinematic DNA e Wrapped.

A coleta deverá respeitar a privacidade dos usuários e os requisitos da LGPD.

## Inteligência artificial

A inteligência artificial será integrada ao backend por meio de um provedor de modelos de linguagem, ainda a ser escolhido.

Ela será utilizada principalmente no Conversational Discovery, interpretando solicitações em linguagem natural e ajudando a gerar recomendações personalizadas.

O modelo não deverá acessar diretamente o banco de dados sem controle. O backend será responsável por fornecer o contexto necessário, executar as consultas permitidas e controlar o acesso às informações.

## Notificações push

O backend será responsável por gerenciar os eventos que geram notificações e realizar a integração com o serviço de push.

O aplicativo registrará seus tokens de dispositivo, que serão associados ao usuário no backend.

Quando uma ação relevante acontecer, o backend identificará os destinatários e enviará as notificações por meio do provedor escolhido, inicialmente com possibilidade de utilizar Expo Push Notifications.

A implementação deverá considerar:

- Armazenamento dos tokens por dispositivo.
- Atualização e remoção de tokens inválidos.
- Preferências de notificação.
- Tratamento de falhas no envio.
- Prevenção de notificações duplicadas.
- Deep links para abrir a tela correspondente no aplicativo.
- Agendamento de notificações contextuais.
- Controle de frequência e horários permitidos.

As notificações deverão levar o usuário diretamente à experiência relacionada, como uma solicitação de Match, um convite para Movie Blend ou uma recomendação compartilhada.

## Assinaturas: RevenueCat

O RevenueCat será avaliado como camada de gerenciamento das assinaturas Premium.

Ele poderá centralizar a integração com as lojas de aplicativos, incluindo App Store e Google Play, e disponibilizar informações sobre o estado das assinaturas e os direitos de acesso dos usuários.

O backend deverá receber e validar as informações necessárias para aplicar as permissões Premium, sem depender exclusivamente de verificações realizadas no aplicativo.

## Tecnologias futuras ou opcionais

Algumas tecnologias poderão ser adicionadas conforme a necessidade:

- **Redis:** cache de informações e otimização de consultas.
- **Object Storage:** armazenamento de arquivos e imagens próprios, incluindo arquivos temporários de importação, se necessário.
- **Sanity:** gerenciamento de conteúdo editorial e curadoria.
- **RevenueCat:** gerenciamento das assinaturas Premium.
- **Kafka:** processamento assíncrono e eventos, caso a escala e os casos de uso justifiquem.

Essas tecnologias não precisam fazer parte da primeira versão.

---

# 6. Arquitetura geral

A arquitetura inicial poderá ser representada da seguinte maneira:

**Aplicativo mobile**
- React Native.
- Expo.
- TypeScript.
- Expo Router.
- Clerk SDK.
- PostHog SDK.
- Expo Push Notifications.

**Backend**
- Java 25.
- Spring Boot.
- Gradle Kotlin DSL.
- Makefile.
- Spring Security Resource Server.
- API REST.
- Integração com TMDB.
- Integração com IA.
- Integração com Clerk Webhooks e Svix.
- Processamento de Outbox.
- Integração com Neo4j e GDS.
- Gerenciamento de notificações push.
- Importação de dados de outros provedores.
- Integração com RevenueCat.
- Regras de negócio.

**Persistência**
- PostgreSQL como banco principal.
- Tabela Outbox para registro de eventos de domínio e integração.
- Neo4j para inteligência baseada em grafos.
- GDS para análise e algoritmos de grafos.

**Serviços externos**
- Clerk para autenticação.
- Svix para validação de webhooks.
- TMDB para metadados.
- Provedor de IA para busca conversacional.
- PostHog para analytics.
- Expo Push Notifications ou outro provedor para notificações.
- RevenueCat para gerenciamento de assinaturas.

A comunicação principal será:

Aplicativo Mobile → API Spring Boot → PostgreSQL e serviços externos.

O PostgreSQL será a fonte oficial dos dados. As alterações relevantes serão registradas na Outbox e propagadas assincronamente para o Neo4j.

O Neo4j e o GDS serão utilizados para análise de relacionamentos, compatibilidade e recomendações.

Os webhooks do Clerk serão recebidos pelo backend para sincronizar alterações de identidade, enquanto os JWTs continuarão sendo validados localmente nas requisições protegidas.

A importação de dados de outros provedores também será processada pelo backend, mantendo a responsabilidade de validação, transformação e persistência centralizada.

---

# 7. Organização do projeto e colaboração

O CineDiary está sendo desenvolvido por duas pessoas, que criaram uma organização própria no GitHub para concentrar o código, a documentação e o gerenciamento do trabalho.

A organização será compartilhada pelos dois integrantes, permitindo que ambos tenham acesso aos repositórios e às ferramentas de planejamento.

### Divisão inicial de responsabilidades

A divisão inicial de trabalho será:

**Desenvolvimento mobile:**

Responsabilidade principal da integrante que ficará à frente do frontend, utilizando React Native, Expo e TypeScript.

**Desenvolvimento backend:**

Responsabilidade principal do integrante que ficará à frente do backend, utilizando Java 25, Spring Boot e Gradle Kotlin DSL.

Essa divisão representa a responsabilidade principal de cada pessoa, não uma separação rígida.

Ambos poderão contribuir em outras partes do projeto, revisar código, ajudar em decisões técnicas e colaborar quando necessário.

As decisões de produto, arquitetura, experiência do usuário e prioridades deverão ser discutidas em conjunto.

### GitHub Projects

O gerenciamento das funcionalidades e atividades será realizado utilizando o **GitHub Projects** dentro da organização.

A ferramenta será utilizada para:

- Organizar funcionalidades.
- Criar tarefas técnicas.
- Acompanhar o desenvolvimento.
- Definir prioridades.
- Registrar bugs.
- Acompanhar o andamento de cada etapa.
- Relacionar tarefas com Pull Requests e Issues.
- Visualizar o progresso geral do projeto.

A ideia é manter uma visão compartilhada do que precisa ser desenvolvido, quem está trabalhando em cada tarefa e qual é o estado atual.

### Repositórios

A proposta é manter dois repositórios independentes dentro da organização:

**Repositório mobile**

Responsável pelo aplicativo React Native e Expo.

**Repositório backend**

Responsável pelo backend Java e Spring Boot.

Os nomes definitivos ainda não foram escolhidos.

Também não está decidido se haverá um repositório adicional para documentação. Inicialmente, a documentação poderá ser mantida em ferramentas como Notion ou dentro da própria organização do GitHub.

### Estrutura inicial sugerida para o mobile

- app: rotas e navegação.
- src/components: componentes reutilizáveis.
- src/features: funcionalidades organizadas por domínio.
- src/hooks: hooks compartilhados.
- src/services: comunicação com APIs.
- src/stores: gerenciamento de estado.
- src/theme: identidade visual e design system.
- src/types: tipos compartilhados.

### Estrutura inicial sugerida para o backend

- módulos organizados por domínio.
- controllers e endpoints REST.
- services e regras de negócio.
- repositories e persistência.
- entities e modelos.
- integração com serviços externos.
- configuração de segurança.
- processamento de webhooks.
- processamento da Outbox.
- integração com Neo4j e GDS.
- gerenciamento de notificações.
- testes automatizados.

---

# 8. Princípios de desenvolvimento

O desenvolvimento do CineDiary deverá seguir alguns princípios para evitar complexidade desnecessária.

**Começar simples e evoluir conforme a necessidade.**

Não precisamos implementar toda a arquitetura imaginada desde o primeiro dia.

O PostgreSQL será suficiente para começar. O Neo4j será introduzido quando as funcionalidades de recomendação exigirem.

O backend será inicialmente um monólito modular, evitando microsserviços prematuros.

Kafka, Redis e outras tecnologias também deverão entrar apenas quando houver uma justificativa concreta.

**Privacidade desde o início.**

O produto trabalhará com dados pessoais, avaliações, atividades sociais e preferências dos usuários.

Por isso, privacidade, autorização, controle de visibilidade e conformidade com a LGPD deverão fazer parte das decisões iniciais.

**Testabilidade e qualidade.**

O backend deverá possuir testes unitários e de integração. O aplicativo também deverá ter testes para os fluxos mais importantes.

**Contratos bem definidos.**

A API deverá ser documentada utilizando OpenAPI, facilitando a integração entre mobile e backend e permitindo, futuramente, gerar clientes TypeScript.

**Observabilidade.**

Logs estruturados, métricas e rastreamento deverão ser considerados desde o início, evoluindo conforme a necessidade da aplicação.

**Consistência entre bancos.**

O PostgreSQL será a fonte de verdade. O Neo4j será atualizado por meio do Outbox Pattern, com processamento idempotente, retentativas e monitoramento.

**Integrações resilientes.**

Webhooks, notificações push e integrações externas deverão considerar falhas de comunicação, reprocessamento e duplicidade de mensagens.

**Experiência de migração.**

O CineDiary deverá facilitar a entrada de usuários que já utilizam outras plataformas, evitando que precisem reconstruir manualmente seu histórico cinematográfico.

**Experiências sociais com propósito.**

Taste Match, Movie Blend, Cinematic DNA e Wrapped deverão ser pensados como experiências que incentivem descoberta, compartilhamento e conexão entre usuários.

**Onboarding progressivo.**

O CineDiary deverá coletar informações de acordo com o contexto e a necessidade do usuário, evitando exigir um cadastro extenso antes que ele consiga experimentar o valor do produto.

---

# 9. Roadmap de desenvolvimento

O projeto será dividido em etapas para manter o foco e evitar que muitas funcionalidades sejam desenvolvidas simultaneamente.

## M0 — Product Discovery

Objetivo: entender o problema, o público e o produto antes de começar a implementação.

Atividades:

- Definir visão e proposta de valor.
- Identificar o público-alvo prioritário.
- Pesquisar concorrentes.
- Identificar problemas reais dos usuários.
- Conversar com potenciais usuários.
- Definir o MVP.
- Criar o PRD (Product Requirements Document).

Essa etapa é especialmente importante para evitar construir funcionalidades complexas sem validar se as pessoas realmente precisam delas.

## M1 — UX/UI Design

Objetivo: transformar a visão do produto em uma experiência visual e funcional.

Atividades:

- Criar jornadas dos usuários.
- Definir fluxos de navegação.
- Criar wireframes.
- Desenvolver protótipos no Figma.
- Definir design system.
- Validar a experiência antes da implementação.
- Desenhar os fluxos de convite e aceitação do Taste Match.
- Desenhar o processo de preparação e início do Movie Blend.
- Desenhar o onboarding cinematográfico para convidados.
- Desenhar a experiência de importação de dados.
- Definir as experiências de Cinematic DNA e Wrapped.
- Definir os pontos de entrada e as configurações de notificações.
- Explorar a apresentação visual dos Stories de Match e Blend.

## M2 — Architecture & Setup

Objetivo: preparar a estrutura técnica do projeto.

Atividades:

- Criar os repositórios.
- Configurar o aplicativo Expo.
- Criar o projeto Spring Boot.
- Configurar Java 25.
- Configurar Gradle Kotlin DSL.
- Criar Makefile.
- Definir arquitetura e módulos.
- Modelar o banco PostgreSQL.
- Configurar Docker Compose para desenvolvimento local.
- Integrar ferramentas de testes.
- Configurar CI/CD inicial.
- Definir ambientes de desenvolvimento e homologação.
- Configurar documentação OpenAPI.
- Configurar autenticação com Clerk.
- Preparar a validação de webhooks com Svix.
- Definir a estratégia de Outbox.
- Preparar a infraestrutura de notificações push.

## M3 — Foundation

Objetivo: construir a fundação funcional do CineDiary.

Atividades:

- Integrar Clerk.
- Implementar cadastro e login.
- Criar gerenciamento de usuários e perfis.
- Implementar sincronização de usuários via webhooks.
- Integrar TMDB.
- Implementar estrutura inicial de navegação.
- Criar componentes básicos do design system.
- Configurar comunicação entre mobile e backend.

## M4 — Core Product

Objetivo: entregar as funcionalidades principais do produto.

Atividades:

- Registrar filmes e séries.
- Criar Diary Entries.
- Implementar avaliações.
- Implementar reviews.
- Criar watchlist.
- Criar listas personalizadas.
- Implementar acompanhamento de séries.
- Implementar perfis de usuários.
- Implementar seguir usuários.
- Criar feed social.

## M5 — Social Experience

Objetivo: aprofundar as experiências sociais.

Atividades:

- Curtidas e comentários.
- Marcação de amigos.
- Aprovação e rejeição de marcações.
- Configurações de privacidade.
- Notificações.
- Notificações push.
- Compartilhamento de atividades.

## M6 — Taste Intelligence

Objetivo: implementar os diferenciais inteligentes do CineDiary.

Atividades:

- Preparar o modelo de grafo no Neo4j.
- Implementar sincronização PostgreSQL → Neo4j por Outbox Pattern.
- Implementar o processador de eventos.
- Desenvolver Taste Match.
- Desenvolver cálculo de compatibilidade com Neo4j e GDS.
- Implementar convites e aceitação automática do Taste Match.
- Criar apresentação do resultado no formato Match Story.
- Criar Movie Blend.
- Implementar convites e gerenciamento dos participantes.
- Implementar o botão Iniciar Blend e o fechamento do grupo.
- Desenvolver Movie Blend Story.
- Implementar recomendações coletivas com Neo4j e GDS.
- Implementar recomendações personalizadas.
- Desenvolver Cinematic Analytics.
- Implementar Conversational Discovery.

## M7 — Experiências complementares

Objetivo: expandir a experiência do produto e reduzir barreiras de adoção.

Atividades:

- Implementar importação de dados do Letterboxd.
- Avaliar suporte a outros provedores.
- Desenvolver compartilhamento do Cinematic DNA.
- Desenvolver Cinematic Wrapped.
- Implementar notificações contextuais.
- Criar experiências de descoberta baseadas em lançamentos e compatibilidade.

## M8 — Monetização e Launch

Objetivo: preparar o produto para disponibilização ao público e ativar o modelo de negócio.

Atividades:

- Implementar assinatura Premium.
- Avaliar e integrar RevenueCat.
- Implementar controle de limites do plano Free.
- Integrar publicidade nas telas do plano Free.
- Remover publicidade para usuários Premium.
- Definir e integrar o provedor de pagamentos.
- Testes funcionais e de integração.
- Testes de segurança.
- Otimização de performance.
- Revisão de privacidade e LGPD.
- Configuração de monitoramento.
- Beta fechado.
- Coleta de feedback.
- Correções e melhorias.
- Publicação nas lojas.

## M9 — Expansão Web

Objetivo: disponibilizar uma experiência do CineDiary diretamente pelo navegador.

Atividades:

- Definir a tecnologia da aplicação Web.
- Reaproveitar os contratos da API.
- Planejar autenticação e sessões Web.
- Desenvolver perfis e páginas cinematográficas.
- Implementar diário, reviews e listas.
- Implementar feed social.
- Adaptar as experiências de Taste Match e Movie Blend.
- Preparar uma experiência responsiva para desktop e dispositivos móveis.

A versão Web será explorada depois que a experiência mobile estiver mais madura. O roadmap é uma visão inicial e poderá mudar conforme a validação do produto.

---

# 10. O que torna o CineDiary diferente?

O diferencial do CineDiary não está em uma funcionalidade isolada, mas na combinação das experiências.

O diário cria dados sobre os gostos dos usuários.

A camada social transforma esses dados em interações e descobertas.

O Taste Match identifica afinidades entre pessoas.

O Movie Blend transforma essas afinidades em experiências coletivas.

O Conversational Discovery torna a busca mais natural e personalizada.

O Cinematic Analytics transforma o histórico em uma visão interessante sobre o próprio comportamento.

O Cinematic DNA transforma a identidade cinematográfica em uma experiência visual compartilhável.

O Cinematic Wrapped transforma um ano de consumo em uma retrospectiva pessoal.

As notificações inteligentes aproximam as pessoas de novas produções e criam oportunidades para experiências compartilhadas.

A importação de dados permite que usuários de outras plataformas tragam sua história para o CineDiary, reduzindo a dificuldade de começar a utilizar um novo serviço.

O onboarding cinematográfico permite que novos usuários participem dessas experiências sem precisar construir um histórico inteiro antes de começar.

Essas funcionalidades se complementam e criam um ecossistema em que quanto mais o usuário utiliza o aplicativo, mais informações relevantes o CineDiary possui para oferecer experiências personalizadas.

O objetivo é construir uma plataforma em que as pessoas não entrem apenas para registrar o que assistiram, mas também para descobrir o que assistir, conversar sobre suas experiências e se conectar com outras pessoas que compartilham seus interesses.

---

# 11. Decisões ainda pendentes

Apesar de termos uma visão bastante desenvolvida, algumas decisões precisam ser tomadas durante o Product Discovery e as próximas etapas de arquitetura.

### Produto e mercado

- Qual será o público-alvo prioritário?
- O lançamento inicial será focado no Brasil ou terá uma proposta global?
- Quais problemas dos usuários são mais importantes para resolver?
- Quais funcionalidades realmente precisam estar no MVP?
- Qual será a identidade visual definitiva?

### UX/UI e experiência

- Como será a navegação principal do aplicativo?
- Como serão organizadas as telas e abas?
- Quais serão os fluxos completos do diário e das reviews?
- Como será a experiência visual do Taste Match Story?
- Como será a experiência visual do Movie Blend Story?
- Como será a tela de preparação do Movie Blend?
- Como será apresentado o onboarding cinematográfico?
- Como será apresentada a experiência do Cinematic DNA?
- Como será a narrativa visual do Cinematic Wrapped?
- Como será a experiência de importação de dados?
- Quais serão as regras finais de privacidade e marcação?
- Como será a experiência da futura versão Web?

**Nenhuma estrutura definitiva de UX/UI, fluxo de navegação ou modelagem de tabelas foi fechada até o momento.** Essas definições serão realizadas nas etapas apropriadas do projeto.

### Taste Intelligence

- Como será calculada a compatibilidade do Taste Match?
- Quais critérios serão utilizados nas recomendações do Movie Blend?
- Quais algoritmos do GDS serão mais adequados para cada experiência?
- Como será a estratégia de atualização e execução dos algoritmos no Neo4j?
- Quais dados cinematográficos serão armazenados no grafo?
- Atores, diretores, roteiristas e produtoras serão representados como nós?
- Como serão tratadas atualizações de preferências e histórico dos usuários?
- Qual será o conjunto mínimo de informações exigido para participar de um Match ou Blend?

### Integrações e arquitetura

- O backend realizará as chamadas ao TMDB ou o aplicativo consultará a API diretamente?
- Caso as chamadas sejam centralizadas no backend, será utilizado OpenFeign?
- Qual será a estratégia de cache dos dados do catálogo?
- Qual será o provedor de IA?
- Qual será o provedor definitivo de notificações push?
- Como será implementado o processamento agendado das notificações contextuais?
- Como será estruturado o processo de importação de arquivos?
- Quais outros provedores serão suportados além do Letterboxd?
- Como será feita a integração definitiva com RevenueCat?
- Qual será a tecnologia da futura aplicação Web?

### Organização e desenvolvimento

- Quais serão os nomes definitivos dos repositórios mobile e backend?
- Qual será a estrutura definitiva dos módulos do backend?
- Qual será a modelagem do PostgreSQL?
- Qual será a estrutura do grafo Neo4j?
- Como serão organizados os ambientes de desenvolvimento e homologação?

### Monetização

- Qual será o preço da assinatura Premium?
- Quais funcionalidades justificam o pagamento?
- Quais formatos e posicionamentos de anúncios serão utilizados no plano Free?
- Quais produtos e períodos de assinatura serão oferecidos?
- Como será feita a integração com o provedor de pagamentos?

Essas decisões deverão ser documentadas e validadas, evitando que ideias iniciais sejam confundidas com requisitos definitivos.

---

# 12. Visão de futuro

A visão de longo prazo é transformar o CineDiary em uma plataforma de referência para pessoas que gostam de filmes e séries.

Um lugar onde cada usuário tenha seu próprio espaço cinematográfico, construa um histórico de experiências, compartilhe opiniões, encontre pessoas com gostos semelhantes e descubra novas produções.

Um produto em que os dados gerados pelas atividades dos usuários alimentem uma inteligência coletiva, capaz de transformar preferências individuais em novas experiências de descoberta.

Queremos que a entrada no CineDiary seja simples, inclusive para quem já construiu anos de histórico em outras plataformas.

Queremos que as experiências sociais sejam divertidas e memoráveis, desde descobrir uma compatibilidade com um amigo até decidir coletivamente o próximo filme.

Queremos que novos usuários consigam participar dessas experiências rapidamente, mesmo antes de construir um histórico completo.

Queremos também que o usuário tenha orgulho de compartilhar sua identidade cinematográfica, suas estatísticas e sua retrospectiva anual.

E queremos que o CineDiary esteja disponível onde as pessoas preferirem utilizá-lo, seja no celular ou futuramente no navegador.

O CineDiary não deve ser apenas um lugar para responder à pergunta "O que eu assisti?".

Queremos que ele também ajude a responder:

- O que eu deveria assistir?
- Quem tem um gosto parecido com o meu?
- Qual filme meus amigos e eu gostaríamos de assistir juntos?
- Quais histórias representam meu gosto cinematográfico?
- O que posso descobrir a partir das pessoas que acompanho?
- Como posso trazer todo meu histórico cinematográfico para cá?
- O que meu ano cinematográfico diz sobre mim?

**CineDiary: seu universo cinematográfico, compartilhado.**
