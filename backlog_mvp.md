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