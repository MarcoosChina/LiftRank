# Diretrizes de Desenvolvimento e Git

## Regra de Criação de Branches

Para qualquer ação solicitada (nova funcionalidade, correção de bug, refatoração ou tarefa administrativa), é obrigatório criar uma branch isolada.

### Fluxo de Trabalho Obrigatório

1. **Nunca** sugira ou faça alterações diretas nas branches principais (`main`, `master`, `develop`).
2. Antes de apresentar qualquer alteração ou arquivo de código, forneça explicitamente o comando para criar e alternar para a nova branch:

   ```bash
   git checkout -b <nome-da-branch>
   ```

### Padrão de Nomenclatura de Branches

Utilize letras minúsculas e separe as palavras por hífen (kebab-case), seguindo os prefixos abaixo:

- **feature/** para novas funcionalidades (ex: `feature/autenticacao-oauth`)
- **bugfix/** para correções de erros (ex: `bugfix/correcao-login-mobile`)
- **chore/** para tarefas de manutenção, config ou documentação (ex: `chore/atualizar-dependencias`)
- **refactor/** para melhorias de código sem alteração de comportamento (ex: `refactor/limpeza-da-api`)
