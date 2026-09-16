# Utilitários da API

Execute os scripts a partir da raiz, usando o Python do ambiente virtual:

```powershell
.\.venv\Scripts\python.exe -m backend.scripts.gerar_lista_por_banco
.\.venv\Scripts\python.exe -m backend.scripts.criar_usuario --help
```

As configurações são lidas de `backend/.env`. Os utilitários de bairros usam `backend/utils/` e os arquivos de trabalho ficam em `backend/output/`. Exportações e arquivos de entrada gerados anteriormente não foram copiados: forneça as entradas necessárias antes de executar cada script.

Esses scripts incluem operações de consulta e alteração no banco. Confira os parâmetros e a operação de cada módulo antes da execução. Eles não são executados durante a inicialização da API.
