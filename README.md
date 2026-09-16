# dataops marketing · versão local

edição provisória para consulta, geração de listas e enriquecimento de contatos no próprio computador. a interface abre diretamente no gerador, sem login, cadastro de usuários, senhas, limites por conta ou controle financeiro.

esta edição está na branch `local/uso-provisorio`. a versão web permanece em `web/preparacao-producao`.

## funcionamento

o fluxo de listas continua em duas etapas: configurar os filtros e realizar o levantamento; depois, escolher a quantidade e gerar o arquivo xlsx. o enriquecimento recebe um arquivo com cpfs ou telefones e inicia o download do resultado.

não são solicitados tipo de venda, cliente, valores ou parcelas. as operações não consultam tabelas de usuários nem gravam registros financeiros. os registros técnicos ficam nos logs locais.

os filtros de localização, perfil, profissão, telefone e alta renda permanecem disponíveis. também permanecem os limites técnicos de tamanho, quantidade e processamento. o identificador temporário do levantamento continua válido por 30 minutos; ele identifica o resultado, sem representar uma sessão de usuário.

## estrutura

```text
frontend/          interface react e vite
  src/             páginas, componentes e serviços
  __tests__/       testes da interface
backend/           api flask
  routes/          consulta, localidades, enriquecimento e diagnóstico
  middleware/      validação, limites técnicos e acesso local
  utils/           processamento, exportação e logs
  scripts/         utilitários de dados
  tests/           testes automatizados
  docs/            documentação do banco e qualidade dos dados
```

## requisitos

utilize node.js 22.12 ou superior, npm e python 3.12. as consultas dependem do acesso ao mysql com as tabelas de dados do projeto. o redis é opcional. executar localmente não significa trabalhar sem conexão com o banco.

os comandos abaixo devem ser executados na raiz do repositório, em powershell.

## configuração do backend

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
copy-item backend/.env.example backend/.env
```

preencha `backend/.env` com as credenciais do mysql. o usuário do banco continua necessário para acessar os dados; não há usuário ou senha da aplicação. variáveis já definidas no ambiente têm prioridade sobre o arquivo.

```powershell
.\.venv\Scripts\python.exe -m backend.run
```

a api atende em `http://127.0.0.1:5001`. o diagnóstico básico fica em `/api/v1/health`. para alterar a porta, use `--port`; mantenha o destino do proxy em `frontend/vite.config.js` correspondente.

## configuração do frontend

em outro terminal:

```powershell
copy-item frontend/.env.example frontend/.env
npm --prefix frontend ci
npm --prefix frontend run dev
```

abra o endereço informado pelo vite, normalmente `http://127.0.0.1:5173`. com `VITE_API_URL` vazio, o proxy encaminha `/api` para o backend local. nenhuma etapa de autenticação é necessária.

para visualizar a interface com dados simulados, defina `VITE_MOCK_MODE=true` em `frontend/.env`. esse modo não consulta o banco nem gera arquivos reais.

## uso local

o servidor da api inicia em `127.0.0.1`, e o backend aceita apenas conexões locais. esta edição não deve ser publicada ou exposta por túneis e proxies públicos. para retomar a preparação da versão web com controle de acesso, utilize a branch correspondente.

## verificação

```powershell
npm --prefix frontend test
npm --prefix frontend run build
npm --prefix frontend run lint
.\.venv\Scripts\python.exe -m pytest
```

os testes do backend usam dados sintéticos e bloqueiam conexões ao banco real. os testes da edição local cobrem acesso sem credenciais, ausência de rotas de conta, geração de arquivos sem dados comerciais e enriquecimento multipart.

na validação desta edição, passaram 452 testes do backend, os 3 testes do frontend e o build da interface. o lint ainda identifica 8 erros e 3 avisos preexistentes em filtros de localização, componentes de resultado, serviço de consulta e testes legados.

`npm test` executa os testes da edição local com o executor nativo do node.js. os arquivos legados `edge.cases.test.js` e `location.demographic.test.js` ainda dependem de uma configuração de vitest e não fazem parte desse comando.

## documentação

consulte os [utilitários de dados](backend/scripts/README.md), a [estrutura do banco](backend/docs/tabelas_banco.md) e o [mapeamento de qualidade](backend/docs/mapeamento_qualidade_dados.md).

credenciais, dependências, ambientes virtuais, logs e exportações são excluídos do versionamento. as pastas de origem da consolidação permanecem preservadas.
