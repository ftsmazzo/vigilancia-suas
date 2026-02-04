# Estratégia de sanitização: Geo × CADU × Via CEP

## Problema em resumo

- **Escopo:** A tabela Geo e o match Geo × famílias servem à **Vigilância Socioassistencial** (território e números). A Geo interage **exclusivamente** com cadu_raw / vw_familias_limpa — não com a Agenda Form (visitas e listagem).
- **Geo:** base oficial de endereços/CEP do município (com lat/long, bairro, CRAS, CREAS).
- **CADU:** endereços e CEP vindos do cadastro (entrada manual, grafias variadas).
- **Cruzar só por CEP** é arriscado:
  1. **CEP no CADU que não existe na Geo** (CEPs mais novos).
  2. **Pior:** endereço certo no CADU, mas **CEP “central”** (um CEP genérico da região). Ao cruzar só por CEP, a territorialidade vai para um ponto que não é o endereço real (ex.: família no bairro X com CEP do Centro).

Objetivo: **sanitizar ao máximo** para atribuir territorialidade (bairro, CRAS, lat/long) só quando houver confiança, sem “jogar” o cadastrador para um lugar que não existe.

### Cenário real (por que é desafiador)

- **CADU:** endereços com grafia errada ou variada; CEPs que não batem com o endereço real (ex.: CEP "central"); a tabela repete muitos endereços/CEPs (várias famílias no mesmo endereço).
- **Geo:** tabela base de endereços do município **sem repetição** — relação **1 (Geo) : N (famílias)**. É a **fonte da verdade** para território (bairro, CRAS, lat/long). Também pode estar desatualizada: haverá endereços no CADU que ainda não existem na Geo.
- **Necessidade:** atualizar e validar **dos dois lados** (Geo e CADU), mas **sempre usar a Geo** para exibir território e contar famílias (como no Power BI: relação 1-N entre CEP da Geo e das famílias; usar Geo para mapa e totais).
- **Validação no painel:** quando a tabela CADU (ou Geo) for atualizada, rodar o refresh no painel (botão "Atualizar match Geo" ou "Atualizar todas as views") para repopular `mv_familias_geo` e manter as consultas rápidas.

---

## Fontes

| Fonte      | O que temos |
|-----------|-------------|
| **Geo**   | `endereco`, `bairro`, `cep`, `id_endereco`, `id_bairro`, `lat_num`, `long_num`, `cras`, `creas`. Um CEP na Geo pode corresponder a um trecho de rua (faixa de CEP). |
| **CADU**  | `d_nom_tip_logradouro_fam` (Rua/Av), `d_nom_titulo_logradouro_fam`, `d_nom_logradouro_fam`, `d_num_logradouro_fam`, `d_num_cep_logradouro_fam`, `d_nom_localidade_fam`, `d_nom_unidade_territorial_fam`. Já normalizados em `vw_familias_limpa` (norm_cep, norm_text). |
| **Via CEP** | API: consulta por **CEP** (retorna logradouro, bairro, localidade) ou por **UF + cidade + logradouro** (retorna CEPs). Útil para validar CEP↔endereço e corrigir CEP quando o endereço está certo. |

---

## Dificuldades

1. **Grafia no CADU:** mesmo logradouro escrito de várias formas (ex.: “Campos Elíseos” / “Camps Eliseos” / “Campo Eliseo” etc.). Via CEP exige um nome razoavelmente correto para busca por endereço.
2. **CEP central:** CADU tem CEP genérico; Geo tem CEP específico por trecho. Cruzar só por CEP atribui território errado.
3. **CEPs novos:** não estão na Geo; Via CEP pode ter.

---

## Estratégia em fases

### Fase 1 – Base e normalização (já possível)

1. **Carregar a tabela Geo** no banco (`tbl_geo` ou `geo`), a partir do `geo.csv`.
2. **Normalização comum** para CADU e Geo:
   - **CEP:** só dígitos, 8 caracteres (`norm_cep` já existe).
   - **Logradouro “completo”:** construir uma string única para comparação, por exemplo:
     - Remover acentos (ou usar collate unaccent).
     - Maiúsculas, trim.
     - Abreviações padronizadas: `R.` → `RUA`, `AV.` → `AVENIDA`, `RUA` → `RUA`, etc.
     - Concatenar tipo + título + nome do logradouro (ex.: `RUA ANA MARIA DE JESUS`).
   - Criar função `norm_logradouro_para_match(tipo, titulo, nome)` no Postgres que devolve essa string; aplicar no CADU e na Geo (em Geo, “endereco” já vem como “Rua X”, então parsear ou normalizar o mesmo padrão).

