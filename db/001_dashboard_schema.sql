-- db/001_dashboard_schema.sql
-- Read-only-consumer tables owned by dashboard-bloqbase. Nothing else
-- writes to this schema. Safe to re-run.

create schema if not exists dashboard;

create table if not exists dashboard.marketing_diario (
  id bigserial primary key,
  fecha date not null unique,
  clicks_30d integer not null default 0,
  impresiones_30d integer not null default 0,
  posicion_media numeric(5,2),
  paginas_publicadas integer not null default 0,
  paginas_total integer not null default 0,
  formularios_iniciados_30d integer not null default 0,
  formularios_completados_30d integer not null default 0,
  oportunidades_pendientes integer not null default 0,
  spark_clicks_12sem jsonb not null default '[]'::jsonb,
  oportunidades jsonb not null default '[]'::jsonb,
  redes jsonb not null default '[]'::jsonb,
  generado_en timestamptz not null default now()
);

create table if not exists dashboard.ventas_diario (
  id bigserial primary key,
  fecha date not null unique,
  llamadas_7d integer not null default 0,
  llamadas_positivas_7d integer not null default 0,
  leads_nuevos_semana integer not null default 0,
  llamadas_recientes jsonb not null default '[]'::jsonb,
  pipeline_prospeccion jsonb not null default '[]'::jsonb,
  generado_en timestamptz not null default now()
);

create table if not exists dashboard.sync_log (
  id bigserial primary key,
  seccion text not null,
  ok boolean not null,
  error text,
  ejecutado_en timestamptz not null default now()
);
