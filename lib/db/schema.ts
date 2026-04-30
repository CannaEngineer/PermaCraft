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
  layer_ids: string | null; // JSON array of layer IDs
  phase_id: string | null;
  catchment_properties: string | null; // JSON: CatchmentProperties
  swale_properties: string | null; // JSON: SwaleProperties
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

  // User-contributed custom species (added in migration 106)
  // is_custom = 1 marks plants users added themselves; created_by_user_id and
  // farm_id scope the entry so customs only appear in the picker for the
  // owning user / farm.
  created_by_user_id: string | null;
  farm_id: string | null;
  is_custom: number;
}

export interface Planting {
  id: string;
  farm_id: string;
  zone_id: string | null;
  species_id: string;
  // Optional cultivar/variety pinned to this planting (added in migration 106).
  // Lets users record "Chestnut → Colossal" instead of just "Chestnut".
  variety_id: string | null;
  name: string | null;
  lat: number;
  lng: number;
  // GPS provenance for placement (added in migration 106). placement_method
  // distinguishes pins dropped via on-device GPS from those set by clicking
  // the map; accuracy_meters and altitude_meters come from the GeolocationAPI
  // and are useful for auditing how trustworthy a coordinate is.
  placement_accuracy_meters: number | null;
  placement_altitude_meters: number | null;
  placement_method: 'gps' | 'map_click' | 'manual' | 'imported' | null;
  placement_recorded_at: number | null;
  planted_year: number | null;
  current_year: number;
  notes: string | null;
  layer_ids: string | null; // JSON array of layer IDs
  phase_id: string | null;
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
  farm_id: string | null;
  user_id: string;
  conversation_type: 'general' | 'farm';
  title: string | null;
  created_at: number;
  updated_at: number;
}

export interface AIAnalysis {
  id: string;
  farm_id: string | null;
  conversation_id: string | null;
  user_query: string;
  screenshot_data: string | null; // Base64 image data
  map_layer: string | null; // satellite, street, terrain
  zones_context: string | null; // JSON array of zone info
  ai_response: string;
  model: string | null;
  generated_image_url: string | null; // R2 URL of AI-generated sketch
  created_at: number;
}

export interface FarmCollaborator {
  id: string;
  farm_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'commenter' | 'viewer';
  invited_by: string;
  invited_at: number;
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

export interface FarmerGoal {
  id: string;
  farm_id: string;
  goal_category: string;
  description: string;
  priority: number;
  targets: string | null; // JSON array as string
  timeline: string;
  status: string;
  created_at: number;
  updated_at: number;
}

// Learning System Types

export interface LearningPath {
  id: string;
  name: string;
  slug: string;
  description: string;
  target_audience: string;
  estimated_lessons: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  icon_name: string;
  created_at: number;
}

export interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_name: string;
  created_at: number;
}

export interface Lesson {
  id: string;
  topic_id: string;
  title: string;
  slug: string;
  description: string;
  content: string; // JSON structure with core_content, images, quiz, etc.
  content_type: 'text' | 'interactive' | 'video' | 'mixed';
  estimated_minutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisite_lesson_ids: string | null; // JSON array
  xp_reward: number;
  order_index: number;
  created_at: number;
  updated_at: number;
}

export interface PathLesson {
  id: string;
  learning_path_id: string;
  lesson_id: string;
  order_index: number;
  is_required: number; // 1 = required, 0 = optional
  created_at: number;
}

export interface LearningPathTopic {
  id: string;
  learning_path_id: string;
  topic_id: string;
  emphasis_level: 'core' | 'supplementary' | 'optional';
  created_at: number;
}

export interface UserProgress {
  id: string;
  user_id: string;
  learning_path_id: string | null;
  current_level: number;
  total_xp: number;
  created_at: number;
  updated_at: number;
}

