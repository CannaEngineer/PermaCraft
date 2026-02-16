-- Add default layers for existing farms that don't have any

-- For each farm without layers, create default layer set
-- Zones layer
INSERT INTO design_layers (id, farm_id, name, color, description, visible, locked, display_order)
SELECT
  f.id || '-layer-zones',
  f.id,
  'Zones',
  NULL,
  'Zone boundaries and areas',
  1,
  0,
  1
FROM farms f
WHERE NOT EXISTS (
  SELECT 1 FROM design_layers dl WHERE dl.farm_id = f.id
);

-- Plantings layer
INSERT INTO design_layers (id, farm_id, name, color, description, visible, locked, display_order)
SELECT
  f.id || '-layer-plantings',
  f.id,
  'Plantings',
  '#22c55e',
  'Individual plants and trees',
  1,
  0,
  2
FROM farms f
WHERE NOT EXISTS (
  SELECT 1 FROM design_layers dl WHERE dl.farm_id = f.id AND dl.name = 'Plantings'
);

-- Water Systems layer
INSERT INTO design_layers (id, farm_id, name, color, description, visible, locked, display_order)
SELECT
  f.id || '-layer-water',
  f.id,
  'Water Systems',
  '#0ea5e9',
  'Swales, ponds, and water flow',
  1,
  0,
  3
FROM farms f
WHERE NOT EXISTS (
  SELECT 1 FROM design_layers dl WHERE dl.farm_id = f.id AND dl.name = 'Water Systems'
);

-- Infrastructure layer
INSERT INTO design_layers (id, farm_id, name, color, description, visible, locked, display_order)
SELECT
  f.id || '-layer-infrastructure',
  f.id,
  'Infrastructure',
  '#64748b',
  'Paths, fences, and structures',
  1,
  0,
  4
FROM farms f
WHERE NOT EXISTS (
  SELECT 1 FROM design_layers dl WHERE dl.farm_id = f.id AND dl.name = 'Infrastructure'
);

-- Annotations layer
INSERT INTO design_layers (id, farm_id, name, color, description, visible, locked, display_order)
SELECT
  f.id || '-layer-annotations',
  f.id,
  'Annotations',
  '#8b5cf6',
  'Notes and labels',
  1,
  0,
  5
FROM farms f
WHERE NOT EXISTS (
  SELECT 1 FROM design_layers dl WHERE dl.farm_id = f.id AND dl.name = 'Annotations'
);
