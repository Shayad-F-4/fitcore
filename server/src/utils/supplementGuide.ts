export interface ISupplementItem {
  id: string;
  name: string;
  category: 'PROTEIN' | 'PERFORMANCE' | 'HEALTH_WELLNESS' | 'RECOVERY' | 'MICRONUTRIENT';
  evidenceRating: 'STRONG' | 'MODERATE' | 'EMERGING';
  suitableFor: ('VEGETARIAN' | 'NON_VEGETARIAN' | 'VEGAN' | 'JAIN')[];
  primaryBenefit: string;
  typicalDosage: string;
  recommendedTiming: string;
  scientificNotes: string;
  safetyPrecautions: string[];
  isEssential: boolean;
}

export const SUPPLEMENT_DISCLAIMER =
  'IMPORTANT MEDICAL DISCLAIMER: Nutritional supplements are strictly optional additions to whole-food nutrition and are NEVER a substitute for medical treatment or balanced meals. Sagar Fitness Gym does NOT prescribe drugs or anabolic substances. Members with pre-existing conditions, kidney issues, or taking medication must consult a registered healthcare practitioner prior to using any supplement.';

export const EDUCATIONAL_SUPPLEMENTS: ISupplementItem[] = [
  {
    id: 'whey-protein',
    name: 'Whey Protein (Concentrate / Isolate)',
    category: 'PROTEIN',
    evidenceRating: 'STRONG',
    suitableFor: ['VEGETARIAN', 'NON_VEGETARIAN'],
    primaryBenefit: 'High biological value protein source to help hit daily targets and support muscle protein synthesis.',
    typicalDosage: '1 scoop (24–28g protein)',
    recommendedTiming: 'Post-workout or between meals when whole-food protein is inconvenient.',
    scientificNotes: 'Rapidly absorbed milk-derived protein complete in all essential amino acids (EAAs) with high leucine content.',
    safetyPrecautions: [
      'Individuals with severe lactose intolerance should choose Whey Protein Isolate or Plant Protein.',
      'Ensure adequate daily water intake (3–4 Litres).',
    ],
    isEssential: false,
  },
  {
    id: 'creatine-monohydrate',
    name: 'Creatine Monohydrate (Creapure / 200 Mesh)',
    category: 'PERFORMANCE',
    evidenceRating: 'STRONG',
    suitableFor: ['VEGETARIAN', 'NON_VEGETARIAN', 'VEGAN', 'JAIN'],
    primaryBenefit: 'Increases intramuscular phosphocreatine stores, supporting explosive power, maximal strength, and high-intensity output.',
    typicalDosage: '3–5 grams daily (loading phase is optional, not mandatory)',
    recommendedTiming: 'Daily at any consistent time (e.g., post-workout with water or simple carbs).',
    scientificNotes: 'One of the most extensively researched sports supplements in scientific literature (>500 peer-reviewed studies).',
    safetyPrecautions: [
      'Drink plenty of fluids to avoid muscle cramping or minor stomach discomfort.',
      'Creatine naturally increases intracellular water retention inside muscle fibers.',
    ],
    isEssential: false,
  },
  {
    id: 'plant-protein',
    name: 'Pea & Brown Rice Protein Blend',
    category: 'PROTEIN',
    evidenceRating: 'STRONG',
    suitableFor: ['VEGETARIAN', 'NON_VEGETARIAN', 'VEGAN', 'JAIN'],
    primaryBenefit: 'Hypoallergenic plant-based complete protein matrix for vegans and lactose-intolerant athletes.',
    typicalDosage: '1 scoop (22–26g protein)',
    recommendedTiming: 'Post-workout or breakfast smoothie.',
    scientificNotes: 'Pea protein is rich in lysine while rice protein complements methionine and cysteine, creating a balanced amino profile.',
    safetyPrecautions: ['Check label for low heavy-metal third-party certifications.'],
    isEssential: false,
  },
  {
    id: 'omega-3',
    name: 'Omega-3 Fatty Acids (EPA & DHA) / Algal Oil',
    category: 'HEALTH_WELLNESS',
    evidenceRating: 'STRONG',
    suitableFor: ['VEGETARIAN', 'NON_VEGETARIAN', 'VEGAN', 'JAIN'],
    primaryBenefit: 'Cardiovascular health, joint lubrication, reduced systemic inflammation, and brain function.',
    typicalDosage: '1000–2000mg combined EPA + DHA daily',
    recommendedTiming: 'With a fat-containing meal (lunch or dinner).',
    scientificNotes: 'Non-vegetarians can use molecularly distilled fish oil; vegetarians/vegans can use microalgae-derived EPA/DHA.',
    safetyPrecautions: ['Consult doctor if on blood thinning medications (e.g. Warfarin/Aspirin).'],
    isEssential: false,
  },
  {
    id: 'vitamin-d3-k2',
    name: 'Vitamin D3 + K2 (Cholecalciferol + MK-7)',
    category: 'MICRONUTRIENT',
    evidenceRating: 'STRONG',
    suitableFor: ['VEGETARIAN', 'NON_VEGETARIAN', 'VEGAN', 'JAIN'],
    primaryBenefit: 'Bone density, immune support, testosterone regulation, and calcium metabolism.',
    typicalDosage: '1000–2000 IU daily (or 60,000 IU weekly as guided by serum 25(OH)D lab tests)',
    recommendedTiming: 'Morning with breakfast containing dietary fat.',
    scientificNotes: 'Over 70% of Indian urban population presents clinical Vitamin D insufficiency due to indoor work and melanin levels.',
    safetyPrecautions: ['Check serum blood levels before high-dose weekly therapy.'],
    isEssential: false,
  },
  {
    id: 'ashwagandha',
    name: 'Ashwagandha (Withania Somnifera / KSM-66)',
    category: 'RECOVERY',
    evidenceRating: 'MODERATE',
    suitableFor: ['VEGETARIAN', 'NON_VEGETARIAN', 'VEGAN', 'JAIN'],
    primaryBenefit: 'Adaptogen that assists in cortisol management, sleep quality improvement, and stress resilience.',
    typicalDosage: '300–600mg standardized root extract daily',
    recommendedTiming: 'Evening / 30-60 mins before sleep.',
    scientificNotes: 'Clinically shown in randomized controlled trials to modulate serum cortisol and improve recovery perception.',
    safetyPrecautions: ['Avoid in hyperthyroidism or autoimmune flare-ups unless cleared by doctor.'],
    isEssential: false,
  },
  {
    id: 'electrolytes',
    name: 'Hydration Electrolytes (Sodium, Potassium, Magnesium)',
    category: 'PERFORMANCE',
    evidenceRating: 'STRONG',
    suitableFor: ['VEGETARIAN', 'NON_VEGETARIAN', 'VEGAN', 'JAIN'],
    primaryBenefit: 'Prevents dehydration, preserves plasma volume, and prevents muscle cramps during warm Indian summers.',
    typicalDosage: 'As directed (typically 200-500mg sodium + 100mg potassium per intense session)',
    recommendedTiming: 'Intra-workout or post-workout on heavy sweat days.',
    scientificNotes: 'Replacing sodium loss is critical during workouts exceeding 60 minutes or in temperatures above 30°C.',
    safetyPrecautions: ['Hypertensive individuals must monitor overall dietary sodium.'],
    isEssential: false,
  },
];
