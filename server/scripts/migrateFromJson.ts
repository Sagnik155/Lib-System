import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { connectDb, closeDb, db } from '../src/config/db.ts';
import { Author, Category, Book, Member, User, Transaction, Fine } from '../src/models/types.ts';

interface LegacyJsonStore {
  authors?: Author[];
  categories?: Category[];
  books?: Book[];
  members?: Member[];
  users?: User[];
  transactions?: Transaction[];
  fines?: Fine[];
}

export async function migrateFromJsonIfPresent(): Promise<boolean> {
  const jsonPath = path.resolve(process.cwd(), '.db_store.json');
  if (!fs.existsSync(jsonPath)) {
    return false;
  }

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const data: LegacyJsonStore = JSON.parse(raw);

  if (!data.books?.length || !data.users?.length) {
    return false;
  }

  await connectDb();
  await db.resetAll();

  const ops: Array<Promise<any>> = [];
  if (data.authors?.length) ops.push(db.authors.insertMany(data.authors.map(a => ({ ...a }))));
  if (data.categories?.length) ops.push(db.categories.insertMany(data.categories.map(c => ({ ...c }))));
  if (data.books?.length) ops.push(db.books.insertMany(data.books.map(b => ({ ...b }))));
  if (data.members?.length) ops.push(db.members.insertMany(data.members.map(m => ({ ...m }))));
  if (data.users?.length) ops.push(db.users.insertMany(data.users.map(u => ({ ...u }))));
  if (data.transactions?.length) ops.push(db.transactions.insertMany(data.transactions.map(t => ({ ...t }))));
  if (data.fines?.length) ops.push(db.fines.insertMany(data.fines.map(f => ({ ...f }))));

  await Promise.all(ops);

  console.log('✅ Migrated .db_store.json into MongoDB Atlas successfully:');
  console.log(`   Authors: ${data.authors?.length || 0}`);
  console.log(`   Categories: ${data.categories?.length || 0}`);
  console.log(`   Books: ${data.books?.length || 0}`);
  console.log(`   Members: ${data.members?.length || 0}`);
  console.log(`   Users: ${data.users?.length || 0}`);
  console.log(`   Transactions: ${data.transactions?.length || 0}`);
  console.log(`   Fines: ${data.fines?.length || 0}`);
  return true;
}

export async function migrateFromJson(): Promise<void> {
  const migrated = await migrateFromJsonIfPresent();
  if (!migrated) {
    throw new Error(
      `No valid .db_store.json file found at ${path.resolve(process.cwd(), '.db_store.json')}. Run "npm run seed" instead.`
    );
  }
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  migrateFromJson()
    .then(() => closeDb())
    .then(() => process.exit(0))
    .catch(async err => {
      console.error('Migration failed:', err);
      await closeDb();
      process.exit(1);
    });
}
