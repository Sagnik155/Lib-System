import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDb, closeDb, db, exactCaseInsensitive } from '../src/config/db.ts';
import { User } from '../src/models/types.ts';

export async function createLibrarian(
  email = 'admin.librarian@college.edu',
  password = 'password123'
) {
  if (!db.isConnected()) {
    await connectDb();
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await db.users.findOne(
    { email: exactCaseInsensitive(normalizedEmail) },
    { projection: { _id: 0 } }
  );

  if (existing) {
    console.log(`⚠️ User with email ${normalizedEmail} already exists (role: ${existing.role}).`);
    return existing;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();

  const user: User = {
    id: `usr_librarian_${Date.now()}`,
    email: normalizedEmail,
    passwordHash,
    role: 'librarian',
    createdAt: now,
    updatedAt: now,
  };

  await db.users.insertOne({ ...user });

  console.log('✅ Librarian created successfully in MongoDB Atlas:');
  console.log(`   Email: ${normalizedEmail}`);
  console.log(`   Password: ${password}`);
  return user;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const email = process.argv[2] || 'admin.librarian@college.edu';
  const password = process.argv[3] || 'password123';
  connectDb()
    .then(() => createLibrarian(email, password))
    .then(() => closeDb())
    .then(() => process.exit(0))
    .catch(async err => {
      console.error('Failed to create librarian:', err);
      await closeDb();
      process.exit(1);
    });
}
