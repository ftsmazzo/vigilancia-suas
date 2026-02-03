# Vigilância Web

Aplicação web para consulta e manutenção dos dados do projeto Vigilância Socioassistencial.

## Funcionalidades

- **Login** com e-mail e senha
- **Níveis de acesso**: Consulta (somente leitura) e Admin (manutenção)
- **Consulta**: listagem de views/tabelas e visualização de dados (paginação simples)
- **Manutenção (admin)**:
  - Refresh de materialized views (Família/CPF/Visitas e Folha RF)
  - Upload de arquivos raw (em breve: CADU, SIBEC, Visitas)

## Pré-requisitos

- Node.js 20+
- PostgreSQL (banco `vigilancia`) com schema `app` e tabela `app.users`

## Configuração

1. **Schema do app no Postgres** (uma vez):

   No banco `vigilancia`, execute o script na raiz do repositório:

   ```bash
   psql -d vigilancia -f ../create_schema_app.sql
   ```

2. **Variáveis de ambiente** (crie `.env.local` na pasta `web`):

   ```env
   DATABASE_URL=postgresql://usuario:senha@host:5432/vigilancia
   JWT_SECRET=uma-chave-secreta-forte
   SEED_SECRET=chave-para-criar-primeiro-admin
   ```

3. **Primeiro usuário admin**:

   Opção A – via API (com a aplicação rodando):

   ```bash
   curl -X POST http://localhost:3000/api/admin/seed \
     -H "Content-Type: application/json" \
     -d '{"secret":"SEED_SECRET","email":"admin@exemplo.com","password":"SuaSenhaSegura"}'
   ```

   Opção B – via script (com a aplicação rodando):

   ```bash
   SEED_SECRET=sua-chave APP_URL=http://localhost:3000 node scripts/seed-admin.js admin@exemplo.com SuaSenhaSegura
   ```

   Opção C – inserção direta no Postgres (gerar hash com `bcrypt.hashSync('senha', 10)` e inserir em `app.users`).

## Desenvolvimento

```bash
cd web
npm install
npm run dev
```

Acesse `http://localhost:3000`. Página de login em `/login`.

## Build e produção

```bash
npm run build
npm start
```

## Deploy no EasyPanel

1. **Repositório**: suba o projeto (incluindo a pasta `web`) para o GitHub.

2. **EasyPanel**:
   - Crie um novo serviço do tipo **Docker**.
   - **Build Context**: pasta do repositório (raiz ou `web`).
   - Se o repositório for a raiz do projeto Vigilância:
     - **Dockerfile path**: `web/Dockerfile`
     - **Context**: `.` (raiz) ou `web` (se EasyPanel permitir context em subpasta).
   - Se o repositório contiver só o código da aplicação web, coloque o `Dockerfile` na raiz e use context `.`.

3. **Variáveis de ambiente** no EasyPanel:
   - `DATABASE_URL`: connection string do Postgres (vigilancia)
   - `JWT_SECRET`: chave para JWT (produção)
   - `SEED_SECRET`: (opcional) para criar primeiro admin via API

4. **Porta**: exponha a porta 3000 (ou a que o serviço usar).

5. **Banco**: garanta que o Postgres esteja acessível pela rede (mesmo host ou URL pública) e que `create_schema_app.sql` já tenha sido executado no banco `vigilancia`.

## Estrutura

- `app/` – App Router (Next.js): páginas e API routes
- `app/(dashboard)/` – rotas autenticadas (início, consulta, admin)
- `app/api/auth/` – login, logout, me
- `app/api/admin/` – refresh views, seed (admin)
- `app/api/data/` – listagem de views e consulta read-only
- `components/` – AppShell (sidebar e layout)
- `lib/` – db, auth, refresh-sql
