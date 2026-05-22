// POST /api/storage/upload
//
// Faz upload de um arquivo para o bucket "pdfs" do Supabase Storage usando o
// SERVICE_ROLE_KEY (server-side) — bypassa RLS sem precisar configurar policies
// permissivas no bucket público.
//
// Recebe multipart/form-data com `arquivo` (File). Retorna a URL pública do
// objeto carregado.
//
// Por que server-side? Em desenvolvimento o cliente do Supabase usa anon key
// e não consegue inserir no bucket sem policy explícita. O service role
// bypassa todas as policies. Como o key é secreto (env), o upload tem que
// passar pelo backend.

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "pdfs";

export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return Response.json(
        { ok: false, error: "Supabase não configurado (URL/SERVICE_ROLE_KEY)." },
        { status: 500 }
      );
    }

    const form = await req.formData();
    const file = form.get("arquivo");
    if (!(file instanceof File)) {
      return Response.json(
        { ok: false, error: 'Campo "arquivo" obrigatório (File).' },
        { status: 400 }
      );
    }

    // Validação de tipo e tamanho
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp", "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
    if (file.size > MAX_SIZE) {
      return Response.json({ ok: false, error: "Arquivo excede 10MB" }, { status: 400 });
    }
    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      return Response.json({ ok: false, error: `Tipo não permitido: ${file.type}` }, { status: 400 });
    }

    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Garante o bucket existe e é público (idempotente, no-op se já existir)
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b) => b.name === BUCKET)) {
      await supabase.storage.createBucket(BUCKET, { public: true });
    }

    const path = `roteiros/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const buffer = new Uint8Array(await file.arrayBuffer());

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: file.type || "application/pdf",
        upsert: true,
      });

    if (error) {
      return Response.json(
        { ok: false, error: `Falha no upload: ${error.message}` },
        { status: 500 }
      );
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
    return Response.json({
      ok: true,
      url: pub.publicUrl,
      path: data.path,
      size: file.size,
      contentType: file.type,
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
