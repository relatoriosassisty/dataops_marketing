# Tabelas do banco — documentação para uma API de dados brutos

Quais tabelas e **colunas** manipular para construir uma API que retorna os dados
brutos de contatos. Cada tabela traz operação, colunas e chaves de JOIN.

> **Fonte dos dados brutos:** tudo gira em torno de `latest_contacts`.
> As demais tabelas de dados (`all_cpf_cbo`, `all_cbo`, `telephone`, `uf`) só
> entram via JOIN para enriquecer o registro.

---

## 1. `latest_contacts` — NÚCLEO dos dados (SELECT)

Tabela principal. Uma linha = um snapshot de um contato.

| Coluna no banco | Retorna como | Observação |
|---|---|---|
| `CPF` | CPF | chave de JOIN com CBO |
| `NOME` | NOME | |
| `DATA_NASCIMENTO` | DATA_NASCIMENTO | usada no filtro de idade |
| `GENERO` | GENERO | |
| `UF` | UF | 2 letras maiúsculas; filtro obrigatório |
| `cidade` | CIDADE | nome da coluna em minúsculo |
| `BAIRRO` | BAIRRO | |
| `CEP` | CEP | |
| `ENDERECO` | ENDERECO | |
| `NUM_END` | NUM_END | |
| `COMPLEMENTO` | COMPLEMENTO | |
| `email_1` | EMAIL_1 | filtro "tem email" |
| `email_2` | EMAIL_2 | |
| `telefone_1` … `telefone_6` | TELEFONE_1…6 | `telefone_1` = "tem telefone" |
| `ID_MAILING` | (interno) | PK parte 1 — paginação + JOIN telefone |
| `ID_COMPLEMENT` | (interno) | PK parte 2 — paginação |
| `snapshot_updated_at` | (interno) | desduplicação por CPF |

`TIPO_PESSOA` é fixo `'FISICA'` (literal na query, não existe no banco).

---

## 2. `all_cpf_cbo` + `all_cbo` — profissão (SELECT, via JOIN por CPF)

**`all_cpf_cbo`** — relação CPF ↔ código CBO
| Coluna | Uso |
|---|---|
| `cpf` | JOIN com `latest_contacts.CPF` |
| `cbo` | filtro `cbo IN (...)`; JOIN com `all_cbo` |

**`all_cbo`** — descrição do código
| Coluna | Uso |
|---|---|
| `cbo` | JOIN com `all_cpf_cbo.cbo` |
| `atividade` | descrição da profissão → retorna como `ATIVIDADE` |

---

## 3. `telephone` — telefones extras (SELECT, via JOIN por ID_MAILING)

| Coluna | Uso |
|---|---|
| `ID_MAILING` | JOIN com `latest_contacts.ID_MAILING` |
| `telefone_completo` | número usado na busca |

---

## 4. `uf` — estados (SELECT, referência)

| Coluna | Uso |
|---|---|
| `ID` | PK; JOIN com `bairros_alta_renda.uf_id` |
| `UF` | sigla de 2 letras |

---

## 5. `bairros_alta_renda` — bairros nobres (SELECT + INSERT de carga)

| Coluna | Uso |
|---|---|
| `id` | PK |
| `uf_id` | FK → `uf.ID` |
| `cidade` | MAIÚSCULO com acento |
| `bairro` | MAIÚSCULO sem acento |
| `ranking` | 1=Premium, 2=Classe A, 3=Classe B+ |

---

## Consulta principal (dados brutos)

Query base montada por `query_builder.py`. Traz o registro mais recente por CPF,
com filtros de UF/cidade/bairro/gênero/idade/email/telefone e, opcionalmente, profissão (CBO).

```sql
SELECT
    lc.telefone_1      AS TELEFONE_1,
    lc.telefone_2      AS TELEFONE_2,
    lc.telefone_3      AS TELEFONE_3,
    lc.telefone_4      AS TELEFONE_4,
    lc.telefone_5      AS TELEFONE_5,
    lc.telefone_6      AS TELEFONE_6,
    lc.NOME            AS NOME,
    lc.CPF             AS CPF,
    'FISICA'           AS TIPO_PESSOA,
    lc.DATA_NASCIMENTO AS DATA_NASCIMENTO,
    lc.GENERO          AS GENERO,
    lc.ENDERECO        AS ENDERECO,
    lc.NUM_END         AS NUM_END,
    lc.COMPLEMENTO     AS COMPLEMENTO,
    lc.BAIRRO          AS BAIRRO,
    lc.cidade          AS CIDADE,
    lc.CEP             AS CEP,
    lc.UF              AS UF,
    lc.email_1         AS EMAIL_1,
    lc.email_2         AS EMAIL_2,
    d.atividade        AS ATIVIDADE          -- só quando filtra profissão (CBO)
FROM latest_contacts lc
    JOIN all_cpf_cbo e ON lc.CPF = e.cpf      -- só quando filtra profissão
    LEFT JOIN all_cbo d ON e.cbo = d.cbo      -- só quando filtra profissão
WHERE lc.UF IN (:ufs)                                    -- obrigatório
    AND lc.cidade IN (:cidades)                          -- opcional
    AND lc.BAIRRO IN (:bairros)                          -- opcional
    AND lc.GENERO LIKE '%M%'                             -- opcional (M / F)
    AND lc.DATA_NASCIMENTO IS NOT NULL
    AND lc.DATA_NASCIMENTO BETWEEN (CURDATE() - INTERVAL :idade_max YEAR)
                               AND (CURDATE() - INTERVAL :idade_min YEAR)
    AND lc.email_1 IS NOT NULL                           -- opcional (tem email)
    AND lc.telefone_1 IS NOT NULL                        -- opcional (tem telefone)
    AND e.cbo IN (:cbos)                                 -- opcional (profissão)
    AND (lc.ID_MAILING, lc.ID_COMPLEMENT) > (:last_mailing, :last_complement)  -- cursor de paginação
ORDER BY lc.ID_MAILING, lc.ID_COMPLEMENT
LIMIT :n;
```