export interface LessonCompletion {
  id: string;
  user_id: string;
  lesson_id: string;
  completed_at: number;
  xp_earned: number;
  quiz_score: number | null; // 0-100
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  badge_type: 'foundation' | 'mastery' | 'path_completion';
  tier: number; // 1, 2, 3
  unlock_criteria: string; // JSON: {type: 'lesson', lesson_id: '...'} or {type: 'score', min_score: 90}
  created_at: number;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: number;
}

export interface PracticeFarm {
  id: string;
  user_id: string;
  lesson_id: string | null;
  name: string;
  description: string | null;
  center_lat: number;
  center_lng: number;
  zoom_level: number;
  ai_grade: number | null; // 0-100
  ai_feedback: string | null; // JSON from grading
  submitted_for_review: number;
  created_at: number;
  updated_at: number;
}

export interface PracticeZone {
  id: string;
  practice_farm_id: string;
  name: string | null;
  zone_type: string;
  geometry: string; // GeoJSON
  properties: string | null;
  created_at: number;
  updated_at: number;
}

export interface PracticePlanting {
  id: string;
  practice_farm_id: string;
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

export interface ContextualHint {
  id: string;
  trigger_type: 'first_zone' | 'first_planting' | 'water_feature' | 'ai_analysis' | 'help_icon';
  lesson_id: string;
  hint_text: string;
  priority: number;
  created_at: number;
}

export interface UserHintDismissal {
  id: string;
  user_id: string;
  hint_id: string;
  dismissed_at: number;
}

export interface AITutorConversation {
  id: string;
  user_id: string;
  lesson_id: string;
  messages: string; // JSON array of {role, content}
  created_at: number;
  updated_at: number;
}

// Annotation System Types

export interface Annotation {
  id: string;
  farm_id: string;
  feature_id: string;
  feature_type: 'zone' | 'planting' | 'line';
  design_rationale: string;
  rich_notes: string | null;
  tags: string | null; // JSON array as TEXT
  created_at: number;
  updated_at: number;
  created_by: string;
}

export interface MediaAttachment {
  id: string;
  annotation_id: string;
  type: 'image' | 'video';
  file_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  display_order: number;
  uploaded_at: number;
}

export interface ExternalLink {
  id: string;
  annotation_id: string;
  url: string;
  title: string;
  description: string | null;
  display_order: number;
}

// Design Layers Types

export interface DesignLayer {
  id: string;
  farm_id: string;
  name: string;
  color: string | null;
  description: string | null;
  visible: number; // SQLite boolean (0/1)
  locked: number; // SQLite boolean (0/1)
  display_order: number;
  created_at: number;
}

// Comments System Types

export interface Comment {
  id: string;
  farm_id: string;
  user_id: string;
  feature_id: string | null;
  feature_type: 'zone' | 'planting' | 'line' | 'general';
  content: string; // HTML from Tiptap
  parent_comment_id: string | null;
  resolved: number; // SQLite boolean
  created_at: number;
  updated_at: number;
}

// Line Drawing System Types (Track 2)

export interface Line {
  id: string;
  farm_id: string;
  user_id: string;
  geometry: string; // GeoJSON LineString as TEXT
  line_type: 'swale' | 'flow_path' | 'fence' | 'hedge' | 'contour' | 'custom';
  label: string | null;
  style: string; // JSON: LineStyle
  layer_ids: string | null; // JSON array
  water_properties: string | null; // JSON: WaterProperties
  created_at: number;
  updated_at: number;
}

export interface LineStyle {
  color: string; // Hex
  width: number; // Pixels
  dashArray?: number[]; // [2, 2] for dashed
  opacity: number; // 0-1
  arrowDirection?: 'none' | 'forward' | 'reverse' | 'both';
}

export interface WaterProperties {
  flow_type: 'surface' | 'underground' | 'seasonal';
  flow_rate_estimate?: string;
  source_feature_id?: string;
  destination_feature_id?: string;
}

export interface CatchmentProperties {
  is_catchment: boolean;
  rainfall_inches_per_year?: number;
  estimated_capture_gallons?: number;
  destination_feature_id?: string;
}

export interface SwaleProperties {
  is_swale: boolean;
  length_feet?: number;
  cross_section_width_feet?: number;
  cross_section_depth_feet?: number;
  estimated_volume_gallons?: number;
  overflow_destination_id?: string;
}

export interface CustomImagery {
  id: string;
  farm_id: string;
  user_id: string;
  label: string;
  source_url: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  tile_url_template: string | null;
  bounds: string; // JSON [[west, south], [east, north]]
  alignment_corners: string | null; // JSON [[lng1, lat1], ...]
  opacity: number;
  visible: number; // SQLite boolean
  created_at: number;
  updated_at: number;
}

export interface ImageryBounds {
  southwest: [number, number];
  northeast: [number, number];
}

export interface ImageryAlignment {
  corners: [[number, number], [number, number], [number, number], [number, number]];
}

// Phasing System Types

export interface Phase {
  id: string;
  farm_id: string;
  name: string;
  description: string | null;
  start_date: number | null; // Unix timestamp
  end_date: number | null;
  color: string; // Hex color
  display_order: number;
  created_at: number;
  updated_at: number;
}

// Guild Builder Types

export interface GuildTemplate {
  id: string;
  name: string;
  description: string | null;
  climate_zones: string | null; // JSON string array
  focal_species_id: string;
  companion_species: string; // JSON CompanionSpecies[]
  spacing_rules: string | null; // JSON SpacingRules
  benefits: string | null; // JSON string array
  is_public: number; // SQLite boolean
  created_by: string;
  created_at: number;
  updated_at: number;
}

export interface CompanionSpecies {
  species_id: string;
  layer: string;
  min_distance_feet: number;
  max_distance_feet: number;
  count: number;
  cardinal_direction?: 'N' | 'S' | 'E' | 'W' | 'any';
}

export interface SpacingRules {
  canopy_radius_feet: number;
  understory_radius_feet?: number;
  shrub_radius_feet?: number;
}

// Plant Varieties Types

export interface PlantVariety {
  id: string;
  species_id: string;