Com isso já dá para:
- **Match “forte”:** mesmo CEP **e** logradouro normalizado parecido (similaridade ou igualdade).
- **Não atribuir** quando só o CEP bater mas o logradouro for muito diferente (evita CEP central).

### Fase 2 – Dicionário de variantes (grafia CADU → canônico)

- **Problema:** “Campos Elíseos” escrito de 8 formas no CADU; Via CEP e Geo usam uma forma oficial.
- **Solução:** tabela **`tbl_logradouro_canonico`** (ou sinônimos):
  - `variante_cadu` (como veio no cadastro, normalizado)
  - `logradouro_canonico` (nome usado na Geo / Via CEP)
  - Opcional: `bairro_canonico`, `cep_sugerido`.
- Preenchimento:
  - **Semi-automático:** extrair da `cadu_raw` (ou `vw_familias_limpa`) os valores distintos de logradouro normalizado; fazer **fuzzy match** (similaridade de texto, ex. Levenshtein ou trigram) contra os `endereco` normalizados da Geo; gerar lista de candidatos para revisão humana; após revisão, inserir em `tbl_logradouro_canonico`.
  - **Manual:** para os mais críticos (ex.: ruas com muitas famílias), preencher à mão.
- Uso: antes de comparar com Geo ou de chamar Via CEP, converter `logradouro_cadu_normalizado` → `logradouro_canonico` quando houver linha na tabela.

### Fase 3 – Via CEP com cache e regras claras

- **Não** chamar Via CEP em tempo real para cada consulta; usar em processo de **sanitização em lote** (noturno ou sob demanda).
- **Cache em tabela** `tbl_via_cep_cache`:
  - Chave: CEP (e opcionalmente UF+cidade+logradouro para busca reversa).
  - Colunas: resposta JSON ou campos extraídos (logradouro, bairro, localidade, UF), `updated_at`.
  - Evita repetir chamadas e permite auditoria.
- **Rate limit:** Via CEP é gratuito mas limitado; ex.: 1 req/s em batch, ou 50 req/dia; tratar 429 (Too Many Requests).
- **Quando usar:**
  1. **Por CEP:** CADU tem CEP; buscar na cache; se não tiver, chamar API e gravar. Comparar logradouro retornado com logradouro do CADU (após canônico). Se **batem** → CEP confiável; pode usar para cruzar com Geo se esse CEP existir na Geo. Se **não batem** → CEP “central” ou errado; **não** atribuir território só pelo CEP.
  2. **Por endereço (UF + cidade + logradouro):** quando o CEP do CADU não está na Geo ou quando CEP e endereço divergem. Usar logradouro **canônico** (fase 2). Via CEP retorna CEP(s); comparar com CEP do CADU. Se bater → endereço validado; usar CEP retornado para tentar match na Geo. Se não bater → flag para revisão (CEP errado no cadastro ou grafia ainda inadequada).

### Fase 4 – Regra de atribuição de territorialidade

- **Só atribuir** bairro/CRAS/lat-long da Geo quando:
  1. **Match CEP + logradouro:** CEP do CADU (ou CEP corrigido via Via CEP) existe na Geo **e** logradouro normalizado (ou canônico) do CADU é **igual ou muito similar** ao `endereco` normalizado da Geo; **ou**
  2. **Match por CEP único na Geo:** quando um CEP na Geo aparece em uma única linha (um único endereço); aí o CEP já identifica o logradouro; mesmo assim é mais seguro exigir que o logradouro do CADU seja parecido (evita CEP central usado em outro bairro).
- **Não atribuir** (deixar NULL ou “não georreferenciado”):
  - CEP do CADU não está na Geo e Via CEP não devolveu match com a Geo.
  - CEP bate na Geo mas logradouro do CADU é muito diferente (possível CEP central).
  - Via CEP indicou divergência CEP↔endereço e não há correção canônica.

