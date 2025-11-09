# Backend PHP e configurações locais

Esta pasta concentra os arquivos necessários para expor o painel via Apache/PHP
(que já acompanha o XAMPP) e as configurações sensíveis do ambiente, como o
arquivo `.env` com as credenciais do MySQL. Todos os ícones utilizados pelo
painel foram convertidos para SVG a fim de evitar o erro "Arquivos binários não
são compatíveis" em ferramentas que não aceitam anexos binários.

## Como preparar o ambiente

1. Garanta que o Apache e o MySQL estejam ativos no XAMPP.
2. Execute o script `docs/schema_mysql.sql` dentro do schema `POBJ` para criar
   ou atualizar as tabelas.
3. Copie `config/.env.example` para `config/.env` (ou para um dos caminhos de
   fallback listados abaixo) e preencha com os dados do banco utilizado no
   DBeaver. Caso as tabelas do painel possuam um prefixo padrão (ex.: `POBJ_`),
   informe-o na variável `DB_TABLE_PREFIX` — a API concatenará o valor
   automaticamente ao procurar pelos nomes `omega_usuarios`, `omega_chamados`
   e demais alias utilizados pelo painel. Se algum nome fugir do padrão
   esperado, utilize as variáveis `DB_TABLE_OMEGA_USERS`, `DB_TABLE_OMEGA_TICKETS`,
   `DB_TABLE_OMEGA_STATUSES` ou `DB_TABLE_OMEGA_STRUCTURE` para informar
   explicitamente o nome da tabela correspondente.

   > 🔐 **Agente de IA:** ainda nesse arquivo `.env`, informe a variável
   > `OPENAI_API_KEY` com a chave do projeto (copie/cole somente no backend).
   > O JavaScript nunca tem acesso direto a esse valor — o front envia as
   > perguntas para `config/api/index.php?endpoint=agent`, que lê a chave via
   > `pobj_env()` e faz a chamada na API do provedor. Opcionalmente você pode
   > ajustar `OPENAI_MODEL` e `OPENAI_EMBED_MODEL` para trocar os modelos
   > utilizados nas respostas e na indexação dos documentos. Depois de salvar
   > o `.env`, reinicie o Apache para garantir que o PHP recarregue as variáveis
   > de ambiente.
4. Publique a pasta `POBJ SQL php71` dentro do diretório `htdocs` do XAMPP ou aponte
   um Virtual Host para ela. O Apache cuidará de servir o HTML/CSS/JS do painel.
   Não abra o `index.html` direto pelo `file://` nem use extensões sem suporte
   a PHP (ex.: Five Server sem configurar o caminho do `php.exe`).

   > ✅ Para conferir se está tudo no lugar, abra o `htdocs` e verifique se existe
   > a pasta `POBJ SQL php71` com a seguinte estrutura mínima:
   >
   > ```text
   > C:\xampp\htdocs\POBJ SQL php71\
   > ├── config\
   > │   ├── api\
   > │   │   └── index.php
   > │   ├── database.php
   > │   └── env.php
   > ├── index.html
   > ├── script.js
   > └── style.css
   > ```
   >
   > Se essa organização estiver igual à do seu Windows Explorer (como na
   > captura enviada), o Apache conseguirá localizar o painel e a API PHP.

O endpoint `config/api/index.php` fornece os dados que antes eram carregados dos
CSVs. O front-end usa requisições AJAX para esse arquivo passando o parâmetro
`endpoint` (por exemplo `endpoint=bootstrap`).

### Populando com dados de exemplo

Caso o banco esteja vazio, o painel exibirá cartões zerados e gráficos sem
informações. Para validar rapidamente a estrutura e garantir que a API retorne
linhas, execute após o `schema_mysql.sql` o arquivo
[`docs/dados_exemplo.sql`](../docs/dados_exemplo.sql). Ele insere um conjunto
mínimo de registros interligados (produtos, unidades, metas, realizados,
variável, campanhas, leads, histórico e tabelas do Omega) sem sobrescrever dados
existentes — as linhas de demonstração são atualizadas pelo `ON DUPLICATE KEY`
ou removidas antes da nova inserção.

> ⚠️ Utilize esse script apenas em ambientes de teste/homologação. Em produção,
> substitua pelos dados reais da operação.

### Abrindo o painel fora do Apache

Se você precisar pré-visualizar o `index.html` diretamente (por exemplo, dando
duplo clique no arquivo ou utilizando um servidor estático como o Five Server),
o script tentará contactar automaticamente a API em
`http://localhost/POBJ%20SQL%20php71/config/api/index.php`. Para que isso funcione:

1. Mantenha esta pasta publicada dentro do `htdocs` do XAMPP (ou com um Virtual
   Host apontando para ela) e inicie o Apache normalmente. Ao abrir o `index.html`
   por duplo clique, o painel tentará redirecionar automaticamente para
   `http://localhost/POBJ%20SQL%20php71/`; se o Apache estiver desligado o navegador
   mostrará erro de conexão, indicando que é preciso ligar o servidor.
2. Ajuste a variável global `window.API_HTTP_BASE` antes de carregar `script.js`
   caso utilize outro domínio ou porta. Exemplo:

   ```html
   <script>
     window.API_HTTP_BASE = "http://localhost:8080/pobj/";
     // Opcional: window.API_URL = "config/api/index.php"; // caminho customizado
   </script>
   <script src="script.js"></script>
   ```

