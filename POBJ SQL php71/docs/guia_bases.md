# Guia de dados do painel POBJ

Este documento descreve, de forma autoexplicativa, como cada uma das bases de dados (CSVs) deve ser preparada para alimentar o painel POBJ. A intenção é permitir que alguém sem contexto prévio consiga estruturar as tabelas no banco (ou gerar os CSVs) de forma consistente, garantindo que os filtros e as duas visões (cards e visão clássica) utilizem exatamente as mesmas referências.

## Backend PHP + MySQL

O painel deixou de consumir arquivos CSV diretamente e agora busca todas as bases em um banco MySQL hospedado no XAMPP. Em vez do servidor Node/Express, utilizamos um endpoint PHP (`POBJ SQL php71/config/api/index.php`) que roda dentro do Apache do próprio XAMPP. O arquivo devolve os mesmos conjuntos de dados que antes eram carregados dos CSVs.

1. Execute o script `docs/schema_mysql.sql` no schema `POBJ` (via DBeaver ou linha de comando) para criar/atualizar as tabelas.
2. Copie `POBJ SQL php71/config/.env.example` para `POBJ SQL php71/config/.env` (ou utilize um dos caminhos de fallback `POBJ SQL php71/.env`, `.env` na raiz ou `config/.env`) e informe host, porta, usuário e senha do MySQL utilizado no DBeaver.
3. Publique a pasta `POBJ SQL php71` dentro do diretório `htdocs` do XAMPP (ou crie um Virtual Host apontando para ela). O Apache servirá os arquivos estáticos (`index.html`, `script.js`, etc.) automaticamente.
4. O front-end chama `config/api/index.php?endpoint=bootstrap` para carregar todas as bases em uma única requisição e utiliza endpoints específicos para o módulo Omega (`endpoint=omega/statuses`, `endpoint=omega/structure`, etc.).
   - O backend procura automaticamente as tabelas pelas nomenclaturas originais dos CSVs (`d_mesu`, `fRealizados`, etc.) ou pelos nomes normalizados do script SQL (`d_unidades`, `f_realizados`, …). Caso algum nome não seja localizado, o endpoint indicará qual alias está faltando. Quando o banco utilizar nomes diferentes (por exemplo, vistas específicas), configure as variáveis `DB_TABLE_OMEGA_USERS`, `DB_TABLE_OMEGA_TICKETS`, `DB_TABLE_OMEGA_STATUSES` ou `DB_TABLE_OMEGA_STRUCTURE` no `.env` para apontar diretamente para cada tabela.

> 💡 Para validar a estrutura rapidamente em ambientes vazios, rode também o script [`docs/dados_exemplo.sql`](dados_exemplo.sql) depois de aplicar o `schema_mysql.sql`. Ele injeta um pequeno conjunto de registros interligados (metas, realizados, campanhas, leads, Omega, etc.) sem sobrescrever outros dados existentes — os `DELETE` direcionados do script removem apenas os registros de demonstração antes do `INSERT`.

## Convenções gerais

- **Codificação:** UTF-8 sem BOM.
- **Separador padrão:** ponto e vírgula (`;`) para fatos e dimensões maiores. `dProdutos.csv` usa vírgula (`,`) por ser exportado do Excel nesse formato. Ao migrar para SQL, utilize nomes de colunas em `snake_case`.
- **Datas:** usar o padrão ISO (`YYYY-MM-DD`). `competencia` representa o primeiro dia do mês de referência.
- **Calendário:** após criar as tabelas, execute o bloco `INSERT ... SELECT` do final do `schema_mysql.sql` para preencher a `d_calendario` de `2024-01-01` até 31 de dezembro do ano corrente. O script de dados de exemplo já cadastra todas as datas necessárias para os registros fictícios, mas em produção mantenha o calendário completo (o *event* diário incluído no schema repete automaticamente esse preenchimento).
- **Números:** utilizar ponto como separador decimal. Valores percentuais também são armazenados como `DECIMAL` (ex.: `99.4`).
- **IDs canônicos:**
  - `familia_id`, `id_indicador` e `id_subindicador` devem existir na dimensão `d_produtos` (ver seção abaixo).
  - `diretoria_id`, `gerencia_regional_id`, `agencia_id`, `gerente_gestao_id` e `gerente_id` devem existir na dimensão `mesu`.
  - Segmentar dados por `segmento_id` (`VAREJO`, `DR_EMPRESAS`, etc.) garante que cada cenário carregue apenas as famílias pertinentes.
- **Zeros x ausência:** indicadores sem venda devem aparecer com valor `0`. Apenas a família "Outros" é ocultada quando não existem linhas associadas.

## Dimensão de produtos (`Bases/dProdutos.csv` → tabela `d_produtos`)

Cada linha representa um indicador (card) e, opcionalmente, um subindicador. Os campos obrigatórios são:

