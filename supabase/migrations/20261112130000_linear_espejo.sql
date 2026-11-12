/*
# Loops e issues como espejo de Linear

1. `escuelas.linear_alias`: nombres con los que la escuela aparece en los títulos de Linear, separados por coma.
   El primero es el prefijo que se usa al crear (`[St. Francis] ...`). Un alias con "~" (el nombre del grupo)
   solo cuenta si el título no nombra a ningún colegio concreto. Si es NULL, la escuela no se sincroniza
   (las escuelas demo quedan solo en el hub).
2. `escuelas.linear_label`: label de la escuela en el equipo CS de Linear (opcional; varias escuelas pueden compartirlo).
3. `issues.linear_uuid` y `loops.linear_uuid`: id interno de Linear. Un loop es una issue de CS con el label "Loop";
   sus sub-issues son las issues ligadas.
4. `linear_sync`: marca de la última sincronización completa (la usa la función linear-sync).
*/

ALTER TABLE escuelas ADD COLUMN IF NOT EXISTS linear_alias text;
ALTER TABLE escuelas ADD COLUMN IF NOT EXISTS linear_label text;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS linear_uuid text;
ALTER TABLE loops ADD COLUMN IF NOT EXISTS linear_uuid text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_issues_linear_uuid ON issues(linear_uuid);
CREATE UNIQUE INDEX IF NOT EXISTS idx_loops_linear_uuid ON loops(linear_uuid);

CREATE TABLE IF NOT EXISTS linear_sync (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ultima_sync timestamptz,
  ultimo_error text
);
ALTER TABLE linear_sync ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "linear_sync_select_equipo" ON linear_sync;
CREATE POLICY "linear_sync_select_equipo" ON linear_sync FOR SELECT TO authenticated USING (public.es_miembro_equipo());
GRANT SELECT ON linear_sync TO authenticated;
INSERT INTO linear_sync (id) VALUES (1) ON CONFLICT DO NOTHING;

UPDATE escuelas SET linear_alias = 'St. Francis,St Francis,Saint Francis', linear_label = 'St. Francis' WHERE slug = 'st-francis';
UPDATE escuelas SET linear_alias = 'Colina,CLC', linear_label = 'Colina' WHERE slug = 'clc';
UPDATE escuelas SET linear_alias = 'British Zona Sul,British Urca,British Botafogo,British School Botafogo', linear_label = 'British School' WHERE slug = 'bsrjzs';
UPDATE escuelas SET linear_alias = 'British Barra,British/Barra,British School Barra', linear_label = 'British School' WHERE slug = 'bsrjb';
UPDATE escuelas SET linear_alias = 'Transforma / IE José Olaya,José Olaya,Jose Olaya,~Grupo Transforma,~Transforma', linear_label = 'Transforma' WHERE slug = 'jose-olaya';
UPDATE escuelas SET linear_alias = 'Transforma / IE 0040,IE 0040', linear_label = 'Transforma' WHERE slug = 'ie-0040';
UPDATE escuelas SET linear_alias = 'Transforma / IE VMMN,VMMN,Virgen María Madre de los Niños', linear_label = 'Transforma' WHERE slug = 'ie-vmmn';
