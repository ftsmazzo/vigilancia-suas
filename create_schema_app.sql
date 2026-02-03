-- =============================================================================
-- Schema da aplicação web Vigilância (usuários e sessões)
-- Executar uma vez no banco vigilancia.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE IF NOT EXISTS app.users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name       VARCHAR(255),
  role       VARCHAR(20) NOT NULL DEFAULT 'consult' CHECK (role IN ('consult', 'admin')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_app_users_email ON app.users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON app.users(role);

COMMENT ON TABLE app.users IS 'Usuários da aplicação web Vigilância (login e nível de acesso)';

-- Usuário admin inicial (senha: admin123) – ALTERAR EM PRODUÇÃO
-- INSERT INTO app.users (email, password_hash, name, role)
-- VALUES ('admin@vigilancia.local', '$2a$10$rQnM1.H/L8QJxZ8QZ8QZ8uKpQZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8', 'Administrador', 'admin');
-- Gerar hash com: bcrypt.hashSync('admin123', 10)