  // Identity
  variety_name: string;
  common_aliases: string | null; // JSON array
  patent_number: string | null;
  introduction_year: number | null;

  // Classification
  variety_type: 'cultivar' | 'hybrid' | 'heirloom' | 'wild_selection';
  breeding_program: string | null;

  // Elite characteristics
  elite_characteristics: string | null; // JSON object
  awards: string | null; // JSON array

  // Performance
  hardiness_zone_min: string | null;
  hardiness_zone_max: string | null;
  chill_hours_required: number | null;
  days_to_maturity: number | null;
  yield_rating: 'low' | 'medium' | 'high' | 'exceptional' | null;

  // Descriptive
  description: string | null;
  flavor_notes: string | null;
  color_description: string | null;
  size_description: string | null;

  // Sourcing
  sourcing_notes: string | null;
  average_price_usd: number | null;
  availability: 'common' | 'specialty' | 'rare' | null;

  // Photos
  image_url: string | null;
  gallery_urls: string | null; // JSON array

  // Ratings
  user_rating_avg: number | null;
  expert_rating: number | null;
  popularity_score: number;

  // Meta
  created_at: number;
  updated_at: number;
  created_by: string | null;

  // Hierarchy & ownership (added in migration 106)
  // parent_variety_id lets varieties nest — e.g., a species "Chestnut" has a
  // variety "Colossal", and "Colossal" can have its own sub-varieties.
  // is_custom + farm_id let users add private varieties scoped to one farm.
  parent_variety_id: string | null;
  is_custom: number;
  farm_id: string | null;
}

// Expanded interface with species info joined
export interface PlantVarietyWithSpecies extends PlantVariety {
  species_common_name: string;
  species_scientific_name: string;
  species_layer: string;
}

// Community Engagement Types

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  parent_comment_id: string | null;
  content: string;
  created_at: number;
  updated_at: number;
  is_deleted: number;
}

