/*
# Issues del equipo Product

Las issues importadas de Linear también pueden ser del equipo Product (pedidos de las escuelas que
van al roadmap), además de CS y Tech. La migración es idempotente.
*/

ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_equipo_check;
ALTER TABLE issues ADD CONSTRAINT issues_equipo_check CHECK (equipo IN ('CS', 'Tech', 'Product'));
