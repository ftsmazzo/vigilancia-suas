# Estrutura Família vs Pessoa – Vigilância Socioassistencial

## Princípio: não misturar família (d_) e pessoa (p_)

- **Família (prefixo d_):** chave = **código familiar** (ibge + cod_familiar). Nem toda família tem “pessoa de referência do cadastro” (RF) assinalada; ~900 famílias não têm RF.
- **Pessoa (prefixo p_):** chave = **NIS**; quando não houver NIS, usar **CPF**.

## Fontes de dados

| Fonte | Chave família | Chave pessoa | O que traz |
|-------|----------------|--------------|------------|
| **cadu_raw** | d_cd_ibge, d_cod_familiar_fam | p_num_nis_pessoa_atual, p_num_cpf_pessoa | Famílias e pessoas (vw_familias_limpa, vw_pessoas_limpa). |
| **Folha de Pagamento** | ibge, cod_familiar | nis, cpf | Benefícios Liberados e Bloqueados (por código familiar). |
| **Bloqueados** | ibge, cod_familiar | nis, cpf | Motivo do bloqueio (em geral mesmos da Folha). |
| **Cancelados** | ibge, cod_familiar | **não tem** | Status Cancelado e Motivo. Só código familiar. |
| **Visitas** | – | **cpf** | Agendamentos nos CRAS (famílias que precisam de visita). |

## Fluxo para Vigilância (Visitas + situação do benefício)

1. **Nível família (d_):**  
   União Folha + Bloqueados + Cancelados → uma linha por **(ibge, cod_familiar)** com **sit_fam** (LIBERADO/BLOQUEADO/CANCELADO) e **motivo_bloqueio** / **motivo_cancelamento**. Sem dados de pessoa.

2. **CPF por família (para cruzar com Visitas):**  
   Visitas cruza por **CPF**. É preciso ter **todos os CPFs** das famílias nas 3 situações:
   - **Folha:** CPF (e NIS) vêm da própria planilha.
   - **Bloqueados:** CPF (e NIS) vêm da própria planilha.
   - **Cancelados:** **só tem cod_familiar** → CPF (e NIS) vêm do **CADU** (vw_pessoas_limpa) por (ibge, cod_familiar).

3. **View final para a ação:**  
   Visitas + situação da família + motivo (bloqueio/cancelamento), cruzando por **CPF** (sanitizado).

## Objetos propostos

| Objeto | Nível | Chave | Uso |
|--------|--------|--------|-----|
| **mv_familia_situacao** | Família (d_) | ibge, cod_familiar | Situação e motivos por família; sem pessoa. |
| **mv_cpf_familia_situacao** | Pessoa (p_) | cpf_sanit (e nis) | CPFs de Folha + Bloqueados + CADU (cancelados); um CPF pode aparecer em mais de uma família. |
| **vw_cpf_situacao** | Pessoa | cpf_sanit | Uma linha por CPF com sit_fam e motivos (para cruzar com Visitas). |
| **vw_filtro_controle** | – | – | Visitas + situacao_familia + motivo_bloqueio + motivo_cancelamento (join por CPF). |
| **vw_folha_rf** | Família | ibge, cod_familiar | Uma linha por família para BI; RF quando existir, senão qualquer pessoa da família ou da Folha (não exige RF). |

## Ordem de execução

1. **create_view_familia_cpf_visitas.sql** – Cria `mv_familia_situacao`, `mv_cpf_familia_situacao`, `vw_cpf_situacao`, `vw_filtro_controle`.
2. **refresh_familia_cpf_visitas.sql** – `REFRESH MATERIALIZED VIEW mv_familia_situacao;` e `mv_cpf_familia_situacao`.
3. **create_view_folha_rf.sql** – Cria as MVs da folha e `vw_folha_rf` (uma linha por família para BI; inclui famílias sem RF).
4. **refresh_folha_rf.sql** – REFRESH das MVs da folha.

A view **vw_filtro_controle** (Visitas + situação) é criada em **create_view_familia_cpf_visitas.sql** e passa a usar **vw_cpf_situacao** (CPF de Folha + Bloqueados + CADU para Cancelados).

## Próxima etapa (georreferenciamento)

- Cruzar por **CEP** e, quando possível, por **rua + bairro** (base geo com ruas, bairros, CEPs).
- CEP errado na base (ex.: bairro real Simioni, CEP traz Centro) → validar com Via CEP quando possível; ruas/bairros com grafia incorreta em etapa posterior.
