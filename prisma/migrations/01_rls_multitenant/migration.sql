-- Kromuz V2 — Hardening multi-tenant via Row-Level Security (Postgres / Supabase)
-- Resolve a Dívida D1 do dossiê (multi-tenancy aplicada de forma inconsistente).
--
-- Estratégia: cada request define `app.empresa_id` no contexto; toda política
-- RLS filtra automaticamente por essa variável. O `super_admin` bypassa via
-- claim no JWT (`role = 'super_admin'`).
--
-- Como aplicar:
--   - Após `prisma migrate dev`, este SQL deve ser executado manualmente no Supabase
--     ou via `prisma db execute --file ./prisma/migrations/01_rls_multitenant/migration.sql`.

-- Helper: empresa_id atual a partir do JWT do Supabase (claim `empresa_id`)
CREATE OR REPLACE FUNCTION public.current_empresa_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT NULLIF(
    coalesce(
      current_setting('request.jwt.claims', true)::jsonb->>'empresa_id',
      current_setting('app.empresa_id', true)
    ),
    ''
  )::uuid;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT coalesce(
    current_setting('request.jwt.claims', true)::jsonb->>'role',
    current_setting('app.role', true)
  ) = 'super_admin';
$$;

-- Habilita RLS em todas as tabelas tenant-aware
ALTER TABLE public.empresa              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_perfil       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banco                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convenio             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banco_convenio       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produto_credito      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regra_produto_credito ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roteiro_operacional  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.importacao_pdf       ENABLE ROW LEVEL SECURITY;

-- Política padrão: tenant isolation por empresa_id (super_admin vê tudo)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'usuario_perfil','banco','convenio','banco_convenio','produto_credito',
    'regra_produto_credito','roteiro_operacional','importacao_pdf'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY tenant_isolation_select ON public.%I FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())',
      t
    );
    EXECUTE format(
      'CREATE POLICY tenant_isolation_insert ON public.%I FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin())',
      t
    );
    EXECUTE format(
      'CREATE POLICY tenant_isolation_update ON public.%I FOR UPDATE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin()) WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin())',
      t
    );
    EXECUTE format(
      'CREATE POLICY tenant_isolation_delete ON public.%I FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())',
      t
    );
  END LOOP;
END
$$;

-- Empresa: cada usuário vê só a sua empresa (ou todas se super_admin)
CREATE POLICY empresa_self ON public.empresa
  FOR SELECT
  USING (id = public.current_empresa_id() OR public.is_super_admin());

CREATE POLICY empresa_update ON public.empresa
  FOR UPDATE
  USING (id = public.current_empresa_id() OR public.is_super_admin())
  WITH CHECK (id = public.current_empresa_id() OR public.is_super_admin());

-- Índices que beneficiam o RLS (todos começam por empresa_id)
CREATE INDEX IF NOT EXISTS idx_regra_empresa_banco_ativa
  ON public.regra_produto_credito (empresa_id, banco_id, ativa);

CREATE INDEX IF NOT EXISTS idx_importacao_empresa_status
  ON public.importacao_pdf (empresa_id, status);

CREATE INDEX IF NOT EXISTS idx_roteiro_empresa_banco
  ON public.roteiro_operacional (empresa_id, banco_id);

-- BRIN para séries temporais (resolve P3 quando chegarmos em 40M de extratos)
CREATE INDEX IF NOT EXISTS idx_importacao_created_brin
  ON public.importacao_pdf USING brin (created_at);

COMMENT ON FUNCTION public.current_empresa_id IS
  'Retorna o empresa_id da sessão atual lendo do JWT (claim empresa_id) ou da variável de sessão app.empresa_id.';
