import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import { ENV } from '../src/config/env.js';
import { Product } from '../src/models/Product.js';
import { Supplier } from '../src/models/Supplier.js';
import { Purchase } from '../src/models/Purchase.js';
import { InventorySale } from '../src/models/InventorySale.js';
import { StockMovement } from '../src/models/StockMovement.js';
import { User } from '../src/models/User.js';

describe('Inventory, POS & Supplier Management Test Suite', () => {
  let adminToken = '';
  let receptionistToken = '';
  let testSupplierId = '';
  let testProductId = '';
  let testProductSku = '';

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(ENV.MONGODB_URI);
    }

    // 1. Login as Admin
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@fitcore.com',
      password: 'password123',
    });
    adminToken = adminLogin.body.data.token;

    // 2. Ensure receptionist user exists and login
    const receptionistEmail = 'desk@fitcore.com';
    let receptionist = await User.findOne({ email: receptionistEmail });
    if (!receptionist) {
      receptionist = await User.create({
        fullName: 'Receptionist Desk',
        email: receptionistEmail,
        password: 'password123',
        role: 'RECEPTIONIST',
        status: 'ACTIVE',
      });
    }

    const recLogin = await request(app).post('/api/auth/login').send({
      email: receptionistEmail,
      password: 'password123',
    });
    receptionistToken = recLogin.body.data.token;
  });

  // Test 1: Supplier Creation & Validation
  it('1. Creates a supplier with contact details', async () => {
    const timestamp = Date.now();
    const res = await request(app)
      .post('/api/inventory/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Optimum Nutrition Dist ${timestamp}`,
        phone: '+91 98765 43210',
        email: `distributor.${timestamp}@supplements.in`,
        address: 'MIDC Industrial Area, Pune',
        notes: 'Official wholesale supplier for whey & creatine',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBeDefined();
    testSupplierId = res.body.data._id;
  });

  // Test 2: Product Creation & Duplicate SKU Prevention
  it('2. Creates a product and enforces unique SKU constraint', async () => {
    const timestamp = Date.now();
    testProductSku = `WHEY-CHOCO-${timestamp.toString().slice(-4)}`;

    const res = await request(app)
      .post('/api/inventory/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Gold Standard 100% Whey (Double Rich Chocolate 2kg)',
        sku: testProductSku,
        barcode: `8901234${timestamp.toString().slice(-6)}`,
        category: 'Supplements',
        brand: 'Optimum Nutrition',
        description: '24g protein per serving with 5.5g BCAAs',
        purchaseCost: 4000,
        sellingPrice: 5800,
        currentStock: 10,
        minStockThreshold: 3,
        unit: 'BOX',
        supplier: testSupplierId,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    testProductId = res.body.data._id;
    expect(res.body.data.currentStock).toBe(10);

    // Verify initial stock movement was automatically recorded
    const movement = await StockMovement.findOne({ product: testProductId, movementType: 'ADJUSTMENT_ADD' });
    expect(movement).toBeDefined();
    expect(movement?.quantity).toBe(10);

    // Duplicate SKU should be rejected
    const dupRes = await request(app)
      .post('/api/inventory/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Another Protein with Same SKU',
        sku: testProductSku,
        purchaseCost: 3500,
        sellingPrice: 5000,
      });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.success).toBe(false);
  });

  // Test 3: Stock Receiving via Purchase Workflow
  it('3. Records a purchase order, calculates weighted-average cost, and updates stock and supplier balance', async () => {
    const timestamp = Date.now();
    const invoiceNum = `INV-TEST-${timestamp.toString().slice(-5)}`;

    // Current stock: 10 units @ 4000 cost.
    // Purchasing: 10 units @ 4200 cost.
    // Expected new stock: 20 units.
    // Expected new weighted-average cost: (10*4000 + 10*4200) / 20 = 4100.
    const res = await request(app)
      .post('/api/inventory/purchases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierId: testSupplierId,
        invoiceNumber: invoiceNum,
        items: [
          {
            productId: testProductId,
            quantity: 10,
            purchaseCost: 4200,
            batchNumber: 'BATCH-2026-X',
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
        amountPaid: 42000, // Fully paid
        paymentMethod: 'UPI',
        notes: 'Restock batch delivery',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.overallTotal).toBe(42000);
    expect(res.body.data.paymentStatus).toBe('PAID');

    // Verify product updated stock & weighted average cost
    const updatedProduct = await Product.findById(testProductId);
    expect(updatedProduct?.currentStock).toBe(20);
    expect(updatedProduct?.purchaseCost).toBe(4100);

    // Verify stock movement of type PURCHASE
    const movement = await StockMovement.findOne({
      product: testProductId,
      movementType: 'PURCHASE',
      referenceId: res.body.data._id,
    });
    expect(movement).toBeDefined();
    expect(movement?.quantity).toBe(10);
  });

  // Test 4: Manual Stock Adjustments (Damage / Adjustment)
  it('4. Allows admin to adjust stock with clear audit reason and prevents negative stock', async () => {
    // Current stock is 20. Mark 2 damaged.
    const damageRes = await request(app)
      .post('/api/inventory/stock/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: testProductId,
        movementType: 'DAMAGE',
        quantity: 2,
        reason: 'Broken seal during shelf arrangement',
      });

    expect(damageRes.status).toBe(200);
    expect(damageRes.body.data.product.currentStock).toBe(18);

    // Attempting to subtract 100 should fail (insufficient stock)
    const excessRes = await request(app)
      .post('/api/inventory/stock/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: testProductId,
        movementType: 'ADJUSTMENT_SUBTRACT',
        quantity: 100,
        reason: 'Excess subtraction attempt',
      });

    expect(excessRes.status).toBe(400);
    expect(excessRes.body.success).toBe(false);
  });

  // Test 5: POS Sale Workflow with Pricing Recalculation & Profit
  it('5. Completes POS sale, verifies backend price recalculation, and reduces stock atomically', async () => {
    // Current stock is 18. Selling 3 units @ 5800 each.
    // Unit cost is 4100.
    // Total cost = 3 * 4100 = 12300.
    // Subtotal = 3 * 5800 = 17400.
    // Discount = 400.
    // Grand Total = 17000.
    // Gross Profit = 17000 - 12300 = 4700.
    const res = await request(app)
      .post('/api/inventory/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          {
            productId: testProductId,
            quantity: 3,
            // Even if client tries to send lower price, server must use real product price!
            sellingPrice: 10,
          },
        ],
        customerName: 'Rahul Verma',
        customerPhone: '+91 99887 76655',
        paymentMethod: 'UPI',
        discount: 400,
        notes: 'Walk-in member purchase',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const sale = res.body.data;
    expect(sale.receiptNumber).toMatch(/^POS-\d{4}-\w+$/);
    expect(sale.subtotal).toBe(17400);
    expect(sale.grandTotal).toBe(17000);
    expect(sale.totalCost).toBe(12300);
    expect(sale.grossProfit).toBe(4700);

    // Stock must be 18 - 3 = 15
    const productAfter = await Product.findById(testProductId);
    expect(productAfter?.currentStock).toBe(15);
  });

  // Test 6: Concurrency / Insufficient Stock Rejection
  it('6. Rejects sales requesting more quantity than current available stock', async () => {
    // Current stock is 15. Attempt to sell 25.
    const res = await request(app)
      .post('/api/inventory/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [{ productId: testProductId, quantity: 25 }],
        paymentMethod: 'CASH',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Insufficient stock');

    // Stock remains unchanged at 15
    const product = await Product.findById(testProductId);
    expect(product?.currentStock).toBe(15);
  });

  // Test 7: Return & Refund Workflow (Restoring Stock)
  it('7. Processes a sale refund and correctly restores inventory stock', async () => {
    // Sell 1 unit
    const saleRes = await request(app)
      .post('/api/inventory/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [{ productId: testProductId, quantity: 1 }],
        paymentMethod: 'CASH',
      });
    expect(saleRes.status).toBe(201);
    const saleId = saleRes.body.data._id;

    // Stock decreased from 15 to 14
    let product = await Product.findById(testProductId);
    expect(product?.currentStock).toBe(14);

    // Refund sale with restock = true
    const refundRes = await request(app)
      .post(`/api/inventory/sales/${saleId}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        reason: 'Customer bought wrong flavor, un-opened box returned',
        restock: true,
      });

    expect(refundRes.status).toBe(200);
    expect(refundRes.body.data.status).toBe('REFUNDED');
    expect(refundRes.body.data.refundedAmount).toBe(saleRes.body.data.grandTotal);

    // Stock should be restored back to 15
    product = await Product.findById(testProductId);
    expect(product?.currentStock).toBe(15);

    // Verify stock movement of type RETURN
    const returnMovement = await StockMovement.findOne({
      product: testProductId,
      movementType: 'RETURN',
      referenceId: saleId,
    });
    expect(returnMovement).toBeDefined();
  });

  // Test 8: Sale Cancellation Workflow
  it('8. Cancels a sale and restores stock with audit trail', async () => {
    // Sell 2 units
    const saleRes = await request(app)
      .post('/api/inventory/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [{ productId: testProductId, quantity: 2 }],
        paymentMethod: 'CASH',
      });
    expect(saleRes.status).toBe(201);
    const saleId = saleRes.body.data._id;

    // Stock decreased from 15 to 13
    let product = await Product.findById(testProductId);
    expect(product?.currentStock).toBe(13);

    // Cancel sale
    const cancelRes = await request(app)
      .post(`/api/inventory/sales/${saleId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        reason: 'Duplicate entry accidentally punched',
      });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');

    // Stock restored back to 15
    product = await Product.findById(testProductId);
    expect(product?.currentStock).toBe(15);
  });

  // Test 9: Role-Based Access Control (Receptionist vs Admin)
  it('9. Enforces strict role-based access: Receptionist can sell but cannot see purchase costs or manage suppliers', async () => {
    // 1. Receptionist can fetch products, but purchaseCost is redacted
    const prodRes = await request(app)
      .get(`/api/inventory/products/${testProductId}`)
      .set('Authorization', `Bearer ${receptionistToken}`);

    expect(prodRes.status).toBe(200);
    expect(prodRes.body.data.purchaseCost).toBeUndefined();
    expect(prodRes.body.data.sellingPrice).toBe(5800);

    // 2. Receptionist can perform a sale
    const saleRes = await request(app)
      .post('/api/inventory/sales')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        items: [{ productId: testProductId, quantity: 1 }],
        paymentMethod: 'CASH',
      });

    expect(saleRes.status).toBe(201);
    // Cost and grossProfit must be redacted in the response
    expect(saleRes.body.data.totalCost).toBeUndefined();
    expect(saleRes.body.data.grossProfit).toBeUndefined();

    // 3. Receptionist is forbidden from creating products (403)
    const createProdRes = await request(app)
      .post('/api/inventory/products')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        name: 'Unauthorized Product',
        sku: 'UNAUTH-SKU',
        sellingPrice: 100,
      });

    expect(createProdRes.status).toBe(403);

    // 4. Receptionist is forbidden from supplier management (403)
    const supplierRes = await request(app)
      .get('/api/inventory/suppliers')
      .set('Authorization', `Bearer ${receptionistToken}`);

    expect(supplierRes.status).toBe(403);
  });

  // Test 10: Inventory Dashboard & Reports
  it('10. Generates real-time inventory dashboard statistics and reports with CSV export', async () => {
    // Dashboard
    const dashRes = await request(app)
      .get('/api/inventory/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(dashRes.status).toBe(200);
    expect(dashRes.body.success).toBe(true);
    const data = dashRes.body.data;
    expect(data.totalActiveProducts).toBeGreaterThan(0);
    expect(data.totalStockUnits).toBeGreaterThan(0);
    expect(data.todaySales).toBeGreaterThan(0);
    expect(typeof data.inventoryValuation).toBe('number');

    // Reports
    const reportRes = await request(app)
      .get('/api/inventory/reports?period=today')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(reportRes.status).toBe(200);
    expect(reportRes.body.data.sales.totalRevenue).toBeGreaterThan(0);
    expect(reportRes.body.data.productSales.length).toBeGreaterThan(0);

    // CSV Export
    const exportRes = await request(app)
      .get('/api/inventory/reports/export?type=sales&period=today')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(exportRes.status).toBe(200);
    expect(exportRes.headers['content-type']).toContain('text/csv');
    expect(exportRes.text).toContain('Receipt Number');
  });
});
