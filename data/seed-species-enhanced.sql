-- Update existing species with enhanced data
UPDATE species SET
  permaculture_functions = '["wildlife_habitat","acorn_production","shade_provider"]',
  companion_plants = '["Serviceberry","American Hazelnut"]',
  zone_placement_notes = 'Excellent for Zone 2-3 as canopy anchor. Too large for Zone 1.',
  edible_parts = '{"acorns":"fall (after leaching)"}',
  sourcing_notes = 'Available at most native plant nurseries in the Eastern US.',
  broad_regions = '["Northeast","Mid_Atlantic","Southeast","Midwest"]',
  min_hardiness_zone = '3',
  max_hardiness_zone = '9',
  min_rainfall_inches = 25,
  max_rainfall_inches = 60
WHERE id = 'sp-oak';

UPDATE species SET
  permaculture_functions = '["edible_fruit","pollinator_support","wildlife_habitat","spring_flowers"]',
  companion_plants = '["White Oak","Eastern Redbud"]',
  zone_placement_notes = 'Perfect for Zone 1-2 understory. Plant under larger canopy trees.',
  edible_parts = '{"berries":"early summer"}',
  sourcing_notes = 'Widely available at native nurseries. Easy to establish.',
  broad_regions = '["Northeast","Mid_Atlantic","Southeast"]',
  min_hardiness_zone = '4',
  max_hardiness_zone = '8',
  min_rainfall_inches = 30,
  max_rainfall_inches = 50
WHERE id = 'sp-serviceberry';

UPDATE species SET
  permaculture_functions = '["nitrogen_fixer","spring_flowers","pollinator_support"]',
  companion_plants = '["Serviceberry","Elderberry"]',
  zone_placement_notes = 'Great for Zone 1-2 as ornamental and nitrogen source.',
  edible_parts = '{}',
  sourcing_notes = 'Common at nurseries. Grows quickly.',
  broad_regions = '["Northeast","Mid_Atlantic","Southeast","Midwest"]',
  min_hardiness_zone = '4',
  max_hardiness_zone = '9',
  min_rainfall_inches = 25,
  max_rainfall_inches = 55
WHERE id = 'sp-redbud';

UPDATE species SET
  permaculture_functions = '["edible_nuts","wildlife_food","thicket_former"]',
  companion_plants = '["Elderberry","Eastern Redbud"]',
  zone_placement_notes = 'Excellent for Zone 1-2. Forms thickets for wildlife.',
  edible_parts = '{"nuts":"fall"}',
  sourcing_notes = 'Available at specialty native nurseries. Can be slow to establish.',
  broad_regions = '["Northeast","Mid_Atlantic","Midwest"]',
  min_hardiness_zone = '4',
  max_hardiness_zone = '9',
  min_rainfall_inches = 25,
  max_rainfall_inches = 50
WHERE id = 'sp-hazelnut';

UPDATE species SET
  permaculture_functions = '["edible_fruit","medicinal","pollinator_support","wildlife_habitat"]',
  companion_plants = '["American Hazelnut","Goldenrod"]',
  zone_placement_notes = 'Zone 1-2 for easy harvest. Tolerates wet areas.',
  edible_parts = '{"flowers":"spring","berries":"late summer"}',
  sourcing_notes = 'Common at native nurseries. Very adaptable.',
  broad_regions = '["Northeast","Mid_Atlantic","Southeast","Midwest"]',
  min_hardiness_zone = '3',
  max_hardiness_zone = '9',
  min_rainfall_inches = 30,
  max_rainfall_inches = 60
WHERE id = 'sp-elderberry';

UPDATE species SET
  permaculture_functions = '["pollinator_support","late_season_nectar","dynamic_accumulator"]',
  companion_plants = '["Common Milkweed","White Clover"]',
  zone_placement_notes = 'Zone 2-4. Important for pollinators. Spreads readily.',
  edible_parts = '{}',
  sourcing_notes = 'Easy to grow from seed. Often free from conservation districts.',
  broad_regions = '["Northeast","Mid_Atlantic","Southeast","Midwest","West"]',
  min_hardiness_zone = '3',
  max_hardiness_zone = '9',
  min_rainfall_inches = 15,
  max_rainfall_inches = 45
WHERE id = 'sp-goldenrod';

UPDATE species SET
  permaculture_functions = '["pollinator_support","monarch_host","wildlife_habitat"]',
  companion_plants = '["Goldenrod","native grasses"]',
  zone_placement_notes = 'Zone 2-4. Essential for monarchs. Spreads by rhizomes.',
  edible_parts = '{}',
  sourcing_notes = 'Free seeds from conservation groups. Easy to establish.',
  broad_regions = '["Northeast","Mid_Atlantic","Southeast","Midwest"]',
  min_hardiness_zone = '3',
  max_hardiness_zone = '9',
  min_rainfall_inches = 20,
  max_rainfall_inches = 50
WHERE id = 'sp-milkweed';

UPDATE species SET
  permaculture_functions = '["nitrogen_fixer","groundcover","pollinator_support"]',
  companion_plants = '["fruit trees","pasture grasses"]',
  zone_placement_notes = 'Zone 0-3. Excellent living mulch under trees.',
  edible_parts = '{}',
  sourcing_notes = 'Widely available. Naturalized in North America.',
  broad_regions = '["Northeast","Mid_Atlantic","Southeast","Midwest","West","Pacific_Northwest"]',
  min_hardiness_zone = '3',
  max_hardiness_zone = '10',
  min_rainfall_inches = 20,
  max_rainfall_inches = 50,
  ai_generated = 0
WHERE id = 'sp-clover';

UPDATE species SET
  permaculture_functions = '["edible_fruit","wildlife_food","vertical_layer","erosion_control"]',
  companion_plants = '["tree supports","forest edge plants"]',
  zone_placement_notes = 'Zone 2-4. Needs strong support structure.',
  edible_parts = '{"fruit":"fall"}',
  sourcing_notes = 'Cuttings often available from other growers. Easy to propagate.',
  broad_regions = '["Northeast","Mid_Atlantic","Southeast","Midwest"]',
  min_hardiness_zone = '4',
  max_hardiness_zone = '9',
  min_rainfall_inches = 25,
  max_rainfall_inches = 55
WHERE id = 'sp-grape';
