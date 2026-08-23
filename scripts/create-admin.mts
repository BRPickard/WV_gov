/**
 * Creates an administrator:
 *
 *   npm run create-admin -- "Ada Bell" ada@wv.gov "a-long-password"
 *
 * Sign-up is closed in the app, so this is the only way the first account comes
 * into existence. Everyone after that is added from the admin console.
 */
import { createUserAccount } from "../lib/users";

const [name, email, password] = process.argv.slice(2);

if (!name || !email || !password) {
  console.error('Usage: npm run create-admin -- "<full name>" <email> <password>');
  process.exit(1);
}

const result = await createUserAccount({ name, email, password, role: "admin" });

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

console.log(`✓ administrator ${email} created`);
process.exit(0);
