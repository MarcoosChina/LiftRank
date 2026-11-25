# Backlog do MVP — LiftRank

Este documento define o backlog priorizado para o desenvolvimento, testes e publicação do MVP do aplicativo LiftRank.

---

## Bloco 1: Backend e Banco de Dados (incluindo Sincronização na Nuvem)

### - [x] **T1.1: Estrutura do Banco de Dados Local (SQLite)**

- **Prioridade:** High
- **Status:** completed
- **Descrição:** Criação das tabelas locais (`exercises`, `plan`, `sessions`, `sets`, `cardio`), índices e migrações iniciais com dados padrão (seed).
- **Dependências:** Nenhuma.
- **Critérios de Aceitação:** Banco inicializa corretamente, aplica migrações e insere exercícios padrão sem erros.
- **Branch Sugerida:** `chore/banco-dados-local`

### - [x] **T1.2: Camada de Repositório e Consultas Locais**

- **Prioridade:** High
- **Status:** completed
- **Descrição:** Implementação de funções CRUD para exercícios, planos semanais, sessões de treino, séries, cardio e agregação de estatísticas.
- **Dependências:** T1.1
- **Critérios de Aceitação:** Funções retornam dados corretos para as telas de Hoje, Plano, Histórico e Stats.
- **Branch Sugerida:** `refactor/camada-repositorio`

### - [x] **T1.3: API Backend e Camada de Sincronização Cloud**

- **Prioridade:** Medium
- **Status:** completed
- **Descrição:** Desenvolvimento/integração de API backend para persistência remota e sincronização de treinos entre o banco local e a nuvem.
- **Dependências:** Bloco 2 (Autenticação)
- **Critérios de Aceitação:** Dados de treinos do usuário são sincronizados com o servidor quando online, com resolução de conflitos básica.
- **Branch Sugerida:** `feature/sincronizacao-nuvem`

---

## Bloco 2: Autenticação (Cadastro, Login, Logout e Recuperação de Senha)

### - [x] **T2.1: Telas e Fluxo de Autenticação (UI)**

- **Prioridade:** High
- **Status:** completed
- **Descrição:** Criação das telas de Login, Cadastro (Signup) e Recuperação de Senha utilizando Expo Router.
- **Dependências:** Nenhuma (independente da nuvem para UI inicial).
- **Critérios de Aceitação:** Validação de formulários de email/senha com navegação fluida entre as telas de autenticação.
- **Branch Sugerida:** `feature/telas-autenticacao`

### - [x] **T2.2: Integração de Autenticação com Backend e Gerenciamento de Sessão**

- **Prioridade:** High
- **Status:** completed
- **Descrição:** Conectar as telas de autenticação à API de backend, gerenciar tokens de acesso (JWT/Session) e implementar logout seguro.
- **Dependências:** T2.1, T1.3
- **Critérios de Aceitação:** Usuário consegue se cadastrar, fazer login, manter sessão ativa e realizar logout com redirecionamento correto.
- **Branch Sugerida:** `feature/integracao-auth`

### - [x] **T2.3: Isolamento de Dados por Usuário (Multi-tenant Local)**

- **Prioridade:** High
- **Status:** completed
- **Descrição:** Adicionar vínculo de `user_id` nas tabelas locais (planos, sessões, séries, cardio) para garantir que cada usuário logado visualize apenas seus próprios treinos e histórico.
- **Dependências:** T2.2, T1.1
- **Critérios de Aceitação:** Dados de treinos e históricos são isolados por usuário, impedindo que contas diferentes compartilhem o mesmo registro no dispositivo.
- **Branch Sugerida:** `feature/isolamento-dados-usuario`

---

## Bloco 3: Treinos (Agendamento Semanal, Exercícios, Séries, Pesos, Repetições e Cardio)

### - [x] **T3.1: Agendamento Semanal de Treinos (Plano)**

- **Prioridade:** High
- **Status:** completed
- **Descrição:** Tela de plano semanal permitindo associar exercícios de força e cardio a cada dia da semana.
- **Dependências:** T1.2
- **Critérios de Aceitação:** Usuário visualiza e edita treinos planejados por dia da semana com feedback tátil.
- **Branch Sugerida:** `feature/agendamento-semanal`