- **Flag de confiança** (opcional): “alto” (CEP+logradouro batem), “médio” (só CEP, logradouro parecido), “baixo” (só CEP), “não atribuído”.

---

## Objetos sugeridos no banco

| Objeto | Uso |
|--------|-----|
| **tbl_geo** | Base de endereços/CEP do município (carga do geo.csv). |
| **norm_logradouro_para_match(...)** | Função que devolve string normalizada para comparação (tipo + título + nome, sem acento, abreviações padronizadas). |
| **tbl_logradouro_canonico** | Variante (CADU) → logradouro canônico (Geo/Via CEP). |
| **tbl_via_cep_cache** | Cache de respostas Via CEP (por CEP e/ou por endereço). |
| **mv_familias_geo** | Materialized view: famílias CADU que deram match na Geo (CEP + logradouro). Só entra quem bate na Geo. Expõe cep_geo, endereco_geo, bairro_geo, cras_geo, creas_geo, lat_geo, long_geo. Cruzamento: famílias/pessoas por código familiar com mv_familias_geo. Via CEP = enriquecer tbl_geo; refresh agrega mais famílias. | “seguro” (CEP + logradouro) entre `vw_familias_limpa` e `tbl_geo`, usando normalização e, quando existir, `|

---

## Ordem sugerida de implementação

1. Criar **tbl_geo** e carregar **geo.csv**.
2. Implementar **norm_logradouro_para_match** e aplicar em vista ou coluna calculada (Geo e CADU).
3. Fazer **view ou função** de match conservador: mesmo CEP **e** similaridade de logradouro (ex.: trigram ou Levenshtein acima de um limiar); só então atribuir bairro/CRAS/lat-long.
4. (Opcional) Criar **tbl_logradouro_canonico** e processo para preencher (exportar variantes do CADU, fuzzy match na Geo, revisão).
5. (Opcional) Implementar **tbl_via_cep_cache** e job em lote que: percorre famílias com CEP; consulta Via CEP; grava cache; compara CEP↔endereço e marca “confiável” ou “divergente”.
6. Refinar a view de territorialidade para usar canônico e Via CEP quando disponível.

---

## Resumo prático

- **Sim:** cruzar CEP **e** logradouro (normalizado/canônico); usar Via CEP em batch com cache para validar e, quando possível, corrigir CEP; exigir que endereço e CEP “combinem” antes de atribuir território.
- **Não:** cruzar só por CEP; atribuir bairro/CRAS quando o CEP for “central” e o endereço real for outro; chamar Via CEP em tempo real em toda consulta.
- **Grafia:** tabela de variantes (CADU → canônico) preenchida por fuzzy match + revisão humana reduz o problema das 8 formas de “Campos Elíseos” e permite usar Via CEP por endereço com mais sucesso.

Com isso você sanitiza ao máximo e evita jogar a territorialidade do cadastrador para um lugar que não existe.

---

## Carga da tabela Geo (tbl_geo)

1. **Criar a tabela:** executar `create_tbl_geo.sql` no banco (após `create_views_cadu.sql`, para existir `norm_cep`).
2. **Carregar o CSV:** usar um dos métodos abaixo.

### Opção A – Script Node (recomendado)

Na raiz do repositório, com `DATABASE_URL` definida:

```bash
node scripts/load-geo.js
```

O script lê `geo.csv`, insere em `tbl_geo` e preenche `cep_norm` com `norm_cep(cep)`.

### Opção B – COPY no Postgres

Com o arquivo `geo.csv` acessível pelo servidor Postgres (caminho absoluto):

```sql
\copy tbl_geo (endereco, bairro, cep, id_endereco, id_cidade, id_bairro, lat_char, long_char, lat_num, long_num, cras, creas) FROM 'caminho/para/geo.csv' WITH (FORMAT csv, HEADER true, NULL '');
UPDATE tbl_geo SET cep_norm = norm_cep(cep) WHERE cep_norm IS NULL;
```

Se o CSV tiver valores vazios para lat_num/long_num, pode ser necessário tratar (ex.: NULL ou 0). O script Node trata campos vazios como NULL.
