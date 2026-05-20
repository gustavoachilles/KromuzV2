import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function run() {
  console.log("Criando bucket 'pdfs'...");
  const { data, error } = await supabase.storage.createBucket('pdfs', {
    public: true,
    fileSizeLimit: 52428800, // 50MB
  });
  if (error) {
    if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
      console.log("Bucket já existe.");
    } else {
      console.error("Erro ao criar bucket:", error);
    }
  } else {
    console.log("Bucket criado:", data);
  }
}
run();