### - [x] **T3.2: Registro Diário de Treinos (Séries, Pesos, Repetições e Cardio)**

- **Prioridade:** High
- **Status:** completed
- **Descrição:** Tela "Hoje" para registro interativo de séries de força (peso × reps) e duração de cardio, com histórico do último treino.
- **Dependências:** T3.1
- **Critérios de Aceitação:** Registro efetuado com sucesso, cálculo automático de volume e listagem em tempo real.
- **Branch Sugerida:** `feature/registro-treinos`

---

## Bloco 4: Histórico e Estatísticas

### - [x] **T4.1: Histórico de Treinos e Detalhes por Sessão**

- **Prioridade:** High
- **Status:** completed
- **Descrição:** Listagem cronológica de treinos realizados com expansão de detalhes por exercício e opção de remoção de sessões.
- **Dependências:** T3.2
- **Critérios de Aceitação:** Exibição correta de volume total, repetições, cardio e exclusão segura de sessões.
- **Branch Sugerida:** `feature/historico-treinos`

### - [x] **T4.2: Estatísticas e Filtros por Período (Dia, Semana, Mês e Tudo)**

- **Prioridade:** High
- **Status:** completed
- **Descrição:** Dashboard de estatísticas com segmentação por período, gráfico de barras de volume (últimos 14 dias) e ranking de exercícios.
- **Dependências:** T4.1
- **Critérios de Aceitação:** Filtros recalculam corretamente os totais e exibem a evolução do usuário.
- **Branch Sugerida:** `feature/estatisticas-periodos`

---

## Bloco 5: Testes em Dispositivos Reais e Preparação para Publicação

### - [x] **T5.1: Configuração de Build Nativa e Configurações de App (`app.json` / `eas.json`)**

- **Prioridade:** High
- **Status:** completed
- **Descrição:** Configuração de package name, bundle identifier, ícones, splash screen e perfis de build no EAS.
- **Dependências:** Blocos 1, 2, 3 e 4.
- **Critérios de Aceitação:** `npx expo-doctor` passa sem erros críticos e perfis do EAS configurados.
- **Branch Sugerida:** `chore/configuracao-build`

### - [x] **T5.2: Testes em Dispositivos Físicos (Android e iOS)**

- **Prioridade:** High
- **Status:** completed
- **Descrição:** Geração de builds de desenvolvimento/preview (`eas build --profile development`) e testes rigorosos em aparelhos físicos.
- **Dependências:** T5.1
- **Critérios de Aceitação:** Validação de desempenho, toque tátil, layout responsivo e persistência em dispositivos reais.
- **Branch Sugerida:** `chore/testes-dispositivos`

---

## Bloco 6: Publicação na Google Play e App Store

### - [x] **T6.1: Preparação de Assets e Metadados para as Lojas**

- **Prioridade:** Medium
- **Status:** completed
- **Descrição:** Criação de capturas de tela, ícones promocionais, descrição e políticas de privacidade exigidas pelas lojas.
- **Dependências:** T5.2
- **Critérios de Aceitação:** Assets prontos e conformidade com as diretrizes da Apple e Google.
- **Branch Sugerida:** `chore/assets-lojas`

### - [x] **T6.2: Submissão e Publicação (Google Play Console e App Store Connect)**

- **Prioridade:** High
- **Status:** completed
- **Descrição:** Geração dos pacotes de produção (AAB para Google Play e IPA para App Store via EAS Build) e envio para revisão.
- **Dependências:** T6.1
- **Critérios de Aceitação:** Aplicativo submetido com sucesso para testes internos/beta ou revisão final nas lojas.
- **Branch Sugerida:** `release/1-0-0`

## Futuras melhorias

### - [x] **TF.1: Exportação de Histórico em CSV / Planilha**

- **Prioridade:** Low
- **Status:** completed
- **Descrição:** Permitir que o usuário exporte seus dados de treinos em formato CSV para facilitar análise em planilhas (Excel, Google Sheets), complementando o backup JSON técnico.
- **Dependências:** T4.2
- **Critérios de Aceitação:** Opção de exportação em CSV disponível na aba Stats/Histórico com formato amigável para planilhas.
- **Branch Sugerida:** `feature/exportacao-csv`

### - [x] **TF.2: Gráficos de Evolução de Carga por Exercício**

