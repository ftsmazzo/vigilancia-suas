/**
 * Cria o primeiro usuário admin via API.
 * Uso: SEED_SECRET=xxx node scripts/seed-admin.js [email] [password]
 * Ou defina SEED_SECRET, ADMIN_EMAIL e ADMIN_PASSWORD no ambiente.
 */
const email = process.env.ADMIN_EMAIL || process.argv[2];
const password = process.env.ADMIN_PASSWORD || process.argv[3];
const baseUrl = process.env.APP_URL || 'http://localhost:3000';
const secret = process.env.SEED_SECRET;

if (!secret) {
  console.error('Defina SEED_SECRET no ambiente.');
  process.exit(1);
}
if (!email || !password) {
  console.error('Uso: ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/seed-admin.js');
  console.error('Ou: node scripts/seed-admin.js email@exemplo.com senha123');
  process.exit(1);
}

fetch(`${baseUrl}/api/admin/seed`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ secret, email, password, name: 'Administrador' }),
})
  .then((r) => r.json())
  .then((data) => {
    if (data.error) {
      console.error(data.error);
      process.exit(1);
    }
    console.log(data.message || data);
  })
  .catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  });
