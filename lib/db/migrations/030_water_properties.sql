-- Extend lines table with water properties
ALTER TABLE lines ADD COLUMN water_properties TEXT;

-- Extend zones table with catchment and swale properties
ALTER TABLE zones ADD COLUMN catchment_properties TEXT;
ALTER TABLE zones ADD COLUMN swale_properties TEXT;

-- Example JSON structures (documented in comments):
-- water_properties: {"flow_type":"surface","flow_rate_estimate":"5 gpm","source_feature_id":"zone-123","destination_feature_id":"pond-456"}
-- catchment_properties: {"is_catchment":true,"rainfall_inches_per_year":40,"estimated_capture_gallons":15000,"destination_feature_id":"swale-789"}
-- swale_properties: {"is_swale":true,"length_feet":150,"cross_section_width_feet":3,"cross_section_depth_feet":1.5,"estimated_volume_gallons":2500,"overflow_destination_id":"pond-101"}
