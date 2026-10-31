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

## Performance e Eficiência

Toda implementação deve considerar desempenho, escalabilidade e eficiência arquitetural.

### Diretrizes Gerais

- **Evite renderizações desnecessárias** e atualizações excessivas de estado.
- **Evite requisições redundantes** e carregamento desnecessário de dados.
- **Utilize carregamento assíncrono**, cache e paginação quando apropriado.
- **Evite operações pesadas** na thread principal.
- **Priorize carregamento sob demanda** para dados que não precisam estar disponíveis imediatamente.
- **Preserve a responsividade da interface**, garantindo feedback visual (como spinners ou haptics) durante operações assíncronas.

### Banco de Dados e Consultas

- **Otimize consultas ao banco de dados** e certifique-se da utilização de índices quando necessário.

### Análise e Validação

- **Evite otimizações prematuras:** identifique gargalos reais antes de modificar o código.
- **Investigue a causa raiz** ao corrigir problemas de desempenho, e não apenas os sintomas.
- **Avalie possíveis gargalos ou regressões** antes de concluir qualquer tarefa.
- **Valide os resultados** por meio de testes, medições ou comparações antes/depois sempre que aplicável.
