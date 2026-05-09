// Generate a scrypt password hash suitable for AUTH_USERS_JSON.
//
//   node scripts/hash-password.mjs <email> <password> "<name>" "<company>" <slug>
//
// Prints a JSON object you can merge into the AUTH_USERS_JSON env var.

import { hashPassword } from '../api/_lib/auth.mjs';

const [, , email, password, name, company, slug] = process.argv;
if (!email || !password || !name || !company || !slug) {
  console.error('usage: node scripts/hash-password.mjs <email> <password> "<name>" "<company>" <slug>');
  process.exit(1);
}

const hash = await hashPassword(password);
const entry = { [email.toLowerCase()]: { hash, name, company, slug } };
console.log(JSON.stringify(entry, null, 2));
