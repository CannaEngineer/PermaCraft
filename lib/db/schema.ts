export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  created_at: number;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: number;
  created_at: number;
}

export interface Farm {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  acres: number | null;
  climate_zone: string | null;
  rainfall_inches: number | null;
  soil_type: string | null;
  center_lat: number;
  center_lng: number;
  zoom_level: number;
  is_public: number;
  created_at: number;
  updated_at: number;
}

export interface Zone {
  id: string;
  farm_id: string;
  name: string | null;
  zone_type: string; // 'farm_boundary' | 'zone' | 'feature'
  geometry: string; // GeoJSON
  properties: string | null; // JSON - for farm_boundary: { name, area_acres, area_hectares }
  created_at: number;
  updated_at: number;
}

export interface Species {
  id: string;
  common_name: string;
  scientific_name: string;
  layer: string;
  native_regions: string | null; // JSON (deprecated, use broad_regions)
  is_native: number;
  years_to_maturity: number | null;
  mature_height_ft: number | null;
  mature_width_ft: number | null;
  sun_requirements: string | null;
  water_requirements: string | null;
  hardiness_zones: string | null; // Deprecated, use min/max
  description: string | null;
  contributed_by: string | null;
  created_at: number;

  // New permaculture fields
  permaculture_functions: string | null; // JSON array
  companion_plants: string | null; // JSON array
  zone_placement_notes: string | null;
  edible_parts: string | null; // JSON object
  sourcing_notes: string | null;

  // New geographic fields
  broad_regions: string | null; // JSON array
  min_hardiness_zone: string | null;
  max_hardiness_zone: string | null;
  min_rainfall_inches: number | null;
  max_rainfall_inches: number | null;
  ai_generated: number;
}

export interface Planting {
  id: string;
  farm_id: string;
  zone_id: string | null;
  species_id: string;
  name: string | null;
  lat: number;
  lng: number;
  planted_year: number | null;
  current_year: number;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export interface MapSnapshot {
  id: string;
  farm_id: string;
  snapshot_type: string;
  url: string;
  created_at: number;
}

export interface AIConversation {
  id: string;
  farm_id: string;
  title: string | null;
  created_at: number;
  updated_at: number;
}

export interface AIAnalysis {
  id: string;
  farm_id: string;
  conversation_id: string | null;
  user_query: string;
  screenshot_data: string | null; // Base64 image data
  map_layer: string | null; // satellite, street, terrain
  zones_context: string | null; // JSON array of zone info
  ai_response: string;
  model: string | null;
  created_at: number;
}

export interface FarmCollaborator {
  id: string;
  farm_id: string;
  user_id: string;
  role: string;
  created_at: number;
}

export interface RegionalKnowledge {
  id: string;
  region: string;
  climate_zone: string | null;
  knowledge_type: string;
  content: string;
  contributed_by: string | null;
  created_at: number;
}

// Social Feed Types

export interface FarmPost {
  id: string;
  farm_id: string;
  author_id: string;
  post_type: 'text' | 'photo' | 'ai_insight';

  content: string | null;
  media_urls: string | null; // JSON array

  ai_conversation_id: string | null;
  ai_analysis_id: string | null;
  ai_response_excerpt: string | null;

  tagged_zones: string | null; // JSON array
  hashtags: string | null; // JSON array

  view_count: number;
  reaction_count: number;
  comment_count: number;

  is_published: number;
  is_draft: number;

  created_at: number;
  updated_at: number;
}

export interface PostComment {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  author_id: string;

  content: string;
  reaction_count: number;

  is_deleted: number;
  is_flagged: number;

  created_at: number;
  updated_at: number;
}

export interface PostReaction {
  id: string;
  post_id: string | null;
  comment_id: string | null;
  user_id: string;

  reaction_type: 'heart' | 'seedling' | 'bulb' | 'fire';

  created_at: number;
}

export interface Notification {
  id: string;
  user_id: string;

  notification_type: 'comment' | 'reply' | 'reaction' | 'mention';

  post_id: string | null;
  comment_id: string | null;
  triggered_by_user_id: string | null;

  content_preview: string | null;
  is_read: number;

  created_at: number;
}

export interface SavedPost {
  id: string;
  user_id: string;
  post_id: string;
  created_at: number;
}

export interface PostView {
  id: string;
  post_id: string;
  user_id: string | null;
  created_at: number;
}
