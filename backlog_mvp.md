# LiftRank — Backlog MVP

## ✅ Concluído (v1.0.0)

### Setup e Infraestrutura

- [x] Scaffold do projeto Expo (TypeScript + expo-router)
- [x] Instalar dependências (expo-sqlite, date-fns, expo-haptics, eslint)
- [x] Configurar tema dark forçado no app.json (splash, ícone adaptativo)
- [x] Paleta dark centralizada em `src/constants/theme.ts` (accent #C6F24E)

### Camada de Dados

- [x] Schema SQLite com versionamento (`PRAGMA user_version`) — exercises, plan, sessions, sets, cardio
- [x] Migração inicial + seed de 27 exercícios (musculação e cardio)
- [x] Camada de repositórios isolada (`src/db/repo.ts`) pronta para trocar por API/cloud depois
- [x] Hook genérico `useQuery` com refetch automático ao focar na tela

### Telas

- [x] **Hoje** — registro rápido de séries (peso/reps) e cardio, pré-preenchimento com último peso, resumo do dia (volume/reps/cardio)
- [x] **Plano** — treinos por dia da semana, adicionar/remover exercícios, criar exercícios novos, destaque no dia atual
- [x] **Histórico** — lista de sessões por data, detalhe expandido com séries por exercício, apagar treino
- [x] **Stats** — filtro Dia/Semana/Mês/Tudo, cards de volume/reps/cardio/treinos, gráfico de barras (14 dias), ranking de volume por exercício

### UI/UX

- [x] Navegação bottom tabs customizada (4 abas)
- [x] Componentes base: Chip, PrimaryButton, Segmented, StatCard, TextField
- [x] Feedback háptico nos registros e exclusões

### Qualidade

- [x] Typecheck limpo (`tsc --noEmit`)
- [x] ESLint limpo (`eslint src --max-warnings 0`)
- [x] Bundle Android validado (`expo export`)

---

## 🔜 Próximos Passos (ideias já mapeadas)

### Escala / Mercado

- [ ] Sync cloud (Supabase ou similar) — a camada de repositório já isola isso
- [ ] Login multiusuário
- [ ] Export/backup dos dados

### Produto

- [ ] Gráficos de evolução por exercício (progressão de carga ao longo do tempo)
- [ ] Marcação de PR (recorde pessoal) por exercício
- [ ] Timer de descanso entre séries
- [ ] Editar série registrada (hoje só exclui e refaz)
- [ ] Múltiplos treinos por dia (atualmente 1 sessão por data)

### Produção

- [ ] Build de produção via EAS (`eas build`)
- [ ] Publicação nas stores (Apple/Google)
- [ ] Atualizações OTA (`eas update`)


### Implementações / melhorias

- [x] Pergunta de confirmação do botão "Apagar" em histórico /feature ajuste-botao-excluir