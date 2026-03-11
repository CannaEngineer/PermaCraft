-- Tour Enhancements: Virtual vs In-Person tours, navigation, AI generation, sharing
-- Adds tour_type distinction, route/navigation data, AI-assisted creation, and social sharing fields

-- Add new columns to farm_tours
ALTER TABLE farm_tours ADD COLUMN tour_type TEXT NOT NULL DEFAULT 'in_person' CHECK(tour_type IN ('virtual', 'in_person'));
ALTER TABLE farm_tours ADD COLUMN route_mode TEXT DEFAULT 'walking' CHECK(route_mode IN ('walking', 'driving', 'cycling'));
ALTER TABLE farm_tours ADD COLUMN route_geometry TEXT; -- GeoJSON LineString of the full route between stops
ALTER TABLE farm_tours ADD COLUMN total_distance_meters REAL;
ALTER TABLE farm_tours ADD COLUMN ai_generated INTEGER DEFAULT 0;
ALTER TABLE farm_tours ADD COLUMN ai_model TEXT;
ALTER TABLE farm_tours ADD COLUMN tags TEXT; -- JSON array of tags for discovery
ALTER TABLE farm_tours ADD COLUMN og_image_url TEXT; -- Custom Open Graph image for sharing
ALTER TABLE farm_tours ADD COLUMN embed_enabled INTEGER DEFAULT 1;
ALTER TABLE farm_tours ADD COLUMN featured INTEGER DEFAULT 0; -- Featured on gallery

-- Add navigation and media fields to tour_stops
ALTER TABLE tour_stops ADD COLUMN navigation_hint TEXT; -- e.g. "Turn left at the oak tree"
ALTER TABLE tour_stops ADD COLUMN direction_from_previous TEXT; -- e.g. "Head north along the path for 50m"
ALTER TABLE tour_stops ADD COLUMN distance_from_previous_meters REAL;
ALTER TABLE tour_stops ADD COLUMN heading_degrees REAL; -- Compass bearing to this stop
ALTER TABLE tour_stops ADD COLUMN ar_marker_id TEXT; -- For future AR overlay support
ALTER TABLE tour_stops ADD COLUMN virtual_media_url TEXT; -- 360 photo/video for virtual tours
ALTER TABLE tour_stops ADD COLUMN virtual_media_type TEXT CHECK(virtual_media_type IN ('photo_360', 'video_360', 'photo', 'video', 'embed'));
ALTER TABLE tour_stops ADD COLUMN ai_generated INTEGER DEFAULT 0;
ALTER TABLE tour_stops ADD COLUMN ai_description TEXT; -- AI-generated description for the stop
ALTER TABLE tour_stops ADD COLUMN quiz_question TEXT; -- Optional interactive quiz
ALTER TABLE tour_stops ADD COLUMN quiz_options TEXT; -- JSON array of options
ALTER TABLE tour_stops ADD COLUMN quiz_answer_index INTEGER; -- Correct answer index

CREATE INDEX IF NOT EXISTS idx_farm_tours_type ON farm_tours(tour_type);
CREATE INDEX IF NOT EXISTS idx_farm_tours_featured ON farm_tours(featured);
