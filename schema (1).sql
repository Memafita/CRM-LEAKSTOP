-- ============================================================
-- Triagem Tecnica IA - Schema do banco (Supabase / PostgreSQL)
-- COMO USAR: painel Supabase -> SQL Editor -> cole isto -> Run
-- ============================================================

create table if not exists public.triagens (
  id               uuid primary key default gen_random_uuid(),
  protocolo        text not null,
  criado_em        timestamptz not null default now(),
  nome             text not null,
  telefone         text,
  categoria        text not null,
  modelo           text,
  defeito          text not null,
  pre_diagnostico  text,
  estimativa_min   integer,
  estimativa_max   integer,
  prazo            text,
  dia_agendado     text,
  periodo_agendado text,
  flag_queda       boolean,
  flag_liquido     boolean,
  flag_tentou      boolean,
  consentimento_em timestamptz not null,
  whatsapp_lojista text not null,
  status           text not null default 'aberta',
  concluida_em     timestamptz,
  excluida_em      timestamptz
);

create index if not exists idx_triagens_protocolo on public.triagens (protocolo);
create index if not exists idx_triagens_whatsapp  on public.triagens (whatsapp_lojista);
create index if not exists idx_triagens_criado    on public.triagens (criado_em);

alter table public.triagens enable row level security;
comment on table public.triagens is
  'Ordens de triagem tecnica. Exclusao logica via excluida_em/status (Art. 18 LGPD).';
