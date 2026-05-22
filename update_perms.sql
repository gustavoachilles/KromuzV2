UPDATE "cargo" SET permissoes = permissoes || '{"rh": true, "contabil": true}'::jsonb WHERE lower(nome) LIKE '%admin%' OR lower(nome) LIKE '%gerente%';
