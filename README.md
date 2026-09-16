# dataops marketing

aplicação para consulta, geração de listas e enriquecimento de contatos, com interface em react e api em flask integrada ao mysql.

esta versão web está em preparação para produção. a branch `web/preparacao-producao` reúne a base que receberá as correções e validações necessárias antes da publicação.

o repositório reúne frontend e backend em uma estrutura única, com configurações independentes e documentação para desenvolvimento, validação e publicação.

## estrutura do projeto

```text
frontend/
  src/           páginas, componentes, contextos e serviços
  public/        arquivos públicos
  __tests__/     testes da interface
backend/
  auth/          autenticação e autorização
  routes/        endpoints da api
  middleware/    validação e segurança
  models/        schemas de dados
  utils/         processamento, exportação e localidades
  sql/           scripts de banco de dados
  scripts/       utilitários administrativos
  tests/         testes da api
  docs/          documentação técnica
pytest.ini       configuração dos testes do backend
railway.json     configuração de publicação da api
```

## requisitos

para executar o projeto, utilize node.js 22.12 ou superior, npm e python 3.12. o backend requer acesso a um banco mysql com as tabelas esperadas pela aplicação. o redis é opcional.

os comandos a seguir consideram o uso do powershell, a partir da raiz do repositório.

## desenvolvimento local

### backend

crie o ambiente virtual, instale as dependências e copie o arquivo de configuração:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
copy-item backend/.env.example backend/.env
```

preencha `backend/.env` com as credenciais do banco e uma chave `API_JWT_SECRET`. para desenvolvimento local, defina `API_ENFORCE_HTTPS=false` e `API_CORS_ORIGINS=http://localhost:5173`.

o arquivo de configuração é carregado ao importar o pacote. variáveis já definidas no ambiente têm prioridade sobre os valores do arquivo.

inicie a api:

```powershell
.\.venv\Scripts\python.exe -m backend.run
```

o endereço padrão é `http://localhost:5001`, com verificação de disponibilidade em `/api/v1/health`. execute os módulos python pela raiz do repositório para preservar os imports `backend.*`.

### frontend

em outro terminal, instale as dependências e inicie o servidor de desenvolvimento:

```powershell
copy-item frontend/.env.example frontend/.env
npm --prefix frontend ci
npm --prefix frontend run dev
```

acesse o endereço exibido pelo vite, normalmente `http://localhost:5173`.

com `VITE_API_URL` vazio, o proxy de desenvolvimento encaminha as requisições de `/api` para `http://localhost:5001`. para conectar a outra api, informe sua origem nessa variável, sem acrescentar `/api/v1`.

## qualidade e testes

para gerar o build do frontend, executar a análise estática e rodar os testes do backend:

```powershell
npm --prefix frontend run build
npm --prefix frontend run lint
.\.venv\Scripts\python.exe -m pytest
```

os testes em `frontend/__tests__` utilizam vitest. a configuração do executor, sua dependência e o comando de execução ainda precisam ser incluídos no projeto.

na validação inicial da consolidação, o build do frontend foi concluído. a análise estática identificou 18 erros e 3 avisos preexistentes, relacionados a variáveis não utilizadas, hooks e fast refresh. os testes do backend não foram executados nessa etapa por indisponibilidade do python no ambiente.

## scripts administrativos

os utilitários ficam em `backend/scripts/` e devem ser executados como módulos a partir da raiz:

```powershell
.\.venv\Scripts\python.exe -m backend.scripts.gerar_lista_por_banco
```

consulte o [guia dos scripts](backend/scripts/README.md) para verificar parâmetros, arquivos de entrada e operações realizadas. informações sobre o banco e a qualidade dos dados estão na [documentação técnica](backend/docs/).

## publicação

### api

o build da imagem utiliza a raiz do repositório como contexto:

```powershell
docker build -f backend/Dockerfile -t projeto-listas-api .
docker run --rm -p 5001:5001 --env-file backend/.env projeto-listas-api
```

o arquivo `railway.json` define o caminho do dockerfile e a verificação de disponibilidade da api.

### interface

o build gera os arquivos estáticos em `frontend/dist`. defina `VITE_API_URL` antes de gerar a versão de produção e configure a hospedagem para servir `index.html` nas rotas da aplicação.

## configuração e origem

os arquivos `.env.example` documentam as configurações necessárias. credenciais locais, dependências instaladas, ambientes virtuais, caches, logs e exportações são excluídos do versionamento.

o frontend foi consolidado a partir de `projeto_listas_web/frontend`, e o backend, de `api_bd_contatus/backend`. os scripts e documentos da api foram organizados em `backend/scripts/` e `backend/docs/`. as pastas de origem foram preservadas; a documentação original permanece disponível como referência e pode mencionar caminhos anteriores.
