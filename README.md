# Vigilância SUAS

Projeto Vigilância Socioassistencial: dados CADU, SIBEC, visitas e aplicação web para consulta e manutenção.

## Repositório

- **GitHub:** [ftsmazzo/vigilancia-suas](https://github.com/ftsmazzo/vigilancia-suas)

## Conteúdo

- **`web/`** – Aplicação Next.js (login, consulta, admin, refresh de views).
- **`create_schema_app.sql`** – Schema e tabela de usuários da aplicação (aplicado automaticamente na primeira subida do container).
- **Scripts SQL** – Criação de tabelas/views do banco vigilancia (CADU, SIBEC, visitas).
- **N8N** – Documentação e códigos dos workflows de carga.

## Deploy no EasyPanel

Instruções completas em **[DEPLOY-EASYPANEL.md](./DEPLOY-EASYPANEL.md)**.

Resumo: clone o repositório no EasyPanel, use o **Dockerfile** na raiz, defina as variáveis (`DATABASE_URL`, `JWT_SECRET`, opcionalmente `SEED_SECRET`) e exponha a porta **3000**. O script do banco é aplicado automaticamente na primeira implantação.

## Dados grandes

Os arquivos `Dezembro/tudo.csv`, `Janeiro/tudo.csv` e `SIBEC-FOLHA_PAGAMENTO.csv` não estão no repositório (limite do GitHub). Mantenha-os localmente ou em outro armazenamento para cargas via N8N.
