-- Example native species (customize for your region)

INSERT INTO species (id, common_name, scientific_name, layer, native_regions, is_native, years_to_maturity, mature_height_ft, mature_width_ft, sun_requirements, water_requirements, hardiness_zones, description)
VALUES
  ('sp-oak', 'White Oak', 'Quercus alba', 'canopy', '["Eastern US", "Midwest"]', 1, 30, 80, 80, 'Full sun', 'Medium', '3-9', 'Majestic native oak providing food and habitat'),
  ('sp-maple', 'Sugar Maple', 'Acer saccharum', 'canopy', '["Eastern US", "Northeast"]', 1, 30, 75, 50, 'Full sun to part shade', 'Medium', '3-8', 'Excellent shade tree with fall color'),
  ('sp-serviceberry', 'Serviceberry', 'Amelanchier canadensis', 'understory', '["Eastern US"]', 1, 3, 20, 15, 'Full sun to part shade', 'Medium', '4-8', 'Spring flowers, edible berries, fall color'),
  ('sp-redbud', 'Eastern Redbud', 'Cercis canadensis', 'understory', '["Eastern US"]', 1, 5, 25, 25, 'Full sun to part shade', 'Medium', '4-9', 'Beautiful spring blooms, nitrogen fixer'),
  ('sp-hazelnut', 'American Hazelnut', 'Corylus americana', 'shrub', '["Eastern US"]', 1, 3, 10, 10, 'Full sun to part shade', 'Medium', '4-9', 'Edible nuts, wildlife habitat'),
  ('sp-elderberry', 'American Elderberry', 'Sambucus canadensis', 'shrub', '["Eastern US"]', 1, 2, 12, 12, 'Full sun to part shade', 'Wet to medium', '3-9', 'Edible flowers and berries, medicinal'),
  ('sp-goldenrod', 'Goldenrod', 'Solidago spp.', 'herbaceous', '["North America"]', 1, 1, 4, 2, 'Full sun', 'Dry to medium', '3-9', 'Important pollinator plant, late season blooms'),
  ('sp-milkweed', 'Common Milkweed', 'Asclepias syriaca', 'herbaceous', '["North America"]', 1, 1, 4, 2, 'Full sun', 'Dry to medium', '3-9', 'Essential for monarch butterflies'),
  ('sp-clover', 'White Clover', 'Trifolium repens', 'groundcover', '["Europe", "naturalized"]', 0, 1, 0.5, 2, 'Full sun to part shade', 'Medium', '3-10', 'Nitrogen fixer, pollinator support'),
  ('sp-grape', 'Wild Grape', 'Vitis spp.', 'vine', '["North America"]', 1, 3, 30, 10, 'Full sun', 'Medium', '4-9', 'Edible fruit, wildlife food, shade');
