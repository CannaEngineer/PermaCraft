export const sampleGuildTemplates = [
  {
    id: 'guild-apple-standard',
    name: 'Apple Tree Guild (Standard)',
    description: 'Traditional apple tree polyculture with nitrogen fixers, pest deterrents, and groundcover',
    climate_zones: ['5a', '5b', '6a', '6b', '7a', '7b'],
    focal_species_name: 'Apple (Malus domestica)',
    companion_species: [
      {
        species_name: 'White Clover (Trifolium repens)',
        layer: 'groundcover',
        min_distance_feet: 0,
        max_distance_feet: 15,
        count: 1, // Blanket coverage
        cardinal_direction: 'any'
      },
      {
        species_name: 'Comfrey (Symphytum officinale)',
        layer: 'herbaceous',
        min_distance_feet: 3,
        max_distance_feet: 8,
        count: 4,
        cardinal_direction: 'any'
      },
      {
        species_name: 'Chives (Allium schoenoprasum)',
        layer: 'herbaceous',
        min_distance_feet: 2,
        max_distance_feet: 5,
        count: 6,
        cardinal_direction: 'any'
      },
      {
        species_name: 'Nasturtium (Tropaeolum majus)',
        layer: 'groundcover',
        min_distance_feet: 1,
        max_distance_feet: 10,
        count: 3,
        cardinal_direction: 'any'
      }
    ],
    spacing_rules: {
      canopy_radius_feet: 15,
      understory_radius_feet: 8
    },
    benefits: [
      'nitrogen_fixation',
      'pest_control',
      'pollinator_attraction',
      'dynamic_accumulator',
      'mulch_production'
    ]
  },
  {
    id: 'guild-peach-warm',
    name: 'Peach Tree Guild (Warm Climate)',
    description: 'Peach polyculture optimized for zones 7-9 with heat-tolerant companions',
    climate_zones: ['7a', '7b', '8a', '8b', '9a', '9b'],
    focal_species_name: 'Peach (Prunus persica)',
    companion_species: [
      {
        species_name: 'Yarrow (Achillea millefolium)',
        layer: 'herbaceous',
        min_distance_feet: 2,
        max_distance_feet: 10,
        count: 5,
        cardinal_direction: 'any'
      },
      {
        species_name: 'Lavender (Lavandula angustifolia)',
        layer: 'shrub',
        min_distance_feet: 4,
        max_distance_feet: 8,
        count: 3,
        cardinal_direction: 'S'
      },
      {
        species_name: 'Strawberry (Fragaria × ananassa)',
        layer: 'groundcover',
        min_distance_feet: 1,
        max_distance_feet: 12,
        count: 1,
        cardinal_direction: 'any'
      }
    ],
    spacing_rules: {
      canopy_radius_feet: 12,
      understory_radius_feet: 6
    },
    benefits: [
      'pest_control',
      'pollinator_attraction',
      'erosion_control',
      'edible_yield'
    ]
  },
  {
    id: 'guild-oak-native',
    name: 'Oak Savanna Guild (Native)',
    description: 'Native oak ecosystem with native understory for wildlife habitat',
    climate_zones: ['4a', '4b', '5a', '5b', '6a', '6b', '7a'],
    focal_species_name: 'White Oak (Quercus alba)',
    companion_species: [
      {
        species_name: 'American Hazelnut (Corylus americana)',
        layer: 'shrub',
        min_distance_feet: 10,
        max_distance_feet: 20,
        count: 3,
        cardinal_direction: 'any'
      },
      {
        species_name: 'Wild Bergamot (Monarda fistulosa)',
        layer: 'herbaceous',
        min_distance_feet: 5,
        max_distance_feet: 15,
        count: 8,
        cardinal_direction: 'any'
      },
      {
        species_name: 'Pennsylvania Sedge (Carex pensylvanica)',
        layer: 'groundcover',
        min_distance_feet: 0,
        max_distance_feet: 25,
        count: 1,
        cardinal_direction: 'any'
      }
    ],
    spacing_rules: {
      canopy_radius_feet: 40,
      understory_radius_feet: 20,
      shrub_radius_feet: 8
    },
    benefits: [
      'wildlife_habitat',
      'native_ecology',
      'edible_yield',
      'erosion_control'
    ]
  }
];