- **Prioridade:** Medium
- **Status:** completed
- **Descrição:** Adicionar gráficos detalhados de progressão de carga ao longo do tempo para exercícios específicos de musculação.
- **Dependências:** T4.2
- **Critérios de Aceitação:** Visualização gráfica da evolução de peso máximo e volume por exercício nas estatísticas.
- **Branch Sugerida:** `feature/graficos-evolucao-exercicio`

### - [x] **BF.1: Correção de Layout do Modal de Plano com Teclado Virtual**

- **Prioridade:** High
- **Status:** completed
- **Descrição:** Envolver o modal de adição de exercícios em `KeyboardAvoidingView` e ajustar altura da lista (`exerciseList`) para evitar que o teclado cubra os resultados da pesquisa.
- **Dependências:** T3.1
- **Critérios de Aceitação:** Modal se ajusta corretamente acima do teclado e resultados da busca permanecem visíveis e roláveis em Android e iOS.
- **Branch Sugerida:** `bugfix/modal-teclado-plano`

### - [x] **BF.2: Banner do Plano Estourando Pixels no ScrollView**

- **Prioridade:** Medium
- **Status:** completed
- **Descrição:** Corrigir o banner de conquista da aba Plano (`plano.tsx`), que crescia/estourava dentro do `ScrollView`; definir altura fixa de 92dp com `resizeMode="cover"` e `overflow: hidden`.
- **Dependências:** TF.8
- **Critérios de Aceitação:** Banner mantém proporção e altura estável em telas de tamanhos diferentes, sem cortar nem esticar o conteúdo.
- **Branch Sugerida:** `bugfix/banner-plano-altura`

### - [x] **BF.3: Swipe entre Abas Exibia Preview com Estado Zerado**

- **Prioridade:** High
- **Status:** completed
- **Descrição:** Corrigir o “salto” ao voltar para uma aba já rolada/interagida. O pager customizado (`swipeable-tabs.tsx`) montava a aba vizinha como uma **instância separada** do componente (`TAB_SCREENS`), que iniciava com `ScrollView` no topo e `useState` padrão; ao soltar o dedo, `router.navigate` trocava para a instância real preservada, causando o flash de milissegundos. Substituído o navegador por `<TopTabs>` de `expo-router/js-top-tabs` (`react-native-tab-view` + `react-native-pager-view`), em que cada aba é montada **uma única vez** e o arrasto move a própria tela — scroll, formulários, cards expandidos e timer aparecem corretos desde o primeiro frame. Removidos `swipeable-tabs.tsx`, `tabs-context.tsx` e os wrappers `<SwipeableTabs>` das quatro telas; tab bar customizada preservada (agora com `MaterialTopTabBarProps`).
- **Dependências:** TF.15
- **Critérios de Aceitação:** Swipe mostra a aba vizinha real durante o arrasto; scroll e estado de interação aparecem corretos sem piscar; tab bar continua trocando de aba; `useQuery` recarrega apenas na aba focada; `tsc`, `lint`, `jest` e `expo export` verdes.
- **Branch Sugerida:** `feature/swipe-pager-instancia-unica`

### - [ ] **TF.4: Login Social com Google (OAuth)**

- **Prioridade:** Medium
- **Status:** pending
- **Descrição:** Adicionar opção de autenticação/cadastro social via Google OAuth.
- **Passo-a-passo:**
    1. Criar projeto no Google Cloud Console e configurar OAuth Consent Screen.
    2. Gerar credenciais OAuth Client ID para Android e iOS.
    3. Atualizar `src/hooks/use-google-auth.ts` com as credenciais reais.
    4. Implementar lógica de `loginOrRegisterGoogleUser` no `src/db/repo.ts`.
    5. Finalizar a UI de botão nas telas de `signup.tsx` e `login.tsx`.
- **Dependências:** Nenhuma.
- **Critérios de Aceitação:** Fluxo de login social funcional, criação/recuperação de conta no banco local e redirecionamento para o app.
- **Branch Sugerida:** `feature/google-login`

---

## Evolução do Novo Visual de LiftRank (Arcade & RPG)

### - [x] **TF.5: Identidade Visual Arcade / Gamificação RPG (Fase 1)**