3. Em servidores estáticos (como o Five Server) configure o caminho do `php.exe`
   do XAMPP para que os arquivos `.php` sejam processados corretamente.

Sem o Apache processando o PHP, o navegador receberá o arquivo bruto e o painel
exibirá o alerta "Não foi possível conectar ao banco de dados".

### Teste rápido da API

Com o Apache e o MySQL ligados, abra no navegador:

```
http://localhost/POBJ%20SQL%20php71/config/api/index.php?endpoint=health
```

O esperado é receber `{"status":"ok"}`. Caso apareça erro de conexão ou a
página tente fazer download do arquivo, revise se o Apache está servindo PHP
corretamente e se o arquivo `config/.env` contém as credenciais corretas.

#### Checklist para o agente de IA responder

1. Verifique se a extensão `curl` está habilitada no `php.ini` do XAMPP (procure
   por `extension=curl` e remova o `;` inicial, se houver). Reinicie o Apache
   após qualquer alteração.
2. Confira se o arquivo `.env` contém `OPENAI_API_KEY` (obrigatório) e, se
   desejado, `OPENAI_MODEL`/`OPENAI_EMBED_MODEL`. Use sempre o `.env` do backend;
   nunca exponha esses valores no JavaScript.
3. Garanta que a pasta `docs/knowledge/` exista e contenha os materiais que
   servirão de base (TXT, CSV, JSON ou PDF). O painel cria/atualiza
   automaticamente o arquivo `docs/knowledge.index.json` com os embeddings.
4. Faça um teste manual chamando o endpoint pelo navegador ou via `curl`:

   ```bash
   curl -X POST -H "Content-Type: application/json" \
     -d '{"question":"Como altero o período do POBJ?"}' \
     "http://localhost/POBJ%20SQL%20php71/config/api/index.php?endpoint=agent"
   ```

   A resposta deve ser um JSON com os campos `answer`, `sources` e `model`. Se o
   retorno trouxer erro, revise o texto da mensagem — normalmente indica chave
   ausente, extensão `curl` desativada ou falha na conexão com a internet.

> ℹ️ O painel agora também envia o caminho como `index.php/omega/statuses`
> (além do parâmetro `endpoint=omega/statuses`). Assim, mesmo que o Apache ou o
> proxy desconsiderem a query string, o PHP ainda consegue resolver a rota sem
> retornar HTTP 404. Se o servidor bloquear `PATH_INFO`, habilite `AcceptPathInfo
> On` no `httpd.conf`.

> 💡 Se precisar usar o Five Server, configure o caminho do PHP nativo do XAMPP
> (ex.: `C:\xampp\php\php.exe`) conforme a mensagem de erro da extensão.

### Locais suportados para o `.env`

O carregamento das variáveis considera automaticamente os caminhos abaixo (o
primeiro encontrado tem prioridade):

1. `POBJ SQL php71/config/.env`
2. `POBJ SQL php71/.env`
3. `.env` na raiz do repositório
4. `config/.env` na raiz do repositório (compatibilidade com estrutura antiga)

Caso nenhum arquivo seja encontrado, são utilizadas as variáveis de ambiente já
presentes no sistema operacional.

### Resolvendo erros comuns do XAMPP

Os logs do painel do XAMPP podem mostrar mensagens como `This may be due to a
blocked port...` ou `Error: Apache shutdown unexpectedly` (como na captura
enviada). Siga os passos abaixo para liberar os serviços:

1. **Feche outros servidores que usam a porta 80/443 (Apache) e 3306 (MySQL).**
   Programas como IIS/World Wide Web Publishing Service, Skype e outros
   servidores web costumam bloquear a porta 80. No Windows, abra o `services.msc`
   e pare/desabilite o serviço `World Wide Web Publishing Service` se estiver
   ativo.
2. **Reinicie o XAMPP como administrador.** Clique com o botão direito em
   `xampp-control.exe` e selecione *Run as administrator* para garantir que o
   Apache/MySQL consigam abrir as portas.
3. **Troque a porta do Apache se necessário.** Edite o arquivo `apache\conf\httpd.conf`
   (menu *Config > Apache (httpd.conf)* no painel) e altere `Listen 80` para
   `Listen 8080`. Faça o mesmo no `apache\conf\extra\httpd-ssl.conf`, trocando
   `Listen 443` por `Listen 8443`. Depois reinicie o Apache e acesse o painel em
   `http://localhost:8080/POBJ%20SQL%20php71/`.
4. **Ajuste a porta do MySQL se já houver outro serviço em 3306.** Em *Config >
   my.ini* altere `port=3306` para `port=3307`, salve e reinicie o MySQL. Lembre-se
   de atualizar o campo `DB_PORT` do arquivo `.env` para o novo número.
5. **Verifique o log detalhado.** No painel do XAMPP clique em *Logs > Apache*
   ou *Logs > MySQL* para ver a linha do erro. Mensagens sobre `missing
   dependencies` geralmente indicam que o Visual C++ Redistributable não está
   instalado; nesse caso use a versão do XAMPP que já inclui as bibliotecas ou
   solicite ao time de TI para instalar o pacote.

Após ajustar as portas e reiniciar os serviços, o painel deve carregar via
`http://localhost/POBJ%20SQL%20php71/` (ou na porta configurada).