-- Seed de Categorias Financeiras padrão para a empresa ativa
-- Buscar o empresaId mais recente e popular as categorias iniciais

DO $$
DECLARE
  v_empresa_id UUID;
BEGIN
  SELECT id INTO v_empresa_id FROM empresa ORDER BY created_at DESC LIMIT 1;
  
  IF v_empresa_id IS NULL THEN
    RAISE NOTICE 'Nenhuma empresa encontrada';
    RETURN;
  END IF;

  -- RECEITAS
  INSERT INTO categoria_financeira (id, empresa_id, nome, tipo, grupo, icone, cor, ordem, ativo, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_empresa_id, 'Comissões Bancárias', 'RECEITA', 'Operacional', 'dollar-sign', '#10b981', 1, true, NOW(), NOW()),
    (gen_random_uuid(), v_empresa_id, 'Bonificações', 'RECEITA', 'Operacional', 'gift', '#059669', 2, true, NOW(), NOW()),
    (gen_random_uuid(), v_empresa_id, 'Outras Receitas', 'RECEITA', 'Diversas', 'plus-circle', '#14b8a6', 3, true, NOW(), NOW())
  ON CONFLICT (empresa_id, nome) DO NOTHING;

  -- DESPESAS FIXAS
  INSERT INTO categoria_financeira (id, empresa_id, nome, tipo, grupo, icone, cor, ordem, ativo, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_empresa_id, 'Aluguel', 'DESPESA', 'Fixas', 'building', '#f43f5e', 1, true, NOW(), NOW()),
    (gen_random_uuid(), v_empresa_id, 'Energia Elétrica', 'DESPESA', 'Fixas', 'zap', '#ef4444', 2, true, NOW(), NOW()),
    (gen_random_uuid(), v_empresa_id, 'Água', 'DESPESA', 'Fixas', 'droplets', '#e11d48', 3, true, NOW(), NOW()),
    (gen_random_uuid(), v_empresa_id, 'Internet / Telefone', 'DESPESA', 'Fixas', 'wifi', '#dc2626', 4, true, NOW(), NOW()),
    (gen_random_uuid(), v_empresa_id, 'Contabilidade', 'DESPESA', 'Fixas', 'calculator', '#b91c1c', 5, true, NOW(), NOW()),
    (gen_random_uuid(), v_empresa_id, 'Seguros', 'DESPESA', 'Fixas', 'shield', '#9f1239', 6, true, NOW(), NOW())
  ON CONFLICT (empresa_id, nome) DO NOTHING;

  -- DESPESAS VARIÁVEIS
  INSERT INTO categoria_financeira (id, empresa_id, nome, tipo, grupo, icone, cor, ordem, ativo, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_empresa_id, 'Marketing / Tráfego', 'DESPESA', 'Marketing', 'megaphone', '#f59e0b', 1, true, NOW(), NOW()),
    (gen_random_uuid(), v_empresa_id, 'Software e SaaS', 'DESPESA', 'Variáveis', 'monitor', '#eab308', 2, true, NOW(), NOW()),
    (gen_random_uuid(), v_empresa_id, 'Material de Escritório', 'DESPESA', 'Variáveis', 'package', '#d97706', 3, true, NOW(), NOW()),
    (gen_random_uuid(), v_empresa_id, 'Transporte / Combustível', 'DESPESA', 'Variáveis', 'car', '#ca8a04', 4, true, NOW(), NOW()),
    (gen_random_uuid(), v_empresa_id, 'Alimentação / Copa', 'DESPESA', 'Variáveis', 'utensils', '#a16207', 5, true, NOW(), NOW()),
    (gen_random_uuid(), v_empresa_id, 'Manutenção / Reparos', 'DESPESA', 'Variáveis', 'wrench', '#92400e', 6, true, NOW(), NOW())
  ON CONFLICT (empresa_id, nome) DO NOTHING;

  -- FOLHA
  INSERT INTO categoria_financeira (id, empresa_id, nome, tipo, grupo, icone, cor, ordem, ativo, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_empresa_id, 'Salários', 'DESPESA', 'Folha', 'users', '#6366f1', 1, true, NOW(), NOW()),
    (gen_random_uuid(), v_empresa_id, 'Comissões de Vendedores', 'DESPESA', 'Folha', 'dollar-sign', '#818cf8', 2, true, NOW(), NOW()),
    (gen_random_uuid(), v_empresa_id, 'Encargos (INSS/FGTS)', 'DESPESA', 'Folha', 'shield', '#7c3aed', 3, true, NOW(), NOW()),
    (gen_random_uuid(), v_empresa_id, 'Vale-Transporte', 'DESPESA', 'Folha', 'bus', '#a78bfa', 4, true, NOW(), NOW()),
    (gen_random_uuid(), v_empresa_id, 'Vale-Refeição', 'DESPESA', 'Folha', 'utensils', '#8b5cf6', 5, true, NOW(), NOW())
  ON CONFLICT (empresa_id, nome) DO NOTHING;

  -- IMPOSTOS
  INSERT INTO categoria_financeira (id, empresa_id, nome, tipo, grupo, icone, cor, ordem, ativo, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_empresa_id, 'DAS (Simples Nacional)', 'IMPOSTO', 'Tributos', 'receipt', '#f97316', 1, true, NOW(), NOW()),
    (gen_random_uuid(), v_empresa_id, 'ISS', 'IMPOSTO', 'Tributos', 'landmark', '#fb923c', 2, true, NOW(), NOW()),
    (gen_random_uuid(), v_empresa_id, 'IRPJ / CSLL', 'IMPOSTO', 'Tributos', 'file-text', '#fdba74', 3, true, NOW(), NOW()),
    (gen_random_uuid(), v_empresa_id, 'PIS / COFINS', 'IMPOSTO', 'Tributos', 'percent', '#fed7aa', 4, true, NOW(), NOW())
  ON CONFLICT (empresa_id, nome) DO NOTHING;

  RAISE NOTICE 'Categorias financeiras inseridas com sucesso para empresa %', v_empresa_id;
END $$;
