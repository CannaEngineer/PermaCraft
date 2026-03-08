/**
 * Plant category definitions with USDA search parameters and permaculture priority.
 *
 * Categories are ordered by permaculture relevance - the most useful categories
 * for permaculture design are listed first. When populating the database, run
 * categories in order to ensure the most important plants are added first.
 */

import type { PlantCategory } from './types';

export interface CategoryDefinition {
  category: PlantCategory;
  label: string;
  description: string;
  permaculturePriority: number; // 1 = highest priority
  usdaFilters: {
    growthHabits?: string[];
    characteristics?: Record<string, string>;
    searchTerms?: string[];
  };
  estimatedCount: number; // Approximate number of species to fetch
  defaultLayer: string;
  allRegions: boolean; // Whether to fetch across all US regions
}

export const PLANT_CATEGORIES: CategoryDefinition[] = [
  // === HIGHEST PRIORITY: Core permaculture species ===
  {
    category: 'nitrogen_fixers',
    label: 'Nitrogen Fixers',
    description: 'Legumes and actinorhizal plants that fix atmospheric nitrogen - foundational to permaculture',
    permaculturePriority: 1,
    usdaFilters: {
      characteristics: { Nitrogen_Fixation: 'High,Medium' },
      growthHabits: ['Tree', 'Shrub', 'Forb/herb', 'Subshrub'],
    },
    estimatedCount: 200,
    defaultLayer: 'shrub',
    allRegions: true,
  },
  {
    category: 'fruit_nut_trees',
    label: 'Fruit & Nut Trees',
    description: 'Productive food trees - the backbone of food forests',
    permaculturePriority: 1,
    usdaFilters: {
      growthHabits: ['Tree'],
      characteristics: { Berry_Nut_Seed_Product: 'Yes', Palatable_Human: 'Yes' },
      searchTerms: [
        'Malus', 'Prunus', 'Pyrus', 'Juglans', 'Carya', 'Castanea', 'Corylus',
        'Diospyros', 'Asimina', 'Morus', 'Celtis', 'Amelanchier', 'Crataegus',
        'Sambucus', 'Persea', 'Citrus', 'Ficus', 'Punica',
      ],
    },
    estimatedCount: 150,
    defaultLayer: 'canopy',
    allRegions: true,
  },
  {
    category: 'food_forest_trees',
    label: 'Food Forest Canopy Trees',
    description: 'Large native trees that form the canopy layer of food forests',
    permaculturePriority: 1,
    usdaFilters: {
      growthHabits: ['Tree'],
      searchTerms: [
        'Quercus', 'Tilia', 'Gleditsia', 'Gymnocladus', 'Sassafras',
        'Liriodendron', 'Nyssa', 'Acer saccharum', 'Fagus', 'Betula',
      ],
    },
    estimatedCount: 100,
    defaultLayer: 'canopy',
    allRegions: true,
  },
  {
    category: 'berry_bushes',
    label: 'Berry Bushes & Fruit Shrubs',
    description: 'Productive shrubs for the shrub layer of food forests',
    permaculturePriority: 2,
    usdaFilters: {
      growthHabits: ['Shrub', 'Subshrub'],
      searchTerms: [
        'Vaccinium', 'Rubus', 'Ribes', 'Viburnum', 'Aronia', 'Gaylussacia',
        'Shepherdia', 'Elaeagnus', 'Lonicera caerulea', 'Rosa',
        'Ilex verticillata', 'Lindera', 'Callicarpa',
      ],
    },
    estimatedCount: 120,
    defaultLayer: 'shrub',
    allRegions: true,
  },
  {
    category: 'herbaceous_perennials',
    label: 'Herbaceous Perennials',
    description: 'Perennial herbs, wildflowers, and forbs for ground layers',
    permaculturePriority: 2,
    usdaFilters: {
      growthHabits: ['Forb/herb'],
      characteristics: { Duration: 'Perennial' },
      searchTerms: [
        'Helianthus', 'Solidago', 'Echinacea', 'Asclepias', 'Monarda',
        'Symphyotrichum', 'Rudbeckia', 'Penstemon', 'Baptisia', 'Liatris',
        'Agastache', 'Zizia', 'Allium', 'Hemerocallis', 'Hosta',
      ],
    },
    estimatedCount: 250,
    defaultLayer: 'herbaceous',
    allRegions: true,
  },
  {
    category: 'culinary_herbs',
    label: 'Culinary & Kitchen Herbs',
    description: 'Herbs for cooking, tea, and seasoning - essential for herb spirals',
    permaculturePriority: 2,
    usdaFilters: {
      growthHabits: ['Forb/herb', 'Subshrub'],
      searchTerms: [
        'Ocimum', 'Mentha', 'Thymus', 'Rosmarinus', 'Salvia officinalis',
        'Origanum', 'Petroselinum', 'Anethum', 'Coriandrum', 'Foeniculum',
        'Allium schoenoprasum', 'Artemisia dracunculus', 'Lavandula',
        'Melissa', 'Nepeta', 'Chamaemelum', 'Borago',
      ],
    },
    estimatedCount: 80,
    defaultLayer: 'herbaceous',
    allRegions: true,
  },
  {
    category: 'medicinal_herbs',
    label: 'Medicinal Plants',
    description: 'Plants with traditional and modern medicinal uses',
    permaculturePriority: 3,
    usdaFilters: {
      growthHabits: ['Forb/herb', 'Shrub', 'Subshrub'],
      searchTerms: [
        'Echinacea', 'Hydrastis', 'Actaea', 'Aralia', 'Panax',
        'Hypericum', 'Valeriana', 'Scutellaria', 'Verbena', 'Passiflora',
        'Hamamelis', 'Gaultheria', 'Ceanothus', 'Lobelia', 'Podophyllum',
      ],
    },
    estimatedCount: 100,
    defaultLayer: 'herbaceous',
    allRegions: true,
  },

  // === MEDIUM PRIORITY: Important supporting species ===
  {
    category: 'groundcovers',
    label: 'Groundcovers',
    description: 'Living mulch and ground-layer plants to suppress weeds and protect soil',
    permaculturePriority: 3,
    usdaFilters: {
      growthHabits: ['Forb/herb', 'Subshrub'],
      searchTerms: [
        'Fragaria', 'Trifolium', 'Ajuga', 'Pachysandra', 'Vinca',
        'Phlox subulata', 'Waldsteinia', 'Asarum', 'Tiarella', 'Heuchera',
        'Sedum', 'Thymus serpyllum', 'Gaultheria procumbens', 'Mitchella',
      ],
    },
    estimatedCount: 80,
    defaultLayer: 'groundcover',
    allRegions: true,
  },
  {
    category: 'vines',
    label: 'Vines & Climbers',
    description: 'Vertical-layer plants for trellises, arbors, and living fences',
    permaculturePriority: 3,
    usdaFilters: {
      growthHabits: ['Vine'],
      searchTerms: [
        'Vitis', 'Actinidia', 'Passiflora', 'Lonicera', 'Campsis',
        'Clematis', 'Parthenocissus', 'Wisteria', 'Humulus', 'Aristolochia',
        'Celastrus', 'Schisandra', 'Akebia', 'Apios',
      ],
    },
    estimatedCount: 80,
    defaultLayer: 'vine',
    allRegions: true,
  },
  {
    category: 'cover_crops',
    label: 'Cover Crops & Green Manures',
    description: 'Annual and perennial soil builders for garden beds and orchards',
    permaculturePriority: 2,
    usdaFilters: {
      growthHabits: ['Forb/herb', 'Graminoid'],
      searchTerms: [
        'Trifolium', 'Vicia', 'Secale', 'Fagopyrum', 'Brassica',
        'Phacelia', 'Medicago', 'Lupinus', 'Pisum', 'Lolium',
        'Avena', 'Raphanus', 'Sinapis', 'Daikon',
      ],
    },
    estimatedCount: 60,
    defaultLayer: 'herbaceous',
    allRegions: true,
  },
  {
    category: 'native_shrubs',
    label: 'Native Shrubs',
    description: 'Native shrubs for hedgerows, wildlife corridors, and understory',
    permaculturePriority: 3,
    usdaFilters: {
      growthHabits: ['Shrub'],
      searchTerms: [
        'Cornus', 'Ilex', 'Rhododendron', 'Clethra', 'Itea',
        'Calycanthus', 'Cephalanthus', 'Physocarpus', 'Spiraea',
        'Myrica', 'Comptonia', 'Rhus', 'Morella', 'Fothergilla',
      ],
    },
    estimatedCount: 150,
    defaultLayer: 'shrub',
    allRegions: true,
  },
  {
    category: 'native_trees',
    label: 'Native Trees (Non-food)',
    description: 'Native shade, timber, and ecological service trees',
    permaculturePriority: 4,
    usdaFilters: {
      growthHabits: ['Tree'],
      searchTerms: [
        'Acer', 'Betula', 'Carpinus', 'Cercis', 'Cornus florida',
        'Juniperus', 'Magnolia', 'Oxydendrum', 'Platanus', 'Populus',
        'Salix', 'Thuja', 'Tsuga', 'Ulmus',
      ],
    },
    estimatedCount: 150,
    defaultLayer: 'canopy',
    allRegions: true,
  },
  {
    category: 'pollinator_plants',
    label: 'Pollinator & Beneficial Insect Plants',
    description: 'Plants that attract and support pollinators, predatory insects',
    permaculturePriority: 2,
    usdaFilters: {
      growthHabits: ['Forb/herb', 'Shrub', 'Subshrub'],
      searchTerms: [
        'Asclepias', 'Monarda', 'Solidago', 'Eupatorium', 'Symphyotrichum',
        'Coreopsis', 'Helianthus', 'Ratibida', 'Vernonia', 'Pycnanthemum',
        'Zizia', 'Angelica', 'Eryngium', 'Achillea', 'Tanacetum',
      ],
    },
    estimatedCount: 150,
    defaultLayer: 'herbaceous',
    allRegions: true,
  },

  // === STANDARD PRIORITY: Complementary species ===
  {
    category: 'vegetables_annuals',
    label: 'Vegetables & Annual Crops',
    description: 'Common garden vegetables and annual food crops',
    permaculturePriority: 3,
    usdaFilters: {
      growthHabits: ['Forb/herb'],
      searchTerms: [
        'Solanum lycopersicum', 'Capsicum', 'Cucurbita', 'Phaseolus',
        'Zea mays', 'Brassica oleracea', 'Lactuca', 'Daucus carota',
        'Beta vulgaris', 'Allium cepa', 'Pisum sativum', 'Spinacia',
        'Cucumis', 'Ipomoea batatas', 'Solanum tuberosum', 'Raphanus',
        'Abelmoschus', 'Cynara', 'Asparagus',
      ],
    },
    estimatedCount: 120,
    defaultLayer: 'herbaceous',
    allRegions: true,
  },
  {
    category: 'windbreak_species',
    label: 'Windbreak & Shelter Belt Species',
    description: 'Trees and shrubs for wind protection and microclimate creation',
    permaculturePriority: 4,
    usdaFilters: {
      growthHabits: ['Tree', 'Shrub'],
      searchTerms: [
        'Picea', 'Pinus', 'Juniperus', 'Thuja', 'Abies',
        'Maclura', 'Caragana', 'Elaeagnus', 'Hippophae',
      ],
    },
    estimatedCount: 60,
    defaultLayer: 'canopy',
    allRegions: true,
  },
  {
    category: 'aquatic_plants',
    label: 'Aquatic & Wetland Plants',
    description: 'Plants for ponds, swales, rain gardens, and constructed wetlands',
    permaculturePriority: 4,
    usdaFilters: {
      growthHabits: ['Forb/herb', 'Graminoid', 'Shrub'],
      searchTerms: [
        'Typha', 'Sagittaria', 'Pontederia', 'Nymphaea', 'Nelumbo',
        'Iris versicolor', 'Caltha', 'Acorus', 'Juncus', 'Carex',
        'Schoenoplectus', 'Cephalanthus', 'Taxodium', 'Salix',
      ],
    },
    estimatedCount: 80,
    defaultLayer: 'aquatic',
    allRegions: true,
  },
  {
    category: 'ornamental_natives',
    label: 'Ornamental Native Plants',
    description: 'Beautiful native plants for aesthetics and curb appeal',
    permaculturePriority: 5,
    usdaFilters: {
      growthHabits: ['Forb/herb', 'Shrub', 'Tree'],
      searchTerms: [
        'Cornus', 'Cercis', 'Magnolia', 'Kalmia', 'Rhododendron',
        'Hibiscus', 'Phlox', 'Aquilegia', 'Iris', 'Lilium',
        'Trillium', 'Dodecatheon', 'Mertensia', 'Anemone',
      ],
    },
    estimatedCount: 100,
    defaultLayer: 'herbaceous',
    allRegions: true,
  },
  {
    category: 'grasses_sedges',
    label: 'Native Grasses & Sedges',
    description: 'Grasses and sedges for meadows, erosion control, and habitat',
    permaculturePriority: 5,
    usdaFilters: {
      growthHabits: ['Graminoid'],
      searchTerms: [
        'Andropogon', 'Schizachyrium', 'Panicum', 'Sorghastrum',
        'Bouteloua', 'Elymus', 'Carex', 'Juncus', 'Spartina',
        'Muhlenbergia', 'Sporobolus', 'Deschampsia',
      ],
    },
    estimatedCount: 100,
    defaultLayer: 'herbaceous',
    allRegions: true,
  },
];

/**
 * Get categories sorted by permaculture priority (most important first)
 */
export function getCategoriesByPriority(): CategoryDefinition[] {
  return [...PLANT_CATEGORIES].sort((a, b) => a.permaculturePriority - b.permaculturePriority);
}

/**
 * Get a specific category definition
 */
export function getCategory(cat: PlantCategory): CategoryDefinition | undefined {
  return PLANT_CATEGORIES.find(c => c.category === cat);
}

/**
 * List all available category names
 */
export function listCategories(): { category: PlantCategory; label: string; priority: number; estimated: number }[] {
  return getCategoriesByPriority().map(c => ({
    category: c.category,
    label: c.label,
    priority: c.permaculturePriority,
    estimated: c.estimatedCount,
  }));
}
