import bcrypt from 'bcryptjs';
import { db } from '../src/config/db.ts';
import { User } from '../src/models/types.ts';

export async function createLibrarian(email = 'admin.librarian@college.edu', password = 'password123') {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.users.find(u => u.email.toLowerCase() === normalizedEmail);

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

  db.users.push(user);
  db.save();

  console.log('✅ Librarian created successfully:');
  console.log(`   Email: ${normalizedEmail}`);
  console.log(`   Password: ${password}`);
  return user;
}

// Auto-run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const email = process.argv[2] || 'admin.librarian@college.edu';
  const password = process.argv[3] || 'password123';
  createLibrarian(email, password)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Failed to create librarian:', err);
      process.exit(1);
    });
}