export interface PostReaction {
  id: string;
  post_id: string | null;
  comment_id: string | null;
  user_id: string;
  reaction_type: 'heart' | 'seedling' | 'bulb' | 'fire';
  created_at: number;
}

export interface FarmFollow {
  id: string;
  follower_user_id: string;
  followed_farm_id: string;
  created_at: number;
}

export interface Collection {
  id: string;
  title: string;
  description?: string;
  curator_id?: string;
  is_featured: 0 | 1;
  is_public: 0 | 1;
  cover_image_url?: string;
  created_at: number;
  updated_at: number;
}

export interface CollectionItem {
  id: string;
  collection_id: string;
  farm_id: string;
  display_order: number;
  curator_note?: string;
  added_at: number;
}

export interface PostSave {
  id: string;
  user_id: string;
  post_id: string;
  created_at: number;
}

export interface PostView {
  id: string;
  post_id: string;
  viewer_user_id?: string;
  viewer_ip?: string;
  created_at: number;
}

export interface PostShare {
  id: string;
  post_id: string;
  user_id?: string;
  platform: 'twitter' | 'facebook' | 'pinterest' | 'reddit' | 'copy_link';
  created_at: number;
}

// User Profile & Following Types

export interface UserProfile extends User {
  bio: string | null;
  location: string | null;
  website: string | null;
  cover_image_url: string | null;
  social_links: string | null;
  interests: string | null;
  experience_level: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  climate_zone: string | null;
  profile_visibility: 'public' | 'registered' | 'private';
}

export interface UserFollow {
  id: string;
  follower_id: string;
  followed_id: string;
  created_at: number;
}

// ─── Species Content (AI-generated narratives & guides) ──────────────────────

export interface SpeciesContent {
  id: string;
  species_id: string;
  narrative_summary: string | null;
  narrative_full: string | null;
  growing_guide: string | null;
  growing_guide_summary: string | null;
  ai_model_used: string | null;
  generated_at: number | null;
  last_edited_at: number | null;
  edit_count: number;
  quality_score: number;
  created_at: number;
  updated_at: number;
}

// ─── Species Videos ──────────────────────────────────────────────────────────

export interface SpeciesVideo {
  id: string;
  species_id: string;
  youtube_video_id: string;
  title: string;
  channel_name: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  is_featured: number;
  relevance_score: number;
  added_by: string | null;
  approved: number;
  created_at: number;
}

// ─── Species Affiliate Links ─────────────────────────────────────────────────

export interface SpeciesAffiliateLink {
  id: string;
  species_id: string;
  vendor_name: string;
  vendor_url: string;
  vendor_logo_url: string | null;
  product_name: string | null;
  price_range: string | null;
  link_type: string;
  affiliate_network: string | null;
  is_active: number;
  display_order: number;
  click_count: number;
  added_by: string | null;
  created_at: number;
}

// ─── Species Community (Tips & Edits) ────────────────────────────────────────

export interface SpeciesTip {
  id: string;
  species_id: string;
  user_id: string;
  content: string;
  upvote_count: number;
  report_count: number;
  is_approved: number;
  created_at: number;
  updated_at: number;
}

export interface SpeciesTipVote {
  id: string;
  tip_id: string;
  user_id: string;
  vote_type: 'upvote' | 'report';
  created_at: number;
}

export interface SpeciesContentEdit {
  id: string;
  species_id: string;
  user_id: string;
  field_name: string;
  original_value: string | null;
  proposed_value: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: number | null;
  created_at: number;
}

// ─── Shop & Marketplace ───────────────────────────────────────────────────────

