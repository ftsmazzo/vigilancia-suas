# Deploy no EasyPanel – Vigilância Web

## Repositório

- **GitHub:** https://github.com/ftsmazzo/vigilancia-suas

## Configuração no EasyPanel

1. **Novo serviço** → **Docker** (ou “From GitHub”).
2. **Repositório:** `ftsmazzo/vigilancia-suas` (ou URL completa).
3. **Build:**
   - **Build Context:** `.` (raiz do repositório)
   - **Dockerfile path:** `Dockerfile` (está na raiz)
4. **Porta:** exponha a porta **3000**.
5. **Variáveis de ambiente:** use o arquivo `easypanel.env.example` como referência e defina no painel:
   - `DATABASE_URL` – connection string do Postgres (banco `vigilancia`)
   - `JWT_SECRET` – chave forte para JWT
   - `SEED_SECRET` (opcional) – para criar o primeiro admin via API

## Primeira implantação

- Na **primeira subida**, o container executa automaticamente o script `create_schema_app.sql` no banco (schema `app` e tabela `app.users`). É idempotente (`IF NOT EXISTS`).
- Depois disso, inicia a aplicação Next.js.

## Criar o primeiro usuário admin

Com a aplicação no ar e `SEED_SECRET` definido:

```bash
curl -X POST https://SEU-DOMINIO/api/admin/seed \
  -H "Content-Type: application/json" \
  -d '{"secret":"VALOR_DE_SEED_SECRET","email":"admin@seu-dominio.com","password":"SuaSenhaSegura"}'
```

Ou use o script (com a app rodando):

```bash
SEED_SECRET=xxx APP_URL=https://SEU-DOMINIO node web/scripts/seed-admin.js admin@email.com SenhaSegura
```

## Atualizar após mudanças no GitHub

Depois de dar push no repositório, o EasyPanel **não atualiza sozinho** a menos que esteja configurado para deploy automático. Para ver as mudanças:

1. Abra o serviço **Vigilância** no EasyPanel.
2. Use **Redeploy** (ou **Build** / **Deploy**) para fazer um novo build a partir do GitHub e subir o container de novo.

Se o serviço foi criado com **GitHub** como fonte, verifique se existe opção de **Auto Deploy** (deploy automático a cada push); ative se quiser que cada push dispare um novo deploy.

## Variáveis (resumo)

| Variável       | Obrigatório | Descrição                          |
|----------------|-------------|-------------------------------------|
| DATABASE_URL   | Sim         | Postgres (banco vigilancia)         |
| JWT_SECRET     | Sim         | Chave para tokens de login         |
| SEED_SECRET    | Não         | Chave para criar primeiro admin    |
