import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';

/**
 * Local/server-side administrator bootstrap and promotion utility.
 *
 * Usage (credentials are never written to source control):
 *   ADMIN_EMAIL='admin@example.com' ADMIN_PASSWORD='use-a-unique-password' npm run admin:create
 *
 * An existing account with that email is promoted; otherwise a new ADMIN is
 * created. The password is bcrypt-hashed before it reaches PostgreSQL.
 */
async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_NAME?.trim() || undefined;
  const connectionString = process.env.DATABASE_URL;

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('Set ADMIN_EMAIL to a valid administrator email.');
  }
  if (!password || password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error('Set ADMIN_PASSWORD to an 8–72 character password containing a letter and a number.');
  }
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const pool = new Pool({ connectionString, max: 1 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: Role.ADMIN, passwordHash, ...(fullName ? { fullName } : {}) },
      });
      console.log(`Administrator access granted to ${email}.`);
    } else {
      await prisma.user.create({
        data: { email, passwordHash, fullName, role: Role.ADMIN },
      });
      console.log(`Administrator account created for ${email}.`);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  // Deliberately do not print environment values or credentials.
  console.error(error instanceof Error ? error.message : 'Could not create administrator account.');
  process.exitCode = 1;
});