### Desduplicação (registro mais recente por CPF)

Quando a base tem snapshots repetidos por CPF, filtre pelo mais recente:

```sql
FROM latest_contacts a
JOIN (
    SELECT lc.cpf, MAX(lc.snapshot_updated_at) AS max_ts
    FROM latest_contacts lc
    GROUP BY lc.cpf
) mx ON a.cpf = mx.cpf AND a.snapshot_updated_at = mx.max_ts
```

---

## Consulta de enriquecimento (busca por lista de CPF/telefone)

O cliente **envia uma lista** (CPFs ou telefones) e a API devolve os dados brutos
de cada um. Como a lista pode ter até 1 milhão de itens, ela não vai na cláusula
`IN (...)` — passa por uma **tabela de trabalho** (`cpf_consultas`).

**Lógica em 5 passos:**
1. **Normaliza** o arquivo (TXT/CSV): CPF vira 11 dígitos; telefone 10/11 dígitos
   (remove DDI `55`); deduplica. Limite: 10 MB / 1.000.000 itens.
2. Gera um **`session_id`** (UUID) para isolar essa requisição.
3. **Carrega** os itens na staging `cpf_consultas` com `ID_IMPORT = session_id`
   (via `LOAD DATA LOCAL INFILE`; fallback INSERT em lote).
4. **Roda a query**: JOIN de `latest_contacts` com a staging filtrando pelo
   `session_id`, pegando o snapshot mais recente por CPF.
5. **Apaga** as linhas da sessão: `DELETE FROM cpf_consultas WHERE ID_IMPORT = session_id`.

> Na staging, tanto CPF quanto telefone são gravados na coluna `CPF`
> (o campo é reaproveitado; a diferença está na query usada).

### Por CPF
```sql
SELECT <mesmas colunas da consulta principal>
FROM latest_contacts a
JOIN cpf_consultas b ON a.cpf = b.cpf AND b.ID_IMPORT = :session_id
JOIN (
    SELECT lc.cpf, MAX(lc.snapshot_updated_at) AS max_ts
    FROM latest_contacts lc
    JOIN cpf_consultas c ON lc.cpf = c.cpf AND c.ID_IMPORT = :session_id
    GROUP BY lc.cpf
) mx ON a.cpf = mx.cpf AND a.snapshot_updated_at = mx.max_ts;
```

### Por telefone
Igual à de CPF, mas entra pela tabela `telephone` (`ID_MAILING` ↔ `telefone_completo`):
```sql
SELECT <mesmas colunas>
FROM latest_contacts a
LEFT JOIN telephone d ON a.ID_MAILING = d.ID_MAILING
JOIN cpf_consultas f ON d.telefone_completo = f.cpf AND f.ID_IMPORT = :session_id
JOIN (
    SELECT lc.cpf, MAX(lc.snapshot_updated_at) AS max_ts
    FROM latest_contacts lc
    JOIN telephone t2      ON lc.ID_MAILING = t2.ID_MAILING
    JOIN cpf_consultas c   ON t2.telefone_completo = c.cpf AND c.ID_IMPORT = :session_id
    GROUP BY lc.cpf
) mx ON a.cpf = mx.cpf AND a.snapshot_updated_at = mx.max_ts;
```

Depois da query, os telefones (DDD+número concatenados) são separados em
`DDD_1..6` e `TELEFONE_1..6` no pós-processamento.

---

## Localidades NÃO vêm do banco

`UF`, cidades e bairros das telas de apoio (`/localidades/*`) são servidos de
**arquivos JSON estáticos** (`municipios_ibge.json`, `api/utils/bairros/{UF}.json`).
Só `bairros_alta_renda` é consultada no banco.

---

## Tabelas operacionais (NÃO são dados brutos)

| Tabela | Operações | Para que serve |
|---|---|---|
| `cpf_consultas` | INSERT, SELECT, DELETE | staging temporário do enriquecimento |

---

## Resumo rápido de operações

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|:---:|:---:|:---:|:---:|
| `latest_contacts` | ✅ | — | — | — |
| `all_cpf_cbo` | ✅ | — | — | — |
| `all_cbo` | ✅ | — | — | — |
| `telephone` | ✅ | — | — | — |
| `uf` | ✅ | — | — | — |
| `bairros_alta_renda` | ✅ | ✅ (seed) | — | — |
| `cpf_consultas` | ✅ | ✅ | — | ✅ |
