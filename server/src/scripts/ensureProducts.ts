import { Product } from '../models/Product.js';
import { Supplier } from '../models/Supplier.js';

export async function ensureDefaultProducts() {
  try {
    const existingCount = await Product.countDocuments();
    if (existingCount > 0) {
      return;
    }

    console.log('[Inventory Setup] No products found in database. Seeding standard Sagar Fitness Gym inventory items...');

    // Ensure a starter supplier exists
    let supplier = await Supplier.findOne();
    if (!supplier) {
      supplier = await Supplier.create({
        name: 'Apex Sports Nutrition Maharashtra',
        phone: '+91 98220 12345',
        email: 'sales@apexnutrition.in',
        address: 'Wholesale Depot, Station Road, Ahmednagar/Pathardi',
        notes: 'Primary authorized supplier for gym supplements and accessories',
        status: 'ACTIVE',
      });
    }

    const defaultProducts = [
      {
        name: 'Gold Standard 100% Whey Protein (2kg)',
        sku: 'SUP-WHEY-2KG',
        barcode: '890100100001',
        category: 'Supplements',
        brand: 'Optimum Nutrition',
        description: '24g blended whey protein (isolate + concentrate) with natural BCAAs and glutamine.',
        purchaseCost: 4500,
        sellingPrice: 5900,
        currentStock: 12,
        minStockThreshold: 3,
        unit: 'BOX',
        supplier: supplier._id,
        status: 'ACTIVE' as const,
      },
      {
        name: 'Micronized Creatine Monohydrate (250g)',
        sku: 'SUP-CREA-250G',
        barcode: '890100100002',
        category: 'Supplements',
        brand: 'MuscleBlaze',
        description: '100% pure pharmaceutical grade micronized creatine for explosive power and strength.',
        purchaseCost: 750,
        sellingPrice: 1100,
        currentStock: 18,
        minStockThreshold: 5,
        unit: 'BOX',
        supplier: supplier._id,
        status: 'ACTIVE' as const,
      },
      {
        name: 'BCAA Energy & Recovery Drink (30 Servings)',
        sku: 'SUP-BCAA-30S',
        barcode: '890100100003',
        category: 'Supplements',
        brand: 'Scivation Xtend',
        description: '7g BCAAs in 2:1:1 ratio with electrolytes for hydration during heavy sessions.',
        purchaseCost: 1400,
        sellingPrice: 2100,
        currentStock: 8,
        minStockThreshold: 3,
        unit: 'BOX',
        supplier: supplier._id,
        status: 'ACTIVE' as const,
      },
      {
        name: 'Sagar Fitness Heavy-Duty Protein Shaker (700ml)',
        sku: 'ACC-SHAKER-700',
        barcode: '890100100004',
        category: 'Accessories',
        brand: 'Sagar Fitness Official',
        description: 'BPA-free leak-proof gym shaker with stainless steel blending ball.',
        purchaseCost: 180,
        sellingPrice: 350,
        currentStock: 25,
        minStockThreshold: 5,
        unit: 'PIECE',
        supplier: supplier._id,
        status: 'ACTIVE' as const,
      },
      {
        name: 'Pro Lifting Wrist Straps (Pair)',
        sku: 'ACC-STRAPS-PRO',
        barcode: '890100100005',
        category: 'Accessories',
        brand: 'Kobo Sports',
        description: 'Heavy duty padded cotton lifting straps for deadlifts and pull exercises.',
        purchaseCost: 220,
        sellingPrice: 450,
        currentStock: 14,
        minStockThreshold: 4,
        unit: 'PAIR',
        supplier: supplier._id,
        status: 'ACTIVE' as const,
      },
      {
        name: 'Sagar Fitness Gym Dry-Fit Training T-Shirt',
        sku: 'APP-TSHIRT-L',
        barcode: '890100100006',
        category: 'Apparel',
        brand: 'Sagar Fitness Official',
        description: 'Breathable dry-fit polyester gym training tee with Sagar Fitness logo.',
        purchaseCost: 350,
        sellingPrice: 650,
        currentStock: 15,
        minStockThreshold: 5,
        unit: 'PIECE',
        supplier: supplier._id,
        status: 'ACTIVE' as const,
      },
      {
        name: 'Electrolyte Energy Hydration Drink (500ml)',
        sku: 'BEV-ELECTRO-500',
        barcode: '890100100007',
        category: 'Beverages',
        brand: 'Fast&Up',
        description: 'Instant electrolyte rehydration bottle for intense workout sessions.',
        purchaseCost: 35,
        sellingPrice: 60,
        currentStock: 30,
        minStockThreshold: 10,
        unit: 'BOTTLE',
        supplier: supplier._id,
        status: 'ACTIVE' as const,
      },
    ];

    await Product.insertMany(defaultProducts);
    console.log('[Inventory Setup] Successfully seeded standard Sagar Fitness Gym inventory products!');
  } catch (error) {
    console.error('[Inventory Setup Error]', error);
  }
}
