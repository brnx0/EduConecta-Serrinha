BEGIN;

-- Aulas de junho/2026 (dias úteis) para a turma 54307 (ADRYAN), 4 disciplinas/tempos.
WITH dias AS (
  SELECT d::date AS data
  FROM generate_series('2026-06-01'::date, '2026-06-30'::date, '1 day') d
  WHERE extract(dow FROM d) BETWEEN 1 AND 5
),
disc AS (
  SELECT * FROM (VALUES (109,1),(141,2),(116,3),(121,4)) AS t(disciplina_cod, tempo)
),
novas AS (
  INSERT INTO aula (turma_cod, disciplina_cod, data, tempo_ordem, realizada)
  SELECT 54307, disc.disciplina_cod, dias.data, disc.tempo, true
  FROM dias CROSS JOIN disc
  RETURNING id, data, tempo_ordem
)
INSERT INTO presenca (aula_id, matricula_cod, status, origem)
SELECT n.id, 951399,
  CASE
    WHEN extract(day FROM n.data) = 10 AND n.tempo_ordem = 2 THEN 'falta_justificada'
    WHEN extract(day FROM n.data) IN (12, 19) AND n.tempo_ordem = 4 THEN 'falta'
    ELSE 'presente'
  END,
  'sistema'
FROM novas n;

COMMIT;