export interface ShopProduct {
  id: string;
  farm_id: string;
  name: string;
  slug: string;
  description: string | null;
  category: 'nursery_stock' | 'seeds' | 'vegetable_box' | 'cut_flowers' |
            'teas_herbs' | 'value_added' | 'tour' | 'event' | 'digital' | 'other';
  price_cents: number;
  compare_at_price_cents: number | null;
  currency: string;
  track_inventory: number;
  quantity_in_stock: number;
  allow_backorder: number;
  species_id: string | null;
  variety_id: string | null;
  image_url: string | null;
  gallery_urls: string | null;
  weight_oz: number | null;
  ships_to: string;
  shipping_note: string | null;
  event_date: number | null;
  event_end_date: number | null;
  event_location: string | null;
  event_capacity: number | null;
  event_registered: number;
  digital_file_url: string | null;
  tags: string | null;
  is_featured: number;
  is_published: number;
  sort_order: number;
  view_count: number;
  rating_avg: number;
  rating_count: number;
  created_at: number;
  updated_at: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  price_cents: number;
  quantity_in_stock: number;
  sku: string | null;
  sort_order: number;
  created_at: number;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  added_at: number;
}

export interface ShopOrder {
  id: string;
  order_number: string;
  farm_id: string;
  buyer_id: string;
  status: 'pending' | 'paid' | 'confirmed' | 'preparing' | 'shipped' |
          'out_for_delivery' | 'delivered' | 'completed' | 'cancelled' | 'refunded';
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  fulfillment_type: 'shipping' | 'pickup' | 'delivery' | 'digital' | 'event' | null;
  shipping_address: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  pickup_date: number | null;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  order_notes: string | null;
  created_at: number;
  updated_at: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  created_at: number;
}

// ─── Farm Tours ──────────────────────────────────────────────────────────────

export type TourStatus = 'draft' | 'published' | 'archived';
export type TourAccessType = 'public' | 'link_only' | 'password';
export type TourDifficulty = 'easy' | 'moderate' | 'challenging';
export type TourType = 'virtual' | 'in_person';
export type TourRouteMode = 'walking' | 'driving' | 'cycling';
export type TourStopType = 'point_of_interest' | 'garden_bed' | 'water_feature' | 'structure' | 'food_forest' | 'animal_area' | 'composting' | 'welcome' | 'farewell' | 'custom';
export type VirtualMediaType = 'photo_360' | 'video_360' | 'photo' | 'video' | 'embed';

export interface FarmTour {
  id: string;
  farm_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  status: TourStatus;
  access_type: TourAccessType;
  access_password: string | null;
  estimated_duration_minutes: number | null;
  difficulty: TourDifficulty;
  tour_type: TourType;
  route_mode: TourRouteMode | null;
  route_geometry: string | null; // GeoJSON LineString
  total_distance_meters: number | null;
  seasonal_notes: string | null;
  welcome_message: string | null;
  completion_message: string | null;
  allow_comments: number;
  show_map: number;
  visitor_count: number;
  share_slug: string | null;
  ai_generated: number;
  ai_model: string | null;
  tags: string | null; // JSON array
  og_image_url: string | null;
  embed_enabled: number;
  featured: number;
  created_at: number;
  updated_at: number;
  published_at: number | null;
}

export interface TourStop {
  id: string;
  tour_id: string;
  title: string;
  description: string | null;
  rich_content: string | null;
  media_urls: string | null;
  lat: number | null;
  lng: number | null;
  radius_meters: number;
  zone_id: string | null;
  planting_id: string | null;
  stop_type: TourStopType;
  display_order: number;
  is_optional: number;
  audio_url: string | null;
  estimated_time_minutes: number;
  seasonal_visibility: string | null;
  navigation_hint: string | null;
  direction_from_previous: string | null;
  distance_from_previous_meters: number | null;
  heading_degrees: number | null;
  ar_marker_id: string | null;
  virtual_media_url: string | null;
  virtual_media_type: VirtualMediaType | null;
  ai_generated: number;
  ai_description: string | null;
  quiz_question: string | null;
  quiz_options: string | null; // JSON array
  quiz_answer_index: number | null;
  created_at: number;
  updated_at: number;
}

export interface TourVisit {
  id: string;
  tour_id: string;
  visitor_user_id: string | null;
  visitor_name: string | null;
  visitor_email: string | null;
  session_token: string | null;
  started_at: number;
  completed_at: number | null;
  stops_visited: string | null;
  last_stop_id: string | null;
  rating: number | null;
  feedback: string | null;
  device_type: string | null;
  referrer: string | null;
}

