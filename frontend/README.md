# projeto_listas_frontend

Interface web para o **Gerador de Listas PF** — sistema interno de geração de listas de pessoas físicas com filtros segmentados (localização, perfil, telefone, profissão).

---

## Sumário

- [Visão geral](#visão-geral)
- [Stack](#stack)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Como rodar](#como-rodar)
- [Modo mock](#modo-mock)
- [Decisões de projeto](#decisões-de-projeto)
- [Design system](#design-system)
- [Filtros disponíveis](#filtros-disponíveis)
- [Fluxo de uso](#fluxo-de-uso)
- [Integração com o backend](#integração-com-o-backend)

---

## Visão geral

O sistema permite que operadores gerem listas segmentadas de contatos a partir de um banco de dados MySQL (AWS RDS). O frontend é uma SPA que se autentica via JWT, aplica filtros visuais e faz download do arquivo gerado.

O fluxo principal tem duas etapas deliberadas:

1. **Levantamento** — conta quantos registros existem com os filtros selecionados (operação rápida, sem gerar arquivo)
2. **Gerar lista** — dispara a geração do `.xlsx` e oferece download

Essa separação evita gerar arquivos grandes sem antes conferir a disponibilidade dos dados.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | React 19 + Vite 8 |
| Roteamento | React Router DOM v7 |
| HTTP | Axios |
| UI | Bootstrap 5.3 + Bootstrap Icons 1.13 |
| Estilo | CSS custom properties (design tokens) |
| Autenticação | JWT com refresh automático |

---

## Estrutura de pastas

```
src/
├── components/
│   ├── auth/
│   │   └── LoginForm.jsx          # Formulário de login
│   ├── filters/
│   │   ├── FilterForm.jsx         # Orquestrador principal dos filtros
│   │   ├── LocationFilters.jsx    # UF, cidade, bairro, alta renda
│   │   ├── PersonFilters.jsx      # Gênero (+ proporção M/F), idade, e-mail, profissão
│   │   ├── PhoneFilters.jsx       # Tipo de telefone, DDD, quantidade
│   │   └── DistribuicaoQuantidade.jsx  # Divisão de quantidade por cidade/bairro
│   ├── results/
│   │   └── ResultPanel.jsx        # Exibe contagem ou botão de download
│   └── ui/
│       ├── ProtectedRoute.jsx     # Guarda de rota autenticada
│       ├── Spinner.jsx            # Loading inline
│       └── Toast.jsx              # Notificações temporárias
├── contexts/
│   └── AuthContext.jsx            # Estado global de autenticação
├── pages/
│   ├── LoginPage.jsx
│   └── HomePage.jsx
├── services/
│   ├── api.js                     # Instância Axios com interceptors JWT
│   ├── authService.js             # Login / logout / refresh
│   ├── consultaService.js         # Contagem / geração de lista
│   └── mockData.js                # Dados falsos para desenvolvimento offline
└── styles/
    ├── variables.css              # Design tokens (cores, tipografia, espaçamento)
    └── global.css                 # Reset e estilos base
```

---

## Como rodar

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento (http://localhost:5175)
npm run dev

# Build de produção
npm run build
```

Crie um arquivo `.env` na raiz da pasta `frontend/` (copie de `.env.example`):

```env
VITE_API_URL=http://localhost:5001   # URL do backend Flask
VITE_MOCK_MODE=false                 # true para rodar sem backend
```

> **Atenção:** nunca versione o `.env` quando `VITE_MOCK_MODE=false` e a URL da API real estiver configurada.

---

## Modo mock

Quando `VITE_MOCK_MODE=true`, toda comunicação com o backend é substituída por dados simulados definidos em `src/services/mockData.js`. Isso permite desenvolver e testar a interface sem a API rodando.

**Credenciais de acesso no modo mock:** `1` / `1`

O mock simula:
- Login com geração de token falso
- Listagem de cidades e bairros por UF
- Contagem com disponibilidade variável por item (alguns abaixo do pedido, outros acima)
- Atraso artificial de ~600ms para simular latência real

---

## Decisões de projeto

### Por que React + Vite e não o Jinja2 do Flask?
O template anterior (`index.html` com Jinja2) misturava lógica de estado e renderização de forma difícil de manter. React permite separar claramente os filtros em componentes independentes e reutilizáveis, com estado controlado e previsível.

### Por que Bootstrap e não Tailwind?
O projeto já usava Bootstrap no template legado. Manter Bootstrap reduz a curva de aprendizado para quem mantém o sistema e evita reescrever classes utilitárias do zero. Os tokens de cor em `variables.css` garantem identidade visual consistente sem depender do tema padrão do Bootstrap.

### Por que dois passos (Levantamento → Gerar)?
Queries no banco com múltiplos filtros podem retornar 0 resultados ou muito menos do que o esperado. O passo de levantamento evita que o operador espere a geração de um arquivo só para descobrir que o filtro retorna poucos dados. Também expõe a disponibilidade por cidade/bairro antes de confirmar.

### Por que o estado dos filtros fica em `FilterForm` e não em um contexto global?
O formulário de filtros é autocontido — não há outra parte da aplicação que precise desses valores. Usar `useState` local em `FilterForm` e passar `onChange` para os filhos é mais simples e direto do que um contexto ou store global para esse caso de uso.

### Por que o payload omite campos com valor padrão?
`buildPayload()` em `FilterForm.jsx` envia `undefined` (que o Axios omite do JSON) quando um filtro está no valor default — por exemplo, `tipoTelefone: 'ambos'` não é enviado. Isso mantém o payload enxuto e legível nos logs do backend, além de tornar mais fácil identificar quais filtros estão realmente ativos.

### Refresh automático de JWT
`api.js` implementa uma fila de requisições pendentes enquanto o token está sendo renovado. Se o refresh falhar, o usuário é deslogado automaticamente. Isso garante que sessões longas (operadores que deixam a aba aberta) não quebrem silenciosamente no meio de uma operação.

---

## Design system

Todas as cores, tamanhos e espaçamentos estão definidos como CSS custom properties em `src/styles/variables.css`. Os componentes usam exclusivamente essas variáveis — nenhuma cor está hard-coded no JSX.

Paleta principal:

| Token | Valor | Uso |
|---|---|---|
| `--roxo-primario` | `#7B1FA2` | Botões, destaques, links ativos |
| `--roxo-escuro` | `#4A148C` | Títulos, textos de ênfase |
| `--laranja-primario` | `#FF6F00` | Botão de ação principal (Gerar lista) |
| `--sucesso` | `#4CAF50` | Confirmações, ícones OK |
| `--aviso` | `#FF9800` | Disponibilidade parcial |
| `--erro` | `#F44336` | Erros, soma inválida |

---

## Filtros disponíveis

| Filtro | Comportamento |
|---|---|
| **UF** | Multi-seleção; obrigatório para habilitar os botões de ação |
| **Cidade** | Carregado da API após selecionar UF; multi-seleção |
| **Bairro** | Carregado após selecionar cidade; multi-seleção |
| **Alta renda** | Toggle; filtra apenas bairros classificados como nobres |
| **Gênero** | Masculino / Feminino / Ambos |
| **Proporção M/F** | Visível somente quando "Ambos" está selecionado; inputs linkados (mudar M ajusta F automaticamente); mostra estimativa absoluta com base na quantidade total |
| **Faixa etária** | Range (18–70 anos) |
| **E-mail** | Sem filtro / Somente com e-mail |
| **Tipo de telefone** | Celular / Fixo / Ambos |
| **DDD** | Multi-seleção |
| **Quantidade** | Número total desejado de registros |
| **Profissão (CBO)** | Multi-seleção por categoria profissional |
| **Distribuição por cidade/bairro** | Aparece quando múltiplas cidades ou bairros são selecionados; permite definir quantos registros por item; botão "Equalizar" divide proporcionalmente |

---

## Fluxo de uso

```
Login → HomePage
         │
         ▼
    FilterForm
    ┌──────────────────────────────────┐
    │  LocationFilters (UF/cidade/bairro)
    │  PersonFilters   (gênero/idade/email/profissão)
    │  PhoneFilters    (telefone/DDD/quantidade)
    │  DistribuicaoQuantidade (opcional)
    └──────────────────────────────────┘
         │                    │
    [Levantamento]       [Gerar lista]
         │                    │
    ResultPanel          ResultPanel
    (contagem +          (botão de
     por item)            download)
```

---

## Integração com o backend

O backend é uma API Flask (repositório `projeto_listas_web`). Endpoints consumidos:

| Método | Endpoint | Uso |
|---|---|---|
| `POST` | `/api/v1/auth/login` | Autenticação, retorna `access_token` e `refresh_token` |
| `POST` | `/api/v1/auth/refresh` | Renovação do token expirado |
| `GET` | `/api/v1/localidades/cidades?uf=SP` | Lista de cidades disponíveis na UF |
| `GET` | `/api/v1/localidades/bairros?uf=SP&cidade=SAO+PAULO` | Lista de bairros da cidade |
| `POST` | `/api/v1/consulta/contagem` | Contagem de registros com os filtros |
| `POST` | `/api/v1/consulta/gerar` | Gera o arquivo `.xlsx` e retorna para download |

Todas as requisições (exceto login) carregam o header `Authorization: Bearer <token>`.