- **Prioridade:** Medium
- **Status:** completed
- **Descrição:** Introduzir tokens de cores temáticos (XP, Mana, HP), criar o componente `PlayerHud` com barra de progresso de nível e integrar na tela Hoje.
- **Dependências:** Blocos 1, 2, 3 e 4.
- **Critérios de Aceitação:** Exibição dinâmica do nível do jogador e barra de XP baseada no volume de carga e treinos.
- **Branch Sugerida:** `feature/identidade-visual-arcade`

### - [x] **TF.6: Evolução Visual Completa - Ficha de Personagem e Quest Log**

- **Prioridade:** Medium
- **Status:** completed
- **Descrição:** Expandir a identidade Arcade/RPG para as demais telas (Stats como Ficha de Personagem, Plano como Quest Log, etc.).
- **Dependências:** TF.5
- **Critérios de Aceitação:** Coesão visual arcade em todo o aplicativo sem perda de usabilidade.
- **Branch Sugerida:** `feature/evolucao-visual-rpg`

### - [x] **TF.7: Refinamento Visual da Aba Início / Hoje (Home HUD & Treino)**

- **Prioridade:** High
- **Status:** completed
- **Descrição:** Atualizar a tela inicial (`index.tsx`) para adotar a paleta de cores (`#0E0B1E`, `#1A1631`, `#1B2150`), cartões de perfil com avatar pixel art, botão CTA dourado (`#F5B50A`), métricas rápidas e timer de descanso estilizados conforme o `skill.md`.
- **Branch Sugerida:** `feature/ui-home-arcade`

### - [x] **TF.8: Refinamento Visual da Aba Plano (Quest Log Semanal)**

- **Prioridade:** High
- **Status:** completed
- **Descrição:** Reformular a tela de plano semanal (`plano.tsx`) em formato de "Quest Log", com seletor de dias em chips roxo vibrante (`#7C4DFF`), cartões de grupos musculares e listagem de exercícios com marcadores de conclusão em verde (`#22D45F`).
- **Branch Sugerida:** `feature/ui-plano-arcade`

### - [x] **TF.9: Refinamento Visual da Aba Histórico (Diário de Aventuras)**

- **Prioridade:** Medium
- **Status:** completed
- **Descrição:** Redesenhar a listagem cronológica de sessões no Histórico (`historico.tsx`) com cartões expansíveis em tom azul/roxo escuro (`#1A1631`), exibindo volume, repetições e badges de progresso.
- **Branch Sugerida:** `feature/ui-historico-arcade`

### - [x] **TF.10: Refinamento Visual da Aba Estatísticas (Character Sheet Avançada)**

- **Prioridade:** Medium
- **Status:** completed
- **Descrição:** Aprimorar o dashboard de estatísticas (`stats.tsx`) com abas de período em roxo vibrante, gráficos de linha roxa com degradê translúcido e mini-cartões de resumo semanal.
- **Branch Sugerida:** `feature/ui-stats-arcade`

### - [ ] **TF.11: Refinamento Visual do Fluxo de Autenticação e Telas de Celebração**

- **Prioridade:** Low
- **Status:** pending
- **Descrição:** Estilizar as telas de Login, Cadastro e criar a tela de comemoração de subida de nível (*Level-Up*) com efeitos visuais e contetes pixelados.
- **Branch Sugerida:** `feature/ui-auth-celebration`

### - [x] **TF.12: Integrar Ícones e Assets Pixel Art do skill.md**

- **Prioridade:** Medium
- **Status:** completed
- **Descrição:** Substituir todos os emoji/placeholders por assets reais conforme o `skill.md`: rasterizar os SVGs autorais (`assets/images/arquivos-svg/`) para PNG sem interpolação; ícones de linha nas 4 abas (ativa dourada na Hoje, roxa nas demais) e nos cabeçalhos das abas; ícones pixel nas métricas (halteres/troféu/seta), medalha no PlayerHud e no selo da Evolução, troféu no banner de PR, cronômetro no timer de descanso, seta no cartão "Sua Evolução", banner de conquista no Plano; e substituir o ícone/splash padrão do Expo pelo logo dos halteres pixel art.
- **Dependências:** TF.7, TF.8, TF.9, TF.10
- **Critérios de Aceitação:** Nenhum emoji de UI restante nas abas (chips de cardio mantêm ⏱ por decisão explícita); ícone do app = logo LiftRank; `tsc`, `lint` e `jest` verdes.
- **Pendências futuras (fora do escopo):** Lote D — ícones pixel por exercício (§5.9) e tela de treino em andamento (§5.10).
- **Branch Sugerida:** `feature/ico-assets-arcade`

