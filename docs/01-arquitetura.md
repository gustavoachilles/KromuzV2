# Kromuz V2 — Arquitetura (Sprint 1)

## Decisões aprovadas

| Camada | Tecnologia | Por quê |
|---|---|---|
| Framework | Next.js 16 (App Router) + TypeScript | RSC + file-based routing + SSR para resolver tenant antes do render |
| Banco | PostgreSQL 17 no Supabase | RLS nativo, partitioning, pgvector, escala vertical até 40M+ rows |
| ORM | Prisma 7 | Tipagem automática, Migrate versionado |
| LLM | Vercel AI SDK 6 + Gemini 3.1 Pro + Claude Sonnet 4.6 | PDF nativo, fallback automático, structured output Zod |
| UI | Tailwind 4 + shadcn/ui (manual) + framer-motion + lucide | Premium, leve, customizável |
| Auth | Supabase Auth (Sprint 2) | JWT com `empresa_id` no claim → RLS lê direto do JWT |

## Multi-tenant via RLS

A grande dívida `D1` do Base44 é resolvida no novo banco com Row-Level Security:

1. Cada request define `app.empresa_id` (ou usa o claim do JWT)
2. Toda tabela tenant-aware tem 4 policies (SELECT/INSERT/UPDATE/DELETE)
3. Super admin bypassa via claim `role = 'super_admin'`
4. Índices compostos sempre começam por `empresa_id` (RLS é gratuito quando o índice já filtra)
5. SQL em [`prisma/migrations/01_rls_multitenant/migration.sql`](../prisma/migrations/01_rls_multitenant/migration.sql)

## Capacidade — 40M registros INSS

| Item | Estratégia |
|---|---|
| Extrato INSS contratos | Partitioning por `competencia` (range mensal) |
| Beneficiários | Hash partitioning por `cpf_hash` |
| Índices | BRIN em `created_at` + B-Tree composto começando por `empresa_id` |
| Hot/cold | Partições > 1 ano em storage frio |
| Read replicas | Supabase nativo para analytics |
| Ingestão massiva | `COPY FROM` via worker Inngest (batches 10k) |

## Pipeline do Motor de Regras

```
PDF/Imagem → POST /api/motor-regras/extrair-pdf
            ├─ cria ImportacaoPDF (status=processando)
            ├─ Vercel AI SDK → Gemini 3.1 Pro (multimodal nativo)
            │  └─ fallback: Claude Sonnet 4.6
            ├─ generateText + Output.object(RespostaLLMSchema)
            ├─ pós-processa (zeros que significam null)
            ├─ casa banco (substring + criação automática)
            ├─ enriquece com sugestões de produto/convênio
            └─ retorna regras estruturadas com sugestões
```

Todos os campos do prompt foram preservados do `extrairRegraDePDF` legado:

- 9 regras críticas (parcelas mín pagas condicionais, troco mínimo, saldo devedor máx, etc)
- Regras especiais para cartão (limite mín/máx, fator RMC)
- Regras de marcação de zeros como null
- Restrições por espécie (com idade mínima e exceção)

## Estrutura de pastas

```
kromuz/
├── prisma/
│   ├── schema.prisma                       # Modelos do Sprint 1
│   ├── migrations/01_rls_multitenant/      # SQL com RLS
│   └── seed/index.ts                       # Convênios + bancos + produtos canônicos
├── src/
│   ├── app/
│   │   ├── (app)/
│   │   │   ├── layout.tsx                  # Shell autenticado (sidebar)
│   │   │   └── motor-regras/page.tsx       # Tela do Motor
│   │   ├── api/
│   │   │   └── motor-regras/extrair-pdf/route.ts
│   │   └── page.tsx                        # Landing pública
│   ├── components/
│   │   ├── ui/                             # Primitives shadcn-style
│   │   └── motor-regras/ImportadorPDF.tsx  # Componente core
│   └── lib/
│       ├── prisma.ts
│       ├── supabase/{server,client}.ts
│       ├── utils.ts
│       └── motor-regras/
│           ├── schema.ts                   # Zod schemas
│           ├── prompt.ts                   # Prompt do LLM
│           ├── extrair.ts                  # Pipeline LLM (Gemini→Claude)
│           └── sugestoes.ts                # Match banco/produto/convênio
└── docs/01-arquitetura.md                  # Este arquivo
```

## Como rodar localmente

1. `cp .env.example .env.local` e preencher (Supabase, Gemini, Anthropic)
2. `npm run db:setup` (gera client, push schema, aplica RLS, seed de bancos/convênios)
3. `npm run dev` e abrir <http://localhost:3000/motor-regras>

## Próximos passos (alinhado ao Plano Mestre)

- **Sprint 2:** Auth + tela de cadastro de empresa, parser de extrato INSS, modelos `Lead`/`Proposta`
- **Sprint 3:** Wizard de propostas + esteira Kanban
- **Sprint 4:** Comissões com SLA, dashboards, indicadores de mercado
