import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function run() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Allow public inserts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pdfs');
    `);
    console.log("Insert policy created.");
  } catch(e: any) { 
    if (e.message?.includes("already exists")) console.log("Insert policy already exists.");
    else console.log(e); 
  }
  
  try {
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Allow public selects" ON storage.objects FOR SELECT USING (bucket_id = 'pdfs');
    `);
    console.log("Select policy created.");
  } catch(e: any) { 
    if (e.message?.includes("already exists")) console.log("Select policy already exists.");
    else console.log(e); 
  }

  await prisma.$disconnect();
}
run();
