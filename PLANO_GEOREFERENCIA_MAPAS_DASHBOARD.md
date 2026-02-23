# Plano: Georreferenciamento e mapas no Dashboard

Objetivo: usar no dashboard os dados de território (lat/long, CRAS, bairro) para **visualização em mapa** e **apoio à sanitização**, sem depender só de tabelas e relatórios.

---

## 1. O que já existe

| Item | Onde | Uso |
|------|------|-----|
| **vw_familias_territorio** | View no banco | Uma linha por família; quando há match Geo: `lat_territorio`, `long_territorio`, `bairro_territorio`, `cras_territorio`, `creas_territorio`, `endereco_territorio`, `cep_territorio`. Quem não deu match tem esses campos NULL. |
| **Página Geolocalização** | `/admin/geolocalizacao` | Upload Geo CSV, criar/recriar MVs, “Atualizar match Geo”, Via CEP, estatísticas de match, análise CEP/logradouro 24m, export sem território. **Não há mapa.** |
| **APIs de dados** | `/api/data/geo-match-stats`, `geo-sem-territorio`, `cras-opcoes` | Contagens e listas para a página de admin. |
| **Dados para mapa** | Banco | Famílias com `lat_territorio` e `long_territorio` não nulos podem ser plotadas como pontos. |

Hoje **não há** componente de mapa (Leaflet, Mapbox, etc.) no projeto.

---

## 2. Dados disponíveis para mapa

- **Pontos:** famílias em `vw_familias_territorio` com `lat_territorio` e `long_territorio` preenchidos.
- **Atributos por ponto:** `d_cod_familiar_fam`, endereço, bairro, CRAS, CREAS, CEP (todos de território ou do cadastro).
- **Filtros úteis:** CRAS, bairro (já existem opções em `cras-opcoes`, bairro pode vir da própria view ou de uma API de sugestões).

---

## 3. Fases sugeridas

### Fase 1 – API de pontos para o mapa (backend)

- **Objetivo:** o front poder pedir “pontos para exibir no mapa” com filtros opcionais.
- **Endpoint sugerido:** `GET /api/data/geo-pontos` (ou `geo-familias-mapa`).
  - Query params opcionais: `cras`, `bairro`, `limite` (ex.: 5000 para não travar).
  - Retorno: array de `{ d_cod_familiar_fam, lat_territorio, long_territorio, bairro_territorio, cras_territorio, endereco_territorio, cep_territorio }` só para registros com lat/long não nulos.
- **Fonte:** `vw_familias_territorio` com `WHERE lat_territorio IS NOT NULL AND long_territorio IS NOT NULL`.
- **Segurança:** mesmo padrão das outras rotas de dados (autenticação; restringir por perfil se fizer sentido).

Resultado: dados prontos para qualquer componente de mapa que você escolher.

---

### Fase 2 – Biblioteca de mapa e página “Mapa”

- **Biblioteca:** 
  - **Leaflet** + **react-leaflet**: gratuito, sem token, fácil (recomendado para começar).
  - Alternativa: Mapbox (mais bonito, exige token e conta).
- **Nova página:** por exemplo `/mapa` (ou `/territorio/mapa`) no dashboard.
  - Um mapa centralizado no município (ex.: Ribeirão Preto: lat/long fixos iniciais).
  - Chamada a `GET /api/data/geo-pontos` (com limite razoável, ex.: 2000–5000).
  - Cada ponto = marcador (pin) ou círculo; tooltip ou popup com: código familiar, endereço, bairro, CRAS.
- **Filtros na tela:** dropdown ou multiselect de CRAS e, se possível, bairro (repassar como query params para a API e recarregar pontos).

Resultado: dashboard com uma tela onde o usuário **vê** as famílias georreferenciadas no mapa.

---

### Fase 3 – Sanitização e CEP genérico na interface

- **Objetivo:** não só SQL/planilha: poder enxergar e trabalhar “quem está com CEP genérico” no dashboard.
- **Opções:**
  - **3a)** Aba ou seção na **Geolocalização** (admin): botão “Listar CEP genérico” que chama uma API que executa a lógica de `select_sanitizacao_por_endereco.sql` (join por CEP + similaridade de endereço) e devolve lista (endereço cadastro, endereço base, CEP, qtd famílias, status). Exibir em tabela com export CSV.
  - **3b)** No **mapa:** camada ou filtro “CEP genérico” (pontos que entram na lista acima) em cor diferente (ex.: laranja), para revisão espacial.
- Dados já existem (tbl_ceps, vw_familias_limpa); falta API que rode a query (com limite/parâmetros) e página/componente que consuma.

Resultado: fluxo de sanitização visível e acionável pelo dashboard (lista + opcionalmente mapa).

---

### Fase 4 – Melhorias opcionais de mapa

- **Clustering:** muitos pontos na mesma área → agrupar em “bolha” com número; ao dar zoom, expandir em pontos (react-leaflet-cluster ou similar).
- **Heatmap:** densidade de famílias por região (biblioteca de heatmap sobre Leaflet).
- **Contornos de CRAS:** se no futuro você tiver polígonos (shapefile/GeoJSON) por CRAS, desenhar no mapa e colorir por CRAS.
- **Sem território:** camada ou lista “sem lat/long” (link para a exportação que já existe ou nova API) para priorizar correção.

Resultado: mapa mais útil para análise territorial e para apoiar decisão (onde há mais famílias, quais CRAS, onde falta território).

---

## 4. Ordem sugerida de implementação

| Ordem | Item | Esforço | Dependência |
|-------|------|---------|-------------|
| 1 | API `GET /api/data/geo-pontos` com filtros (cras, bairro, limite) | Baixo | Nenhuma |
| 2 | Instalar Leaflet + react-leaflet, criar página `/mapa` com pontos e tooltip | Médio | Item 1 |
| 3 | Filtros CRAS/bairro na página do mapa | Baixo | Item 2 |
| 4 | API “CEP genérico” (query por endereço) + tabela/export na Geolocalização | Médio | select_sanitizacao_por_endereco.sql |
| 5 | (Opcional) Camada “CEP genérico” no mapa ou clustering/heatmap | Médio | Itens 2 e 4 |

---

## 5. Resumo

- **Georreferenciamento no dashboard:** hoje você já tem as coordenadas em `vw_familias_territorio`; falta **expor em API** e **desenhar em mapa** (Leaflet).
- **Mapas:** uma **página de mapa** com pontos (famílias), filtros por CRAS/bairro e, depois, opcionalmente clustering/heatmap e contornos de CRAS.
- **Sanitização:** trazer a lógica de **CEP genérico** (endereço diverge do endereço do CEP na base) para uma **API** e para a **interface** (tabela na Geolocalização e, se quiser, camada no mapa).

Se quiser, o próximo passo prático é implementar a **Fase 1** (API de pontos) e a **Fase 2** (página do mapa com Leaflet) em cima desse plano.
