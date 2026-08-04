-- Tabla que guarda el progreso de cada estudiante, identificado por su correo.
-- Requiere que ya cuentes con autorización para recolectar nombre y correo.
create table progreso (
  correo text primary key,
  nombre text not null,
  xp_literal integer default 0,
  xp_inferencial integer default 0,
  xp_critico integer default 0,
  nivel integer default 1,
  xp_to_level integer default 30,
  badges jsonb default '[]'::jsonb,
  casos_resueltos integer default 0,
  creado_en timestamptz default now(),
  actualizado_en timestamptz default now()
);

-- Índice para que el panel docente pueda listar por fecha de actividad reciente
create index progreso_actualizado_idx on progreso (actualizado_en desc);

-- Migración: nivel y meta de XP independientes por competencia (literal, inferencial,
-- crítico), en vez de un único nivel/meta compartido entre las tres.
alter table progreso add column if not exists competencias_nivel jsonb default
  '{"literal":{"level":1,"xpToLevel":30},"inferencial":{"level":1,"xpToLevel":30},"critico":{"level":1,"xpToLevel":30}}'::jsonb;