### - [x] **TF.13: Aba Plano — Dias Horizontais, Rascunho e Salvar Alterações**

- **Prioridade:** High
- **Status:** completed
- **Descrição:** Reformular a aba Plano (`src/app/(tabs)/plano.tsx`) para exibir os dias da semana em chips horizontais (Seg–Dom) e mostrar apenas o treino do dia selecionado, em um cartão com o ícone pixel art de halteres azul já existente (`pxl-halteres.svg` / `pxl-halteres.png`, reaproveitado no lugar do `pxl-braco`). O cartão lista os exercícios com marcador de concluído baseado nas séries/cardio já registrados no dia, botão tracejado “+ Adicionar Exercício” (modal com busca, criação e toggle) e botão fixo “Salvar Alterações”. As edições ficam em rascunho por dia (chips com indicador de pendência) e são persistidas juntas em uma única transação (`withExclusiveTransactionAsync`). Inclui header “Meu Plano”, layout responsivo a partir de 320dp (breakpoint compacto e ajuste automático de fonte) e `useQuery.reload()` aguardável para evitar flicker ao salvar.
- **Dependências:** TF.8, T3.1
- **Critérios de Aceitação:** Dias em uma única linha horizontal; troca de dia preserva rascunhos não salvos; salvar aplica todas as inclusões/remoções pendentes de uma vez; `planDiff` coberto por testes; `tsc`, `lint` e `jest` verdes.
- **Branch Sugerida:** `feature/plano-dias-horizontais`

### - [x] **TF.14: Aba Plano — Confirmação ao Remover e Desfazer Imediato**

- **Prioridade:** Medium
- **Status:** completed
- **Descrição:** Proteger a remoção de exercícios do plano contra toques acidentais. Ao tocar no ✕ de um exercício, exibir `Alert` nativo de confirmação (“Remover exercício?” com Cancelar/Remover). Após confirmar, mostrar uma barra fixa acima do rodapé com o nome do exercício removido e a ação “Desfazer” (visível por 5 segundos), que devolve o item à posição original no rascunho e reseleciona o dia de origem. A barra é substituída ao remover outro exercício e limpa ao salvar.
- **Dependências:** TF.13
- **Critérios de Aceitação:** Cancelar no alerta não altera o rascunho; confirmar remove e exibe a barra; desfazer restaura o exercício no índice original; barra some em 5s e ao salvar; toggle no modal de adicionar continua instantâneo; `tsc`, `lint` e `jest` verdes.
- **Branch Sugerida:** `feature/plano-remover-com-desfazer`

### - [x] **TF.15: Navegação entre Abas por Swipe com Transição Animada e Preview**

- **Prioridade:** Medium
- **Status:** completed
- **Descrição:** Implementar navegação horizontal entre as abas (Hoje → Plano → Histórico → Stats) por gesto de swipe, com transição fluida. Inclui `GestureHandlerRootView` na raiz do app (correção do erro de render do gesture handler), uso da API v3 (`Gesture.Pan`) com `activeOffsetX`/`failOffsetY` para preservar o scroll vertical, animação acompanhando o dedo em tempo real via Reanimated, mola ao cancelar, resistência de 35% nas abas extremas e preview real das abas vizinhas montadas lado a lado (`tabs-context.tsx` + registry no `(tabs)/_layout.tsx`), com `pointerEvents="none"` e modo preview para evitar gestos aninhados e recursão — eliminando a área vazia no meio do movimento.
- **Dependências:** TF.7, TF.8, TF.9
- **Critérios de Aceitação:** Swipe troca de aba mostrando o conteúdo real da vizinha durante o movimento; scroll vertical continua funcionando; abas extremas resistem ao arrasto; nenhum crash de `PanGestureHandler`; `tsc`, `lint` e `jest` verdes.
- **Branch Sugerida:** `feature/swipe-pager-transition`