export interface ProductReview {
  id: string;
  product_id: string;
  reviewer_id: string;
  order_id: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  image_urls: string | null;
  helpful_count: number;
  is_verified_purchase: number;
  created_at: number;
  updated_at: number;
}

export interface ShopNotification {
  id: string;
  user_id: string;
  notification_type: string;
  order_id: string | null;
  product_id: string | null;
  farm_id: string | null;
  triggered_by_user_id: string | null;
  content_preview: string | null;
  is_read: number;
  created_at: number;
}

// ─── Task Management ──────────────────────────────────────────────────────────

export type TaskType = 'planting' | 'watering' | 'harvesting' | 'maintenance' | 'observation' | 'pruning' | 'mulching' | 'custom';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type TaskPriority = 1 | 2 | 3 | 4; // low, medium, high, urgent

export interface Task {
  id: string;
  farm_id: string;
  title: string;
  description: string | null;
  task_type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: number | null;
  completed_at: number | null;
  assigned_to: string | null;
  related_planting_id: string | null;
  related_zone_id: string | null;
  recurrence: string | null; // JSON: { pattern, interval, end_date }
  tags: string | null; // JSON array
  source: 'manual' | 'seasonal' | 'ai';
  created_by: string;
  created_at: number;
  updated_at: number;
}

export interface TaskRecurrence {
  pattern: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'seasonal';
  interval: number;
  end_date?: number;
}

// ─── Crop Planning ────────────────────────────────────────────────────────────

export type CropPlanSeason = 'spring' | 'summer' | 'fall' | 'winter' | 'year-round';
export type CropPlanStatus = 'draft' | 'active' | 'completed' | 'archived';
export type CropItemStatus = 'planned' | 'sown' | 'transplanted' | 'growing' | 'harvesting' | 'done';

export interface CropPlan {
  id: string;
  farm_id: string;
  name: string;
  season: CropPlanSeason;
  year: number;
  status: CropPlanStatus;
  notes: string | null;
  created_by: string;
  created_at: number;
  updated_at: number;
}

export interface CropPlanItem {
  id: string;
  crop_plan_id: string;
  species_id: string | null;
  variety_id: string | null;
  zone_id: string | null;
  name: string;
  planned_sow_date: number | null;
  planned_transplant_date: number | null;
  planned_harvest_date: number | null;
  quantity: number | null;
  unit: string | null;
  expected_yield: number | null;
  expected_yield_unit: string | null;
  actual_yield: number | null;
  actual_yield_unit: string | null;
  status: CropItemStatus;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export interface HarvestLog {
  id: string;
  farm_id: string;
  crop_plan_item_id: string | null;
  planting_id: string | null;
  species_id: string | null;
  harvest_date: number;
  quantity: number;
  unit: string;
  quality_rating: number | null;
  notes: string | null;
  photo_url: string | null;
  created_by: string;
  created_at: number;
}

export interface JournalEntry {
  id: string;
  farm_id: string;
  author_id: string;
  entry_date: number;
  title: string | null;
  content: string;
  media_urls: string | null;
  weather: string | null;
  tags: string | null; // JSON array as TEXT
  is_shared_to_community: number;
  created_at: number;
  updated_at: number;
}

// ─── Farm Story ─────────────────────────────────────────────────────────────

export type StorySectionType = 'hero' | 'origin' | 'values' | 'the_land' | 'what_we_grow' | 'seasons' | 'visit_us' | 'custom';

export interface FarmStorySection {
  id: string;
  farm_id: string;
  section_type: StorySectionType;
  title: string;
  content: string | null;
  media_url: string | null;
  media_urls: string | null;
  ai_generated: number;
  ai_model: string | null;
  is_visible: number;
  display_order: number;
  metadata: string | null;
  created_at: number;
  updated_at: number;
}