| Campo | Tipo sugerido | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id_familia` | TINYINT | Sim | Código numérico da família (1=Captação, 2=Financeiro, etc.). |
| `familia` | VARCHAR(100) | Sim | Nome exibido da família (maiúsculas). |
| `familia_slug` | VARCHAR(100) | Sim | Identificador textual usado nos fatos (`captacao`, `clientes`, `credito`…). |
| `id_indicador` | VARCHAR(50) | Sim | Código canônico do indicador/card (slug). |
| `indicador` | VARCHAR(150) | Sim | Nome exibido do indicador. |
| `indicador_slug` | VARCHAR(150) | Sim | Sinônimo para consultas por slug; mantém compatibilidade com históricos antigos. |
| `id_subindicador` | VARCHAR(50) | Não (usar `0` quando não houver) | Código do subindicador associado ao indicador. |
| `subindicador` | VARCHAR(150) | Não | Nome exibido do subindicador. |
| `subindicador_slug` | VARCHAR(150) | Não | Slug do subindicador. |

Regras importantes:
- Para indicadores sem subindicador, preencher `id_subindicador` com `0` e deixar os demais campos em branco.
- Toda adição/alteração deve refletir os IDs utilizados nas bases de fatos. Isso garante que os cards não caiam em “Outros”.
- A dimensão de Empresas segue os mesmos campos, mas os slugs terminam com `_emp`. O front aplica a dimensão correta conforme o segmento selecionado.
- Os campos com sufixo `_slug` são as chaves normalizadas utilizadas para casar os fatos com os indicadores. Eles evitam divergências de acentuação/caixa e permitem que o front-end resolva filtros por nome amigável, código legado ou apelidos cadastrados.

## Dimensão de unidades (`Bases/mesu.csv` → tabela `d_unidades`)

Fornece a árvore hierárquica Segmento → Diretoria → Regional → Agência → Gestores. Campos:

| Campo | Tipo sugerido | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `segmento` | VARCHAR(100) | Sim | Nome legível do segmento (ex.: `Varejo`). |
| `segmento_id` | VARCHAR(50) | Sim | ID canônico (`VAREJO`, `DR_EMPRESAS`, …). |
| `diretoria_regional` | VARCHAR(150) | Sim | Nome da diretoria (exibir como `DR 03 – Sul & Centro-Oeste`). |
| `diretoria_id` | VARCHAR(50) | Sim | Código oficial da diretoria (`DR 03`, `DR EMPRESAS`, …). |
| `gerencia_regional` | VARCHAR(150) | Sim | Nome da regional (ex.: `Regional Goiânia`). |
| `gerencia_regional_id` | VARCHAR(50) | Sim | Código oficial (`GR 07`, `8684`, …). |
| `agencia` | VARCHAR(150) | Sim | Nome da agência (ex.: `Goiânia Setor Bueno`). |
| `agencia_id` | VARCHAR(50) | Sim | ID da agência na MESU. |
| `agencia_codigo` | VARCHAR(50) | Sim | Código numérico exibido (pode ser igual ao ID). |
| `gerente_gestao` | VARCHAR(150) | Não | Nome do gerente de gestão associado à agência. |
| `gerente_gestao_id` | VARCHAR(50) | Não | Código do gerente de gestão. |
| `gerente` | VARCHAR(150) | Não | Nome do gerente responsável. |
| `gerente_id` | VARCHAR(50) | Não | Código do gerente responsável. |

Recomendações:
- Cada combinação `segmento_id + diretoria_id + gerencia_regional_id + agencia_id` deve ser única.
- O texto exibido nos filtros concatena código e nome (ex.: `DR 03 – Sul & Centro-Oeste`). Garanta que as colunas reflitam exatamente o que será exibido.

## Base de status dos indicadores (`Bases/Status_Indicadores.csv` → tabela `d_status_indicadores`)

| Campo | Tipo sugerido | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `status` | VARCHAR(50) | Sim | Nome que aparecerá no filtro. |
| `id` | VARCHAR(20) | Sim | Código/ordem do status (ex.: `01`=Atingido, `02`=Não Atingido, `03`=Todos). |

A aplicação converte automaticamente sinônimos (ex.: `Nao Atingidos`). Mantenha pelo menos os três estados oficiais (`Atingido`, `Não Atingido`, `Todos`) com IDs estáveis para que os filtros carreguem corretamente.

## Fato de realizados (`Bases/fRealizados.csv` → tabela `f_realizados`)

Cada linha representa um realizado (venda, volume ou percentual) em um determinado dia e unidade.

| Campo | Tipo sugerido | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `registro_id` | VARCHAR(60) | Sim | Identificador único da linha. |
| `segmento` | VARCHAR(100) | Sim | Nome do segmento. |
| `segmento_id` | VARCHAR(50) | Sim | ID canônico do segmento. |
| `diretoria_id` | VARCHAR(50) | Sim | Código da diretoria (deve existir na MESU). |
| `diretoria_nome` | VARCHAR(150) | Sim | Nome legível da diretoria. |
| `gerencia_regional_id` | VARCHAR(50) | Sim | Código da regional. |
| `gerencia_regional_nome` | VARCHAR(150) | Sim | Nome da regional. |
| `regional_nome` | VARCHAR(150) | Sim | Alias exibido da regional (geralmente igual ao campo anterior). |
| `agencia_id` | VARCHAR(50) | Sim | Código da agência. |
| `agencia_nome` | VARCHAR(150) | Sim | Nome da agência. |
| `agencia_codigo` | VARCHAR(50) | Sim | Código numérico exibido nos cards/tabela. |
| `gerente_gestao_id` | VARCHAR(50) | Não | Código do gerente de gestão. |
| `gerente_gestao_nome` | VARCHAR(150) | Não | Nome do gerente de gestão. |
| `gerente_id` | VARCHAR(50) | Não | Código do gerente responsável. |
| `gerente_nome` | VARCHAR(150) | Não | Nome do gerente responsável. |
| `familia_id` | VARCHAR(20) | Sim | Slug da família (ex.: `clientes`). |
| `familia_nome` | VARCHAR(150) | Sim | Nome legível da família. |
| `id_indicador` | VARCHAR(80) | Sim | Código do indicador/card (ex.: `bradesco_expresso`). |
| `ds_indicador` | VARCHAR(150) | Sim | Nome do indicador/card. |
| `subproduto` | VARCHAR(150) | Não | Nome do subindicador (se existir). |
| `id_subindicador` | VARCHAR(80) | Não | Código do subindicador (usar `0` se não existir). |
| `status_id` | VARCHAR(20) | Não | Código do status (deve existir em `d_status_indicadores`). |
| `carteira` | VARCHAR(150) | Não | Nome da carteira de origem. |
| `canal_venda` | VARCHAR(150) | Não | Canal de venda (`Agência física`, `Correspondente` etc.). |
| `tipo_venda` | VARCHAR(100) | Não | Tipo de abordagem (`Venda direta`, `Pós-venda`…). |
| `modalidade_pagamento` | VARCHAR(100) | Não | Modalidade (`À vista`, `Parcelado` etc.). |
| `data` | DATE | Sim | Data do movimento. |
| `competencia` | DATE | Sim | Primeiro dia do mês (derivado automaticamente quando ausente). |
| `realizado_mensal` | DECIMAL(18,2) | Sim | Valor realizado no mês (ou percentual). |
| `realizado_acumulado` | DECIMAL(18,2) | Não | Valor acumulado até a data (fallback para mensal quando vazio). |
| `quantidade` | INT | Não | Contagem de operações associadas. |
| `variavel_real` | DECIMAL(18,2) | Não | Valor de variável pago no período. |
| `familia_codigo` | VARCHAR(20) | Não | Código legado da família (opcional; usado para mapeamentos). |
| `indicador_codigo` | VARCHAR(20) | Não | Código legado do indicador. |
| `subindicador_codigo` | VARCHAR(20) | Não | Código legado do subindicador. |

### Regras de consistência
- `registro_id` deve ser único por tabela.
- `segmento_id` determina qual dimensão de produtos será utilizada (Varejo ou Empresas).
- Todos os IDs devem bater com a MESU (`diretoria_id`, `gerencia_regional_id`, `agencia_id`) e com `d_produtos` (`id_indicador`, `id_subindicador`).
- Utilize `status_id` para classificar o atingimento (`atingido`, `não atingido`, etc.) conforme a dimensão `d_status_indicadores`; o front-end usa esse campo para filtrar os cards.
- Cadastre previamente na `d_calendario` as datas do movimento e os respectivos primeiros dias do mês para evitar violações de chave estrangeira ao carregar `data` e `competencia`.

## Fato de detalhes (`f_detalhes`)

Guarda o detalhamento exibido ao expandir um realizado (contratos, operações unitárias, cancelamentos). Sempre relacione cada linha a um `registro_id` existente em `f_realizados`.

| Campo | Tipo sugerido | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `contrato_id` | VARCHAR(80) | Sim | Identificador único do contrato/operação (exibido na tabela de detalhes). |
| `registro_id` | VARCHAR(60) | Sim | Chave do realizado pai. Deve existir em `f_realizados`. |
| `segmento_id` / `diretoria_id` / `gerencia_regional_id` / `agencia_id` | VARCHAR | Sim | Mesmo mapeamento hierárquico das demais fatos (referenciam `d_unidades`). |
| `id_indicador` / `id_subindicador` | VARCHAR | Sim | Indicador e subindicador associados (referenciam `d_produtos`). |
| `valor_meta` / `valor_realizado` | DECIMAL | Não | Distribuição da meta/realizado do contrato. Somatório deve acompanhar o realizado. |
| `quantidade` | DECIMAL | Não | Quantidade de itens/negócios. |
| `peso` / `pontos` | DECIMAL | Não | Peso/pontuação atribuída ao contrato para cálculo de atingimento. |
| `data` / `competencia` | DATE | Sim | Datas do movimento (devem existir em `d_calendario`). |
| `data_vencimento` / `data_cancelamento` | DATE | Não | Datas relevantes do contrato. |
| `motivo_cancelamento` | VARCHAR | Não | Texto livre com a justificativa do cancelamento. |
| `status_id` | VARCHAR(20) | Não | Código do status (mesma dimensão `d_status_indicadores`). |

> 🔗 **Relacionamentos**: além de `registro_id`, utilize as mesmas chaves de unidade/indicador dos realizados para manter os filtros consistentes.

## Fato de metas (`Bases/fMetas.csv` → tabela `f_metas`)

Mesma estrutura de chaves de `f_realizados`, substituindo os valores por metas.

| Campo | Tipo sugerido | Obrigatório | Descrição |
| --- | --- | --- | --- |
| *Chaves de localização* | | | repetir os campos `registro_id` até `modalidade_pagamento` conforme `f_realizados`. |
| `data` | DATE | Sim | Data de referência da meta. |
| `competencia` | DATE | Sim | Primeiro dia do mês da meta. |
| `meta_mensal` | DECIMAL(18,2) | Sim | Meta do mês. |
| `meta_acumulada` | DECIMAL(18,2) | Não | Meta acumulada. |
| `variavel_meta` | DECIMAL(18,2) | Não | Variável planejada. |
| `peso` | DECIMAL(9,4) | Não | Peso do indicador para cálculo de desempenho. |
| `familia_codigo`/`indicador_codigo`/`subindicador_codigo` | VARCHAR(20) | Não | Códigos legados para rastreabilidade. |

## Fato de variável (`Bases/fVariavel.csv` → tabela `f_variavel`)

Registra o planejamento x realizado da variável de remuneração por indicador.

| Campo | Tipo sugerido | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `registro_id` | VARCHAR(60) | Sim | Identificador único. |
| `id_indicador` | VARCHAR(80) | Sim | Código do indicador. |
| `ds_indicador` | VARCHAR(150) | Sim | Nome do indicador. |
| `familia_id` | VARCHAR(20) | Sim | Slug da família. |
| `familia_nome` | VARCHAR(150) | Sim | Nome da família. |
| `data` | DATE | Sim | Data da medição. |
| `competencia` | DATE | Sim | Primeiro dia do mês. |
| `variavel_meta` | DECIMAL(18,2) | Não | Variável prevista. |
| `variavel_real` | DECIMAL(18,2) | Não | Variável realizada. |
| `id_subindicador` | VARCHAR(80) | Não | Código do subindicador (usar `0` para inexistente). |
| `familia_codigo`/`indicador_codigo`/`subindicador_codigo` | VARCHAR(20) | Não | Códigos legados para compatibilização. |

## Fato de campanhas (`Bases/fCampanhas.csv` → tabela `f_campanhas`)

Usado na aba de campanhas com filtros por unidade e indicador.

| Campo | Tipo sugerido | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `campanha_id` | VARCHAR(60) | Sim | Identificador único da campanha. |
| `sprint_id` | VARCHAR(60) | Sim | Código da sprint. |
| `diretoria_id` | VARCHAR(50) | Sim | Código da diretoria (MESU). |
| `diretoria_nome` | VARCHAR(150) | Sim | Nome da diretoria. |
| `gerencia_regional_id` | VARCHAR(50) | Sim | Código da regional (MESU). |
| `regional_nome` | VARCHAR(150) | Sim | Nome da regional. |
| `agencia_id` | VARCHAR(50) | Sim | ID da agência (MESU). |
| `agencia_codigo` | VARCHAR(50) | Sim | Código numérico exibido. |
| `agencia_nome` | VARCHAR(150) | Sim | Nome da agência. |
| `gerente_gestao` | VARCHAR(50) | Não | Código do gerente de gestão. |
| `gerente_gestao_nome` | VARCHAR(150) | Não | Nome do gerente de gestão. |
| `gerente` | VARCHAR(50) | Não | Código do gerente. |
| `gerente_nome` | VARCHAR(150) | Não | Nome do gerente. |
| `segmento` | VARCHAR(100) | Sim | Segmento associado. |
| `segmento_id` | VARCHAR(50) | Sim | ID do segmento (MESU). |
| `familia_id` | VARCHAR(20) | Sim | Slug da família. |
| `id_indicador` | VARCHAR(80) | Sim | Código do indicador. |
| `ds_indicador` | VARCHAR(150) | Sim | Nome do indicador. |
| `subproduto` | VARCHAR(150) | Não | Nome do subindicador. |
| `id_subindicador` | VARCHAR(80) | Não | Código do subindicador. |
| `carteira` | VARCHAR(150) | Não | Carteira segmentada. |
| `linhas` | DECIMAL(18,2) | Não | Meta de linhas (quando aplicável). |
| `cash` | DECIMAL(18,2) | Não | Meta de cash. |
| `conquista` | DECIMAL(18,2) | Não | Meta de conquista. |
| `atividade` | VARCHAR(100) | Não | Indicador de atividade (`Sim`/`Não`). |
| `data` | DATE | Sim | Data da campanha. |
| `familia_codigo`/`indicador_codigo`/`subindicador_codigo` | VARCHAR(20) | Não | Códigos legados. |

> 🔗 **Relacionamentos**: `segmento_id`, `diretoria_id`, `gerencia_regional_id` e `agencia_id` devem bater com a dimensão `d_unidades`. A coluna `data` precisa existir em `d_calendario`, e `id_indicador`/`id_subindicador` referenciam `d_produtos`.

## Dimensão de calendário (`Bases/dCalendario.csv` → tabela `d_calendario`)

| Campo | Tipo sugerido | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `data` | DATE | Sim | Dia do calendário. |
| `competencia` | DATE | Sim | Primeiro dia do mês correspondente. |
| `ano` | INT | Sim | Ano. |
| `mes` | TINYINT | Sim | Mês numérico (1-12). |
| `mes_nome` | VARCHAR(20) | Sim | Nome do mês em português. |
| `dia` | TINYINT | Sim | Dia do mês. |
| `dia_da_semana` | VARCHAR(20) | Sim | Nome do dia da semana. |
| `semana` | TINYINT | Sim | Semana do ano. |
| `trimestre` | TINYINT | Sim | Trimestre (1-4). |
| `semestre` | TINYINT | Sim | Semestre (1-2). |
| `eh_dia_util` | TINYINT(1) | Sim | 1 se dia útil, 0 caso contrário. |

## Leads propensos (`Bases/leads_propensos.csv` → tabela `f_leads_propensos`)

| Campo | Tipo sugerido | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `database` | DATE | Sim | Data de snapshot do lead. |
| `nome_empresa` | VARCHAR(200) | Sim | Nome da empresa. |
| `cnae` | VARCHAR(20) | Não | CNAE informado. |
| `segmento_cliente` | VARCHAR(100) | Não | Segmento associado ao lead. |
| `segmento_cliente_id` | VARCHAR(50) | Não | ID do segmento (MESU). |
| `produto_propenso` | VARCHAR(150) | Sim | Produto com maior propensão. |
| `familia_produto_propenso` | VARCHAR(150) | Sim | Família do produto. |
| `secao_produto_propenso` | VARCHAR(150) | Não | Seção macro. |
| `id_indicador` | VARCHAR(80) | Não | Código do indicador relacionado (deve existir em `d_produtos`). |
| `id_subindicador` | VARCHAR(80) | Não | Código do subindicador (`0` quando inexistente). |
| `data_contato` | DATE | Não | Data do contato recente. |
| `comentario` | TEXT | Não | Observações de atendimento. |
| `responsavel_contato` | VARCHAR(150) | Não | Nome do responsável. |
| `diretoria_cliente` | VARCHAR(150) | Não | Diretoria da empresa cliente. |
| `diretoria_cliente_id` | VARCHAR(50) | Não | Código da diretoria. |
| `regional_cliente` | VARCHAR(150) | Não | Regional do cliente. |
| `regional_cliente_id` | VARCHAR(50) | Não | Código da regional. |
| `agencia_cliente` | VARCHAR(150) | Não | Agência do cliente. |
| `agencia_cliente_id` | VARCHAR(50) | Não | Código da agência. |
| `gerente_gestao_cliente` | VARCHAR(150) | Não | Gerente de gestão responsável. |
| `gerente_gestao_cliente_id` | VARCHAR(50) | Não | Código do gerente de gestão. |
| `gerente_cliente` | VARCHAR(150) | Não | Gerente responsável. |
| `gerente_cliente_id` | VARCHAR(50) | Não | Código do gerente responsável. |
| `credito_pre_aprovado` | DECIMAL(18,2) | Não | Valor de crédito pré-aprovado. |
| `origem_lead` | VARCHAR(50) | Não | Fonte do lead (`smart`, etc.). |

> 🔗 **Relacionamentos**: utilize os campos de unidade (`segmento_cliente_id`, `diretoria_cliente_id`, `regional_cliente_id`, `agencia_cliente_id`) para apontar para a dimensão `d_unidades`, os IDs de produtos (`id_indicador`, `id_subindicador`) para `d_produtos` e cadastre todas as datas correspondentes em `d_calendario` (`database`, `data_contato`).

## Histórico de ranking POBJ (`Bases/FHistoricoRankingPobj.csv` → tabela `f_historico_ranking_pobj`)

| Campo | Tipo sugerido | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `nivel` | VARCHAR(30) | Sim | Nível do ranking (`Diretoria`, `Regional`, etc.). |
| `ano` | INT | Sim | Ano de referência. |
| `database` | DATE | Sim | Data do snapshot (geralmente final do ano). |
| `segmento` | VARCHAR(100) | Não | Segmento de atuação. |
| `segmento_id` | VARCHAR(50) | Não | ID do segmento. |
| `diretoria` | VARCHAR(50) | Não | Código da diretoria. |
| `diretoria_nome` | VARCHAR(150) | Não | Nome da diretoria. |
| `gerencia_regional` | VARCHAR(50) | Não | Código da regional. |
| `gerencia_regional_nome` | VARCHAR(150) | Não | Nome da regional. |
| `agencia` | VARCHAR(50) | Não | Código da agência. |
| `agencia_nome` | VARCHAR(150) | Não | Nome da agência. |
| `agencia_codigo` | VARCHAR(50) | Não | Código exibido da agência. |
| `gerente_gestao` | VARCHAR(50) | Não | Código do gerente de gestão. |
| `gerente_gestao_nome` | VARCHAR(150) | Não | Nome do gerente de gestão. |
| `gerente` | VARCHAR(50) | Não | Código do gerente. |
| `gerente_nome` | VARCHAR(150) | Não | Nome do gerente. |
| `participantes` | INT | Não | Quantidade de participantes na faixa. |
| `rank` | INT | Não | Posição no ranking. |
| `pontos` | DECIMAL(18,2) | Não | Pontuação obtida. |
| `realizado` | DECIMAL(18,2) | Não | Percentual/valor realizado. |
| `meta` | DECIMAL(18,2) | Não | Meta atribuída. |

> 🔗 **Relacionamentos**: `segmento_id`, `diretoria`, `gerencia_regional` e `agencia` devem existir em `d_unidades`; a coluna `database` precisa constar no `d_calendario`.

## Omega – tabelas auxiliares

O módulo Omega deixou de consumir os CSVs `Bases/dStatus.csv`, `Bases/dEstruturaChamados.csv`, `Bases/omega_usuarios.csv` e `Bases/omega_chamados.csv`. As informações agora residem em quatro tabelas dedicadas. Caso o seu banco adote um prefixo (por exemplo, `POBJ_omega_usuarios`), declare o valor em `DB_TABLE_PREFIX` no arquivo `.env` para que a API PHP reconheça automaticamente os nomes reais.

### Catálogo de status (`omega_status`)

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | VARCHAR(40) | Sim | Identificador canônico do status (slug). |
| `label` | VARCHAR(100) | Sim | Nome exibido na interface. |
| `tone` | VARCHAR(20) | Não | Tom visual (`neutral`, `progress`, `warning`, `danger`, ...). |
| `descricao` | VARCHAR(255) | Não | Texto explicativo exibido no hover. |
| `ordem` | INT | Não | Ordenação personalizada (menor primeiro). |
| `departamento_id` | VARCHAR(20) | Não | Departamento responsável (compatível com `omega_departamentos`). |

### Estrutura de filas e tipos (`omega_departamentos`)

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `departamento` | VARCHAR(120) | Sim | Nome da fila (Encarteiramento, Metas, etc.). |
| `departamento_id` | VARCHAR(30) | Sim | ID usado para integrações externas e relacionamento com `omega_status`/`omega_chamados`. |
| `ordem_departamento` | INT | Não | Ordem de exibição das filas. |
| `tipo` | VARCHAR(120) | Sim | Tipo de chamado dentro da fila. |
| `ordem_tipo` | INT | Não | Ordem de exibição dos tipos. |

### Usuários (`omega_usuarios`)

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | VARCHAR(40) | Sim | Identificador único (mesmo dos CSVs antigos). |
| `nome` | VARCHAR(150) | Sim | Nome completo. |
| `funcional` / `matricula` | VARCHAR(20) | Não | Matrícula/funcional para exibição e filtros. |
| `cargo` | VARCHAR(150) | Não | Cargo principal. |
| `usuario` / `analista` / `supervisor` / `admin` | TINYINT(1) | Sim | Flags de perfil (1 = verdadeiro). |
| `encarteiramento` / `meta` / `orcamento` / `pobj` / `matriz` / `outros` | TINYINT(1) | Não | Acesso às filas específicas. |

### Chamados (`omega_chamados`)

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | VARCHAR(60) | Sim | Número do chamado. |
| `subject` | VARCHAR(255) | Não | Assunto exibido. |
| `company` | VARCHAR(200) | Não | Cliente solicitante. |
| `product_id` / `product_label` | VARCHAR | Não | Código e nome do produto associado. |
| `family` / `section` | VARCHAR | Não | Família e seção do indicador. |
| `queue` | VARCHAR(120) | Não | Fila/Departamento (compatível com `omega_departamentos`). |
| `category` | VARCHAR(120) | Não | Tipo dentro da fila. |
| `status` | VARCHAR(40) | Não | Status atual (compatível com `omega_status`). |
| `priority` | VARCHAR(40) | Não | Prioridade (`baixa`, `media`, `alta`, `critica`). |
| `opened` / `updated` / `due_date` | DATETIME | Não | Datas de abertura, última atualização e prazo. |
| `requester_id` / `owner_id` / `team_id` | VARCHAR(60) | Não | Identificadores do solicitante, responsável e time. |
| `history` | LONGTEXT | Não | Histórico concatenado (`data::usuario::ação::comentário::status` separados por `||`). |
| `diretoria` / `gerencia` / `agencia` / `gerente_gestao` / `gerente` | VARCHAR | Não | Contexto MESU associado ao chamado. |
| `credit` | VARCHAR(100) | Não | Campo livre para crédito. |
| `attachment` | VARCHAR(255) | Não | Referência a anexos (URL ou caminho). |

> 🔗 **Relacionamentos**: `status` deve existir em `omega_status`, `team_id` (e também `queue` quando você reutiliza a mesma sigla) precisa estar cadastrado em `omega_departamentos`, enquanto `requester_id` e `owner_id` apontam para `omega_usuarios`.

O front-end consome essas tabelas via chamadas `config/api/index.php?endpoint=omega/statuses`, `...=omega/structure`, `...=omega/users` e `...=omega/tickets`.

### Visões salvas do detalhamento

Enquanto o front-end mantém a configuração das colunas em `localStorage`, a alternativa ideal para produção é persistir as escolhas em uma tabela dedicada (`omega_detail_views`). A estrutura sugerida inclui:

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | BIGINT (PK) | Identificador sequencial. |
| `user_id` | VARCHAR(40) | Mesmo ID da tabela `omega_usuarios`; define o dono da visão. |
| `nome` | VARCHAR(120) | Nome da visão salvo pelo usuário (ex.: "Indicadores de crédito"). |
| `colunas` | JSON | Array com a lista ordenada de colunas (`["contrato", "valor_meta", ...]`). |
| `padrao` | TINYINT(1) | Marca a visão como padrão do usuário. |
| `criado_em` / `atualizado_em` | DATETIME | Controle de auditoria. |

Ao carregar o detalhamento, o backend pode retornar as visões gravadas para o usuário autenticado. O front-end já consegue reconciliar a visão ativa com o retorno da API — basta substituir a leitura do `localStorage` por uma chamada a `config/api/index.php?endpoint=omega/detailViews&user=<id>`. Para salvar, exponha um `POST` que receba `{ nome, colunas }` e grave a linha na tabela, garantindo um limite de cinco registros por usuário (o mesmo limite aplicado na interface).

### Histórico (linha do tempo)

Para alimentar a linha do tempo exibida na Omega, registre cada transição em uma tabela de histórico (`omega_chamados_historico`). Utilize uma linha por evento com os campos `ticket_id`, `data`, `autor_id`, `acao`, `comentario`, `status_destino` e, opcionalmente, um `json` com anexos. Sempre que o status ou a prioridade mudar, insira um novo registro mantendo os anteriores intactos — isso permite reconstruir toda a jornada do chamado sem sobrescrever eventos antigos. A API atual já aceita o histórico serializado em `omega_chamados.history`; ao migrar para a tabela dedicada, basta ajustar o endpoint para retornar a junção (`SELECT ... FROM omega_chamados LEFT JOIN omega_chamados_historico ... ORDER BY data`).

## Como manter os filtros sincronizados

1. **Segmento (dropdown principal)**
   - Adicionar a opção desejada em `SEGMENT_SCENARIO_PRESETS` (arquivo `script.js`).
   - Informar `scenario` (`"varejo"` ou `"empresas"`) para apontar a dimensão correta.
   - Garantir que existam linhas na MESU (`segmento_id`) e nas bases de fatos usando o mesmo ID.

2. **Diretorias / Regionais / Agências**
   - Toda nova unidade deve ser inserida em `mesu.csv` com os códigos oficiais.
   - As bases de fatos (`f_realizados`, `f_metas`, `f_variavel`, `f_campanhas`) precisam utilizar exatamente os mesmos IDs.
   - Para ocultar uma unidade, remova ou ajuste a linha correspondente na MESU e nas tabelas de fatos.

3. **Famílias, indicadores e subindicadores**
   - Inclua novos registros em `dProdutos.csv`, preenchendo os slugs que serão usados pelos fatos.
   - Atualize (ou acrescente) as linhas nas tabelas de fatos com os novos `id_indicador`/`id_subindicador`.
   - Se o indicador não possui subindicador, mantenha `id_subindicador = 0`.

4. **Status dos indicadores**
   - Altere `Status_Indicadores.csv` para adicionar, remover ou reordenar opções.
   - Utilize os IDs numéricos para controlar a ordenação no dropdown.

5. **Filtros de período**
   - A dimensão `dCalendario.csv` deve conter todas as datas que os fatos contemplam. Sem ela, o painel usa as datas presentes nos fatos.

6. **Outros filtros avançados**
   - Leads, campanhas e ranking utilizam suas próprias bases. Sempre alinhe os códigos (`diretoria`, `gerencia_regional`, etc.) com a MESU para permitir drill-down consistente.

Seguindo as regras acima, qualquer fonte de dados (CSV ou MySQL) poderá ser plugada sem ajustes adicionais no código.

## Perguntas frequentes

**Como registrar cancelamentos?**
: Utilize o `status_id` da linha em `f_realizados` para classificar o atingimento (`01`=Atingido, `02`=Não Atingido, `03`=Todos) e detalhe o cancelamento em `f_detalhes` preenchendo `data_cancelamento`, `motivo_cancelamento` e o `status_id` correspondente. O front-end espera valores positivos nas métricas (`realizado`, `meta`, `variavel_real`), portanto mantenha os números sem sinal negativo e deixe a interpretação (cancelado, não atingido) a cargo dos campos de status e das datas. Caso seja necessário destacar a dedução no painel, cadastre uma linha adicional em `f_detalhes` com o mesmo `registro_id`, `status_id = '02'` e os pontos/peso ajustados.

**O painel aguenta 22 milhões de linhas?**
: O frontend só consome os dados já agregados por unidade/indicador e período. Para manter a navegação fluida com bases muito volumosas, mantenha as tabelas fato particionadas por data, utilize os índices listados no [`schema_mysql.sql`](schema_mysql.sql) e alimente tabelas materializadas (ou visões de resumo) de madrugada — o mesmo fluxo previsto pelo *event* diário que recalcula o calendário. Assim, a API PHP retorna apenas os totais do dia/competência selecionados, evitando transferir milhões de registros para o navegador.

**Para que servem os campos *_slug* em `d_produtos`?**
: Os slugs são chaves normalizadas (sem acento e com letras minúsculas) utilizadas para casar as tabelas fato com os indicadores. Eles permitem que o painel reconheça um indicador tanto pelo nome amigável quanto por códigos legados e apelidos, garantindo filtros consistentes mesmo quando o CSV/SQL usa grafias diferentes. Consulte a tabela de `d_produtos` no início deste guia para a lista completa dos campos obrigatórios.

## Passo a passo para montar o banco no MySQL (exemplo com DBeaver)

1. **Criar (ou selecionar) o schema**
   - Abra o DBeaver, conecte-se ao servidor MySQL e crie (ou selecione) o database `POBJ`.
   - Execute o arquivo [`docs/schema_mysql.sql`](schema_mysql.sql) pelo editor SQL do DBeaver. O script já contém o `CREATE DATABASE` (idempotente), o `USE POBJ` e toda a DDL das tabelas. Reexecute sempre que precisar recriar o ambiente de testes.

2. **Importar as dimensões primeiro**
   - Utilize o assistente *Data Transfer → Import From CSV* do DBeaver para carregar `Bases/dProdutos.csv`, `Bases/mesu.csv`, `Bases/Status_Indicadores.csv` e, se aplicável, `Bases/dCalendario.csv`.
   - Garanta que o separador está correto (`;` para MESU, `,` para dProdutos) e marque a opção “Tratar primeira linha como cabeçalho”.

3. **Carregar as tabelas de fatos**
   - Repita o processo para `f_realizados.csv`, `f_metas.csv`, `f_variavel.csv` e demais fatos (`f_campanhas.csv`, `FLeadsPropensos.csv`, `FHistoricoRankingPobj.csv`).
   - Caso a importação acuse erro de chave estrangeira, confirme se os IDs referenciados já existem nas dimensões. Corrija no CSV antes de tentar novamente ou desative temporariamente as FKs (opção “Disable foreign keys” no assistente) e depois sane os registros inconsistentes.

4. **Validar a carga**
   - Rode consultas simples para conferir contagens e amostras, por exemplo: `SELECT COUNT(*) FROM f_realizados;`, `SELECT DISTINCT diretoria_id FROM d_unidades WHERE segmento_id = 'DR_EMPRESAS';`.
   - Compare com os CSVs originais para assegurar que nenhuma coluna ficou nula ou com formato incorreto (datas como `0000-00-00`, valores com vírgula, etc.).

5. **Atualizações futuras**
   - Ao receber novos arquivos oficiais, substitua os registros usando `TRUNCATE TABLE <nome>;` seguido da importação ou utilize *Import → Truncate target table* no DBeaver.
   - Sempre mantenha as tabelas de dimensão alinhadas antes de inserir fatos, garantindo que os filtros da aplicação reflitam os mesmos códigos.
