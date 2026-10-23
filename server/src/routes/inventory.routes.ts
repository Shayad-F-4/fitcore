import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate, requireRole, AuthenticatedRequest } from '../middlewares/auth.js';
import { Product } from '../models/Product.js';
import { Supplier } from '../models/Supplier.js';
import { Purchase } from '../models/Purchase.js';
import { StockMovement } from '../models/StockMovement.js';
import { InventorySale } from '../models/InventorySale.js';
import { Member } from '../models/Member.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { recordAuditLog } from '../utils/audit.js';
import { generatePosReceiptNumber, generatePurchaseInvoiceNumber } from '../utils/receipt.js';
import { getISTDateRanges, parseReportDateRange } from '../utils/date.js';

const router = Router();

// ==========================================
// 1. INVENTORY DASHBOARD
// ==========================================
router.get('/dashboard', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'GYM_ADMIN';
    const istDates = getISTDateRanges();

    const [
      totalActiveProducts,
      stockUnitsAgg,
      lowStockProducts,
      outOfStockProducts,
      todaySalesAgg,
      monthSalesAgg,
      expiringCount,
      lowStockList,
      expiringList,
    ] = await Promise.all([
      // Total active products
      Product.countDocuments({ status: 'ACTIVE' }),

      // Total stock units
      Product.aggregate([
        { $match: { status: 'ACTIVE' } },
        { $group: { _id: null, totalUnits: { $sum: '$currentStock' }, totalValuation: { $sum: { $multiply: ['$currentStock', '$purchaseCost'] } } } },
      ]),

      // Low stock products count (stock > 0 and stock <= minStockThreshold)
      Product.countDocuments({
        status: 'ACTIVE',
        $expr: {
          $and: [{ $gt: ['$currentStock', 0] }, { $lte: ['$currentStock', '$minStockThreshold'] }],
        },
      }),

      // Out of stock products count (stock <= 0)
      Product.countDocuments({
        status: 'ACTIVE',
        currentStock: { $lte: 0 },
      }),

      // Today's product sales
      InventorySale.aggregate([
        {
          $match: {
            status: 'COMPLETED',
            saleDate: { $gte: istDates.startOfTodayIST, $lte: istDates.endOfTodayIST },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$grandTotal' },
            totalCost: { $sum: '$totalCost' },
            grossProfit: { $sum: '$grossProfit' },
            count: { $sum: 1 },
          },
        },
      ]),

      // This month's product sales
      InventorySale.aggregate([
        {
          $match: {
            status: 'COMPLETED',
            saleDate: { $gte: istDates.startOfThisMonthIST, $lte: istDates.endOfTodayIST },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$grandTotal' },
            totalCost: { $sum: '$totalCost' },
            grossProfit: { $sum: '$grossProfit' },
            count: { $sum: 1 },
          },
        },
      ]),

      // Products approaching expiry within next 30 days
      Product.countDocuments({
        status: 'ACTIVE',
        expiryDate: { $gte: istDates.startOfTodayIST, $lte: istDates.endOf30DaysLaterIST },
      }),

      // Top 5 low-stock alerts
      Product.find({
        status: 'ACTIVE',
        $expr: { $lte: ['$currentStock', '$minStockThreshold'] },
      })
        .select('name sku currentStock minStockThreshold unit sellingPrice')
        .sort({ currentStock: 1 })
        .limit(5)
        .lean(),

      // Top 5 expiring soon
      Product.find({
        status: 'ACTIVE',
        expiryDate: { $gte: istDates.startOfTodayIST, $lte: istDates.endOf30DaysLaterIST },
      })
        .select('name sku currentStock expiryDate batchNumber')
        .sort({ expiryDate: 1 })
        .limit(5)
        .lean(),
    ]);

    const totalStockUnits = stockUnitsAgg[0]?.totalUnits || 0;
    const inventoryValuation = isAdmin ? (stockUnitsAgg[0]?.totalValuation || 0) : undefined;
    const todaySales = todaySalesAgg[0]?.totalRevenue || 0;
    const todayGrossProfit = isAdmin ? (todaySalesAgg[0]?.grossProfit || 0) : undefined;
    const monthSales = monthSalesAgg[0]?.totalRevenue || 0;
    const monthGrossProfit = isAdmin ? (monthSalesAgg[0]?.grossProfit || 0) : undefined;

    sendSuccess(res, 'Inventory dashboard statistics retrieved', {
      totalActiveProducts,
      totalStockUnits,
      lowStockProducts,
      outOfStockProducts,
      todaySales,
      todayGrossProfit,
      todaySalesCount: todaySalesAgg[0]?.count || 0,
      monthSales,
      monthGrossProfit,
      monthSalesCount: monthSalesAgg[0]?.count || 0,
      inventoryValuation,
      productsApproachingExpiry: expiringCount,
      lowStockList,
      expiringList,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to load inventory dashboard', 500);
  }
});

// ==========================================
// 2. PRODUCT MANAGEMENT (CRUD)
// ==========================================

// GET /api/inventory/products (Search, filter, paginate)
router.get('/products', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'GYM_ADMIN';
    const {
      search,
      category,
      brand,
      status = 'ACTIVE',
      lowStock,
      outOfStock,
      page = '1',
      limit = '50',
      sortBy = 'name',
      sortOrder = 'asc',
    } = req.query as Record<string, string>;

    const query: any = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (category && category !== 'ALL') {
      query.category = category;
    }

    if (brand && brand !== 'ALL') {
      query.brand = brand;
    }

    if (search && search.trim()) {
      const term = search.trim();
      const regex = new RegExp(term, 'i');
      query.$or = [{ name: regex }, { sku: regex }, { barcode: regex }, { brand: regex }];
    }

    if (lowStock === 'true') {
      query.$expr = {
        $and: [{ $gt: ['$currentStock', 0] }, { $lte: ['$currentStock', '$minStockThreshold'] }],
      };
    } else if (outOfStock === 'true') {
      query.currentStock = { $lte: 0 };
    }

    const sortOption: any = {};
    sortOption[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [products, totalCount] = await Promise.all([
      Product.find(query)
        .populate('supplier', 'name phone')
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query),
    ]);

    // Redact purchaseCost for non-admin staff
    const sanitizedProducts = products.map((p) => {
      if (!isAdmin) {
        const { purchaseCost, ...rest } = p;
        return rest;
      }
      return p;
    });

    sendSuccess(res, 'Products retrieved successfully', {
      products: sanitizedProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch products', 500);
  }
});

// GET /api/inventory/products/:id
router.get('/products/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'GYM_ADMIN';
    const product = await Product.findById(req.params.id).populate('supplier', 'name phone email').lean();

    if (!product) {
      sendError(res, 'Product not found', 404);
      return;
    }

    if (!isAdmin) {
      delete (product as any).purchaseCost;
    }

    sendSuccess(res, 'Product retrieved', product);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch product', 500);
  }
});

// POST /api/inventory/products (Admin Only)
router.post('/products', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      sku,
      barcode,
      category,
      brand,
      description,
      purchaseCost,
      sellingPrice,
      currentStock = 0,
      minStockThreshold = 5,
      unit = 'PIECE',
      supplier,
      batchNumber,
      expiryDate,
      imageUrl,
    } = req.body;

    if (!name || !name.trim()) {
      sendError(res, 'Product name is required', 400);
      return;
    }

    if (!sku || !sku.trim()) {
      sendError(res, 'SKU is required', 400);
      return;
    }

    const cleanSku = sku.trim().toUpperCase();

    // Check duplicate SKU
    const existingSku = await Product.findOne({ sku: cleanSku });
    if (existingSku) {
      sendError(res, `A product with SKU "${cleanSku}" already exists`, 409);
      return;
    }

    const parsedCost = Number(purchaseCost) || 0;
    const parsedPrice = Number(sellingPrice);
    const parsedStock = Math.max(0, Number(currentStock) || 0);
    const parsedThreshold = Math.max(0, Number(minStockThreshold) || 5);

    if (parsedCost < 0) {
      sendError(res, 'Purchase cost cannot be negative', 400);
      return;
    }

    if (isNaN(parsedPrice) || parsedPrice < 0) {
      sendError(res, 'Selling price must be a valid non-negative number', 400);
      return;
    }

    const product = await Product.create({
      name: name.trim(),
      sku: cleanSku,
      barcode: barcode ? barcode.trim() : undefined,
      category: category ? category.trim() : 'General',
      brand: brand ? brand.trim() : undefined,
      description: description ? description.trim() : undefined,
      purchaseCost: parsedCost,
      sellingPrice: parsedPrice,
      currentStock: parsedStock,
      minStockThreshold: parsedThreshold,
      unit: unit ? unit.trim().toUpperCase() : 'PIECE',
      supplier: supplier && mongoose.isValidObjectId(supplier) ? supplier : undefined,
      batchNumber: batchNumber ? batchNumber.trim() : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      imageUrl: imageUrl || '',
      status: 'ACTIVE',
    });

    // If initial stock was provided, record initial stock movement
    if (parsedStock > 0) {
      await StockMovement.create({
        product: product._id,
        movementType: 'ADJUSTMENT_ADD',
        quantity: parsedStock,
        previousStock: 0,
        newStock: parsedStock,
        unitCost: parsedCost,
        referenceType: 'MANUAL',
        reason: 'Initial stock entered on product registration',
        performedBy: req.user!.userId,
        performedByName: req.user!.email,
      });
    }

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'PRODUCT_CREATED',
      entity: 'Product',
      entityId: product._id.toString(),
      details: { name: product.name, sku: product.sku, sellingPrice: product.sellingPrice, initialStock: parsedStock },
      ip: req.ip,
    });

    sendSuccess(res, 'Product created successfully', product, 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to create product', 500);
  }
});

// PUT /api/inventory/products/:id (Admin Only)
router.put('/products/:id', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      sendError(res, 'Product not found', 404);
      return;
    }

    const {
      name,
      sku,
      barcode,
      category,
      brand,
      description,
      purchaseCost,
      sellingPrice,
      minStockThreshold,
      unit,
      supplier,
      batchNumber,
      expiryDate,
      imageUrl,
      status,
    } = req.body;

    if (sku && sku.trim().toUpperCase() !== product.sku) {
      const cleanSku = sku.trim().toUpperCase();
      const existing = await Product.findOne({ sku: cleanSku, _id: { $ne: product._id } });
      if (existing) {
        sendError(res, `Another product already uses SKU "${cleanSku}"`, 409);
        return;
      }
      product.sku = cleanSku;
    }

    if (name) product.name = name.trim();
    if (barcode !== undefined) product.barcode = barcode ? barcode.trim() : '';
    if (category) product.category = category.trim();
    if (brand !== undefined) product.brand = brand ? brand.trim() : '';
    if (description !== undefined) product.description = description ? description.trim() : '';

    if (purchaseCost !== undefined) {
      const cost = Number(purchaseCost);
      if (isNaN(cost) || cost < 0) {
        sendError(res, 'Purchase cost must be a non-negative number', 400);
        return;
      }
      product.purchaseCost = cost;
    }

    if (sellingPrice !== undefined) {
      const price = Number(sellingPrice);
      if (isNaN(price) || price < 0) {
        sendError(res, 'Selling price must be a non-negative number', 400);
        return;
      }
      product.sellingPrice = price;
    }

    if (minStockThreshold !== undefined) {
      product.minStockThreshold = Math.max(0, Number(minStockThreshold) || 0);
    }

    if (unit) product.unit = unit.trim().toUpperCase();
    if (supplier !== undefined) {
      product.supplier = supplier && mongoose.isValidObjectId(supplier) ? supplier : undefined;
    }
    if (batchNumber !== undefined) product.batchNumber = batchNumber ? batchNumber.trim() : '';
    if (expiryDate !== undefined) product.expiryDate = expiryDate ? new Date(expiryDate) : undefined;
    if (imageUrl !== undefined) product.imageUrl = imageUrl || '';
    if (status && ['ACTIVE', 'INACTIVE'].includes(status)) product.status = status;

    await product.save();

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'PRODUCT_UPDATED',
      entity: 'Product',
      entityId: product._id.toString(),
      details: { name: product.name, sku: product.sku, sellingPrice: product.sellingPrice },
      ip: req.ip,
    });

    sendSuccess(res, 'Product updated successfully', product);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update product', 500);
  }
});

// DELETE /api/inventory/products/:id (Admin Only)
router.delete('/products/:id', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      sendError(res, 'Product not found', 404);
      return;
    }

    // Check if product has sales or stock movements
    const hasSales = await InventorySale.exists({ 'items.product': product._id });

    if (hasSales) {
      // Soft-archive to preserve accounting integrity
      product.status = 'INACTIVE';
      await product.save();
      sendSuccess(res, 'Product has sales history and has been marked INACTIVE to preserve records', { archived: true });
    } else {
      await Product.findByIdAndDelete(product._id);
      sendSuccess(res, 'Product deleted successfully', { deleted: true });
    }

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'PRODUCT_DELETED',
      entity: 'Product',
      entityId: product._id.toString(),
      details: { name: product.name, sku: product.sku },
      ip: req.ip,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to delete product', 500);
  }
});

// ==========================================
// 3. STOCK MANAGEMENT & ADJUSTMENTS
// ==========================================

// POST /api/inventory/stock/adjust (Admin Only)
router.post('/stock/adjust', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { productId, movementType, quantity, reason } = req.body;

    if (!productId || !mongoose.isValidObjectId(productId)) {
      sendError(res, 'Valid Product ID is required', 400);
      return;
    }

    const validTypes = ['ADJUSTMENT_ADD', 'ADJUSTMENT_SUBTRACT', 'DAMAGE', 'EXPIRY'];
    if (!validTypes.includes(movementType)) {
      sendError(res, `Invalid adjustment type. Must be one of: ${validTypes.join(', ')}`, 400);
      return;
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      sendError(res, 'Adjustment quantity must be greater than 0', 400);
      return;
    }

    if (!reason || !reason.trim()) {
      sendError(res, 'A clear reason for the stock adjustment is required', 400);
      return;
    }

    const isAddition = movementType === 'ADJUSTMENT_ADD';

    // Atomic stock modification
    let product;
    if (isAddition) {
      product = await Product.findByIdAndUpdate(
        productId,
        { $inc: { currentStock: qty } },
        { new: false } // return old doc to get previousStock
      );
    } else {
      // Ensure sufficient stock to prevent negative stock
      product = await Product.findOneAndUpdate(
        { _id: productId, currentStock: { $gte: qty } },
        { $inc: { currentStock: -qty } },
        { new: false }
      );
      if (!product) {
        sendError(res, 'Insufficient stock available to perform this reduction', 400);
        return;
      }
    }

    if (!product) {
      sendError(res, 'Product not found', 404);
      return;
    }

    const previousStock = product.currentStock;
    const newStock = isAddition ? previousStock + qty : previousStock - qty;

    const movement = await StockMovement.create({
      product: product._id,
      movementType,
      quantity: qty,
      previousStock,
      newStock,
      unitCost: product.purchaseCost,
      referenceType: 'ADJUSTMENT',
      reason: reason.trim(),
      performedBy: req.user!.userId,
      performedByName: req.user!.email,
    });

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'STOCK_ADJUSTED',
      entity: 'Product',
      entityId: product._id.toString(),
      details: { movementType, quantity: qty, previousStock, newStock, reason },
      ip: req.ip,
    });

    sendSuccess(res, 'Stock adjusted successfully', {
      product: { _id: product._id, name: product.name, currentStock: newStock },
      movement,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to adjust stock', 500);
  }
});

// GET /api/inventory/stock/movements
router.get('/stock/movements', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'GYM_ADMIN';
    const { productId, movementType, page = '1', limit = '50', startDate, endDate } = req.query as Record<string, string>;

    const query: any = {};
    if (productId && mongoose.isValidObjectId(productId)) {
      query.product = productId;
    }
    if (movementType && movementType !== 'ALL') {
      query.movementType = movementType;
    }
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      s.setHours(0, 0, 0, 0);
      e.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: s, $lte: e };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [movements, total] = await Promise.all([
      StockMovement.find(query)
        .populate('product', 'name sku unit sellingPrice')
        .populate('performedBy', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      StockMovement.countDocuments(query),
    ]);

    const sanitized = movements.map((m) => {
      if (!isAdmin) {
        const { unitCost, ...rest } = m;
        return rest;
      }
      return m;
    });

    sendSuccess(res, 'Stock movements retrieved', {
      movements: sanitized,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch stock movements', 500);
  }
});

// ==========================================
// 4. SUPPLIER MANAGEMENT
// ==========================================

// GET /api/inventory/suppliers (Admin Only)
router.get('/suppliers', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 }).lean();
    sendSuccess(res, 'Suppliers retrieved successfully', suppliers);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch suppliers', 500);
  }
});

// GET /api/inventory/suppliers/:id (Admin Only)
router.get('/suppliers/:id', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      sendError(res, 'Supplier not found', 404);
      return;
    }

    const purchases = await Purchase.find({ supplier: supplier._id }).sort({ purchaseDate: -1 }).limit(20).lean();

    sendSuccess(res, 'Supplier details retrieved', { supplier, purchases });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch supplier', 500);
  }
});

// POST /api/inventory/suppliers (Admin Only)
router.post('/suppliers', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, email, address, notes } = req.body;

    if (!name || !name.trim()) {
      sendError(res, 'Supplier name is required', 400);
      return;
    }

    if (!phone || !phone.trim()) {
      sendError(res, 'Supplier phone number is required', 400);
      return;
    }

    const supplier = await Supplier.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim().toLowerCase() : undefined,
      address: address ? address.trim() : undefined,
      notes: notes ? notes.trim() : undefined,
      status: 'ACTIVE',
    });

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'SUPPLIER_CREATED',
      entity: 'Supplier',
      entityId: supplier._id.toString(),
      details: { name: supplier.name, phone: supplier.phone },
      ip: req.ip,
    });

    sendSuccess(res, 'Supplier registered successfully', supplier, 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to create supplier', 500);
  }
});

// PUT /api/inventory/suppliers/:id (Admin Only)
router.put('/suppliers/:id', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      sendError(res, 'Supplier not found', 404);
      return;
    }

    const { name, phone, email, address, notes, status } = req.body;

    if (name) supplier.name = name.trim();
    if (phone) supplier.phone = phone.trim();
    if (email !== undefined) supplier.email = email ? email.trim().toLowerCase() : undefined;
    if (address !== undefined) supplier.address = address ? address.trim() : undefined;
    if (notes !== undefined) supplier.notes = notes ? notes.trim() : undefined;
    if (status && ['ACTIVE', 'INACTIVE'].includes(status)) supplier.status = status;

    await supplier.save();

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'SUPPLIER_UPDATED',
      entity: 'Supplier',
      entityId: supplier._id.toString(),
      details: { name: supplier.name, phone: supplier.phone },
      ip: req.ip,
    });

    sendSuccess(res, 'Supplier updated successfully', supplier);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update supplier', 500);
  }
});

// ==========================================
// 5. PURCHASE MANAGEMENT
// ==========================================

// GET /api/inventory/purchases (Admin Only)
router.get('/purchases', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { supplierId, page = '1', limit = '50', startDate, endDate } = req.query as Record<string, string>;

    const query: any = {};
    if (supplierId && mongoose.isValidObjectId(supplierId)) {
      query.supplier = supplierId;
    }
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      s.setHours(0, 0, 0, 0);
      e.setHours(23, 59, 59, 999);
      query.purchaseDate = { $gte: s, $lte: e };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [purchases, total] = await Promise.all([
      Purchase.find(query)
        .populate('supplier', 'name phone')
        .populate('recordedBy', 'fullName email')
        .sort({ purchaseDate: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Purchase.countDocuments(query),
    ]);

    sendSuccess(res, 'Purchases retrieved successfully', {
      purchases,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch purchases', 500);
  }
});

// GET /api/inventory/purchases/:id (Admin Only)
router.get('/purchases/:id', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('supplier', 'name phone email address')
      .populate('recordedBy', 'fullName email')
      .lean();

    if (!purchase) {
      sendError(res, 'Purchase record not found', 404);
      return;
    }

    sendSuccess(res, 'Purchase details retrieved', purchase);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch purchase details', 500);
  }
});

// POST /api/inventory/purchases (Admin Only)
router.post('/purchases', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      supplierId,
      invoiceNumber: userInvoiceNumber,
      purchaseDate,
      items,
      amountPaid = 0,
      paymentMethod = 'CASH',
      notes,
    } = req.body;

    if (!supplierId || !mongoose.isValidObjectId(supplierId)) {
      sendError(res, 'Valid Supplier ID is required', 400);
      return;
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      sendError(res, 'Supplier not found', 404);
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      sendError(res, 'Purchase must include at least one product item', 400);
      return;
    }

    const invoiceNumber = userInvoiceNumber && userInvoiceNumber.trim()
      ? userInvoiceNumber.trim().toUpperCase()
      : await generatePurchaseInvoiceNumber();

    const existingInvoice = await Purchase.findOne({ invoiceNumber });
    if (existingInvoice) {
      sendError(res, `Invoice #${invoiceNumber} already exists in the system`, 409);
      return;
    }

    let calculatedOverallTotal = 0;
    const validatedItems: any[] = [];
    const productsToUpdate: { product: any; addQty: number; newUnitCost: number; newBatch?: string; newExpiry?: Date }[] = [];

    // Pre-validate all items before executing any stock updates
    for (const item of items) {
      if (!item.productId || !mongoose.isValidObjectId(item.productId)) {
        sendError(res, 'Invalid product in purchase items', 400);
        return;
      }

      const product = await Product.findById(item.productId);
      if (!product) {
        sendError(res, `Product ${item.productId} not found`, 404);
        return;
      }

      const qty = Number(item.quantity);
      const unitCost = Number(item.purchaseCost);

      if (isNaN(qty) || qty <= 0) {
        sendError(res, `Quantity for ${product.name} must be at least 1`, 400);
        return;
      }

      if (isNaN(unitCost) || unitCost < 0) {
        sendError(res, `Purchase cost for ${product.name} cannot be negative`, 400);
        return;
      }

      const lineTotal = qty * unitCost;
      calculatedOverallTotal += lineTotal;

      validatedItems.push({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        quantity: qty,
        purchaseCost: unitCost,
        lineTotal,
        batchNumber: item.batchNumber ? item.batchNumber.trim() : undefined,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
      });

      // Calculate weighted-average cost:
      // (existingStock * existingCost + newQty * newCost) / (existingStock + newQty)
      const existingStock = Math.max(0, product.currentStock);
      const totalCombinedQty = existingStock + qty;
      const weightedAvgCost = totalCombinedQty > 0
        ? Math.round(((existingStock * product.purchaseCost + qty * unitCost) / totalCombinedQty) * 100) / 100
        : unitCost;

      productsToUpdate.push({
        product,
        addQty: qty,
        newUnitCost: weightedAvgCost,
        newBatch: item.batchNumber ? item.batchNumber.trim() : undefined,
        newExpiry: item.expiryDate ? new Date(item.expiryDate) : undefined,
      });
    }

    const parsedPaid = Math.max(0, Number(amountPaid) || 0);
    const outstandingBalance = Math.max(0, calculatedOverallTotal - parsedPaid);
    const paymentStatus = outstandingBalance === 0 ? 'PAID' : parsedPaid > 0 ? 'PARTIAL' : 'UNPAID';

    // Create Purchase document
    const purchase = await Purchase.create({
      invoiceNumber,
      supplier: supplier._id,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      items: validatedItems,
      overallTotal: calculatedOverallTotal,
      amountPaid: parsedPaid,
      outstandingBalance,
      paymentStatus,
      paymentMethod,
      notes: notes ? notes.trim() : undefined,
      recordedBy: req.user!.userId,
      status: 'CONFIRMED',
    });

    // Update stock & record movements
    for (const update of productsToUpdate) {
      const p = update.product;
      const prevStock = p.currentStock;
      const newStock = prevStock + update.addQty;

      p.currentStock = newStock;
      p.purchaseCost = update.newUnitCost;
      if (update.newBatch) p.batchNumber = update.newBatch;
      if (update.newExpiry) p.expiryDate = update.newExpiry;
      p.supplier = supplier._id;
      await p.save();

      await StockMovement.create({
        product: p._id,
        movementType: 'PURCHASE',
        quantity: update.addQty,
        previousStock: prevStock,
        newStock,
        unitCost: update.newUnitCost,
        referenceType: 'PURCHASE',
        referenceId: purchase._id.toString(),
        reason: `Stock received via Purchase Invoice #${invoiceNumber}`,
        performedBy: req.user!.userId,
        performedByName: req.user!.email,
      });
    }

    // Update supplier ledger totals
    supplier.totalPurchases += calculatedOverallTotal;
    supplier.totalPaid += parsedPaid;
    supplier.outstandingBalance += outstandingBalance;
    await supplier.save();

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'PURCHASE_RECORDED',
      entity: 'Purchase',
      entityId: purchase._id.toString(),
      details: { invoiceNumber, supplier: supplier.name, overallTotal: calculatedOverallTotal, amountPaid: parsedPaid },
      ip: req.ip,
    });

    const populated = await Purchase.findById(purchase._id)
      .populate('supplier', 'name phone')
      .populate('recordedBy', 'fullName email');

    sendSuccess(res, 'Purchase recorded and stock received successfully', populated, 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to record purchase', 500);
  }
});

// ==========================================
// 6. PRODUCT SALES & POINT OF SALE (POS)
// ==========================================

// POST /api/inventory/sales (Admin & Receptionist)
router.post('/sales', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      items,
      customerMemberId,
      customerName,
      customerPhone,
      paymentMethod = 'CASH',
      discount = 0,
      notes,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      sendError(res, 'Cart is empty. Please select products to sell.', 400);
      return;
    }

    const validPaymentMethods = ['CASH', 'UPI', 'CARD', 'NET_BANKING'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      sendError(res, 'Invalid payment method', 400);
      return;
    }

    // Optional Member linking
    let linkedMember: any = null;
    if (customerMemberId && mongoose.isValidObjectId(customerMemberId)) {
      linkedMember = await Member.findById(customerMemberId);
    }

    const finalCustomerName = linkedMember ? linkedMember.fullName : customerName?.trim() || 'Walk-in Customer';
    const finalCustomerPhone = linkedMember ? linkedMember.phone : customerPhone?.trim() || '';

    // Step 1: Pre-verify product validity, active status, and current stock on the server
    const productDeductionList: { product: any; requestedQty: number }[] = [];
    for (const cartItem of items) {
      if (!cartItem.productId || !mongoose.isValidObjectId(cartItem.productId)) {
        sendError(res, 'Invalid product in sale request', 400);
        return;
      }

      const qty = parseInt(cartItem.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        sendError(res, 'Quantity must be at least 1 for all items', 400);
        return;
      }

      const product = await Product.findById(cartItem.productId);
      if (!product || product.status !== 'ACTIVE') {
        sendError(res, `Product ${cartItem.productId} is inactive or does not exist`, 400);
        return;
      }

      if (product.currentStock < qty) {
        sendError(
          res,
          `Insufficient stock for "${product.name}". Only ${product.currentStock} units available (requested: ${qty}).`,
          400
        );
        return;
      }

      productDeductionList.push({ product, requestedQty: qty });
    }

    // Step 2: Atomic stock deduction with rollback guard against concurrent race conditions
    const successfullyDeducted: { productId: mongoose.Types.ObjectId; qty: number; previousStock: number; newStock: number }[] = [];
    const saleItems: any[] = [];
    let subtotal = 0;
    let totalCost = 0;

    for (const item of productDeductionList) {
      const p = item.product;
      const qty = item.requestedQty;

      // Atomic decrement checking currentStock >= qty
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: p._id, currentStock: { $gte: qty }, status: 'ACTIVE' },
        { $inc: { currentStock: -qty } },
        { new: true }
      );

      if (!updatedProduct) {
        // Rollback all previously deducted items in this sale
        for (const rollbackItem of successfullyDeducted) {
          await Product.findByIdAndUpdate(rollbackItem.productId, {
            $inc: { currentStock: rollbackItem.qty },
          });
        }
        sendError(res, `Stock changed concurrently for "${p.name}". Please refresh and try again.`, 409);
        return;
      }

      const prevStock = updatedProduct.currentStock + qty;
      successfullyDeducted.push({
        productId: p._id,
        qty,
        previousStock: prevStock,
        newStock: updatedProduct.currentStock,
      });

      const lineTotal = qty * p.sellingPrice;
      const lineCostTotal = qty * p.purchaseCost;

      subtotal += lineTotal;
      totalCost += lineCostTotal;

      saleItems.push({
        product: p._id,
        name: p.name,
        sku: p.sku,
        quantity: qty,
        unitCost: p.purchaseCost,
        unitPrice: p.sellingPrice,
        lineTotal,
        lineCostTotal,
      });
    }

    const parsedDiscount = Math.max(0, Number(discount) || 0);
    if (parsedDiscount > subtotal) {
      // Rollback
      for (const rollbackItem of successfullyDeducted) {
        await Product.findByIdAndUpdate(rollbackItem.productId, { $inc: { currentStock: rollbackItem.qty } });
      }
      sendError(res, 'Discount cannot exceed subtotal amount', 400);
      return;
    }

    const grandTotal = Math.max(0, subtotal - parsedDiscount);
    const grossProfit = grandTotal - totalCost;
    const receiptNumber = await generatePosReceiptNumber();

    // Step 3: Record InventorySale document
    const sale = await InventorySale.create({
      receiptNumber,
      customerMember: linkedMember ? linkedMember._id : undefined,
      customerName: finalCustomerName,
      customerPhone: finalCustomerPhone,
      items: saleItems,
      subtotal,
      discount: parsedDiscount,
      grandTotal,
      totalCost,
      grossProfit,
      paymentMethod,
      paymentStatus: 'PAID',
      status: 'COMPLETED',
      notes: notes ? notes.trim() : undefined,
      cashier: req.user!.userId,
      saleDate: new Date(),
    });

    // Step 4: Record StockMovements for each sold item
    for (const item of successfullyDeducted) {
      await StockMovement.create({
        product: item.productId,
        movementType: 'SALE',
        quantity: item.qty,
        previousStock: item.previousStock,
        newStock: item.newStock,
        referenceType: 'SALE',
        referenceId: sale._id.toString(),
        reason: `Product sold via POS Receipt #${receiptNumber}`,
        performedBy: req.user!.userId,
        performedByName: req.user!.email,
      });
    }

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'INVENTORY_SALE',
      entity: 'InventorySale',
      entityId: sale._id.toString(),
      details: { receiptNumber, grandTotal, itemsCount: saleItems.length, customer: finalCustomerName },
      ip: req.ip,
    });

    const populatedSale = await InventorySale.findById(sale._id)
      .populate('customerMember', 'fullName memberId phone')
      .populate('cashier', 'fullName email')
      .lean();

    // Redact profit and costs for receptionists
    const isAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'GYM_ADMIN';
    if (!isAdmin && populatedSale) {
      delete (populatedSale as any).totalCost;
      delete (populatedSale as any).grossProfit;
      populatedSale.items.forEach((item: any) => {
        delete item.unitCost;
        delete item.lineCostTotal;
      });
    }

    sendSuccess(res, 'Sale completed successfully', populatedSale, 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to complete sale', 500);
  }
});

// GET /api/inventory/sales (List sales history)
router.get('/sales', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'GYM_ADMIN';
    const {
      page = '1',
      limit = '50',
      period,
      startDate,
      endDate,
      status = 'COMPLETED',
      customerMemberId,
      receiptNumber,
    } = req.query as Record<string, string>;

    const query: any = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (receiptNumber && receiptNumber.trim()) {
      query.receiptNumber = new RegExp(receiptNumber.trim(), 'i');
    }

    if (customerMemberId && mongoose.isValidObjectId(customerMemberId)) {
      query.customerMember = customerMemberId;
    }

    if (period || (startDate && endDate)) {
      const range = parseReportDateRange(period, startDate, endDate);
      query.saleDate = { $gte: range.start, $lte: range.end };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [sales, total] = await Promise.all([
      InventorySale.find(query)
        .populate('customerMember', 'fullName memberId phone')
        .populate('cashier', 'fullName email')
        .sort({ saleDate: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      InventorySale.countDocuments(query),
    ]);

    const sanitizedSales = sales.map((s) => {
      if (!isAdmin) {
        const { totalCost, grossProfit, ...rest } = s;
        rest.items = rest.items.map((it: any) => {
          const { unitCost, lineCostTotal, ...itemRest } = it;
          return itemRest;
        });
        return rest;
      }
      return s;
    });

    sendSuccess(res, 'Sales history retrieved', {
      sales: sanitizedSales,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch sales history', 500);
  }
});

// GET /api/inventory/sales/:id (View sale receipt)
router.get('/sales/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'GYM_ADMIN';
    const sale = await InventorySale.findById(req.params.id)
      .populate('customerMember', 'fullName memberId phone email')
      .populate('cashier', 'fullName email')
      .lean();

    if (!sale) {
      sendError(res, 'Sale receipt not found', 404);
      return;
    }

    if (!isAdmin) {
      delete (sale as any).totalCost;
      delete (sale as any).grossProfit;
      sale.items.forEach((it: any) => {
        delete it.unitCost;
        delete it.lineCostTotal;
      });
    }

    sendSuccess(res, 'Sale receipt retrieved', sale);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch sale receipt', 500);
  }
});

// POST /api/inventory/sales/:id/cancel (Admin Only)
router.post('/sales/:id/cancel', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      sendError(res, 'Cancellation reason is required', 400);
      return;
    }

    const sale = await InventorySale.findById(req.params.id);
    if (!sale) {
      sendError(res, 'Sale record not found', 404);
      return;
    }

    if (sale.status !== 'COMPLETED') {
      sendError(res, `Sale cannot be cancelled because it is already ${sale.status}`, 400);
      return;
    }

    // Restore stock for all items
    for (const item of sale.items) {
      const product = await Product.findByIdAndUpdate(
        item.product,
        { $inc: { currentStock: item.quantity } },
        { new: true }
      );

      if (product) {
        await StockMovement.create({
          product: product._id,
          movementType: 'ADJUSTMENT_ADD',
          quantity: item.quantity,
          previousStock: product.currentStock - item.quantity,
          newStock: product.currentStock,
          unitCost: item.unitCost,
          referenceType: 'SALE',
          referenceId: sale._id.toString(),
          reason: `Sale #${sale.receiptNumber} cancelled: ${reason.trim()}`,
          performedBy: req.user!.userId,
          performedByName: req.user!.email,
        });
      }
    }

    sale.status = 'CANCELLED';
    sale.paymentStatus = 'CANCELLED';
    sale.cancellationReason = reason.trim();
    sale.cancelledAt = new Date();
    sale.cancelledBy = new mongoose.Types.ObjectId(req.user!.userId);
    await sale.save();

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'SALE_CANCELLED',
      entity: 'InventorySale',
      entityId: sale._id.toString(),
      details: { receiptNumber: sale.receiptNumber, reason },
      ip: req.ip,
    });

    sendSuccess(res, 'Sale cancelled and stock restored to inventory', sale);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to cancel sale', 500);
  }
});

// POST /api/inventory/sales/:id/refund (Admin Only - Return & Refund)
router.post('/sales/:id/refund', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { reason, restock = true } = req.body;
    if (!reason || !reason.trim()) {
      sendError(res, 'Refund and return reason is required', 400);
      return;
    }

    const sale = await InventorySale.findById(req.params.id);
    if (!sale) {
      sendError(res, 'Sale record not found', 404);
      return;
    }

    if (sale.status !== 'COMPLETED') {
      sendError(res, `Sale cannot be refunded because it is already ${sale.status}`, 400);
      return;
    }

    // If item physically returned and accepted back, restore stock
    if (restock) {
      for (const item of sale.items) {
        const product = await Product.findByIdAndUpdate(
          item.product,
          { $inc: { currentStock: item.quantity } },
          { new: true }
        );

        if (product) {
          await StockMovement.create({
            product: product._id,
            movementType: 'RETURN',
            quantity: item.quantity,
            previousStock: product.currentStock - item.quantity,
            newStock: product.currentStock,
            unitCost: item.unitCost,
            referenceType: 'SALE',
            referenceId: sale._id.toString(),
            reason: `Item returned & refunded from Receipt #${sale.receiptNumber}: ${reason.trim()}`,
            performedBy: req.user!.userId,
            performedByName: req.user!.email,
          });
        }
      }
    }

    sale.status = 'REFUNDED';
    sale.paymentStatus = 'REFUNDED';
    sale.refundedAmount = sale.grandTotal;
    sale.refundReason = reason.trim();
    sale.refundedAt = new Date();
    sale.refundedBy = new mongoose.Types.ObjectId(req.user!.userId);
    sale.restockedOnRefund = Boolean(restock);
    await sale.save();

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'SALE_REFUNDED',
      entity: 'InventorySale',
      entityId: sale._id.toString(),
      details: { receiptNumber: sale.receiptNumber, amount: sale.grandTotal, restocked: restock, reason },
      ip: req.ip,
    });

    sendSuccess(res, 'Sale refunded successfully' + (restock ? ' and stock restored' : ''), sale);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to refund sale', 500);
  }
});

// ==========================================
// 7. INVENTORY REPORTS & CSV EXPORT
// ==========================================

// GET /api/inventory/reports
router.get('/reports', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'GYM_ADMIN';
    const { period = 'month', startDate, endDate } = req.query as Record<string, string>;

    const dateRange = parseReportDateRange(period, startDate, endDate);

    // Sales aggregation
    const [salesSummary, productSalesBreakdown, stockSummary, supplierBalances] = await Promise.all([
      // Overall sales summary in period
      InventorySale.aggregate([
        {
          $match: {
            status: 'COMPLETED',
            saleDate: { $gte: dateRange.start, $lte: dateRange.end },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$grandTotal' },
            totalCost: { $sum: '$totalCost' },
            grossProfit: { $sum: '$grossProfit' },
            totalDiscount: { $sum: '$discount' },
            salesCount: { $sum: 1 },
          },
        },
      ]),

      // Product-wise sales in period
      InventorySale.aggregate([
        {
          $match: {
            status: 'COMPLETED',
            saleDate: { $gte: dateRange.start, $lte: dateRange.end },
          },
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.name' },
            sku: { $first: '$items.sku' },
            unitsSold: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.lineTotal' },
            cost: { $sum: '$items.lineCostTotal' },
          },
        },
        { $sort: { unitsSold: -1 } },
        { $limit: 30 },
      ]),

      // Current stock valuation & health
      Product.aggregate([
        { $match: { status: 'ACTIVE' } },
        {
          $group: {
            _id: null,
            totalActiveProducts: { $sum: 1 },
            totalUnits: { $sum: '$currentStock' },
            totalValuation: { $sum: { $multiply: ['$currentStock', '$purchaseCost'] } },
            lowStockCount: {
              $sum: {
                $cond: [
                  { $and: [{ $gt: ['$currentStock', 0] }, { $lte: ['$currentStock', '$minStockThreshold'] }] },
                  1,
                  0,
                ],
              },
            },
            outOfStockCount: {
              $sum: { $cond: [{ $lte: ['$currentStock', 0] }, 1, 0] },
            },
          },
        },
      ]),

      // Outstanding supplier balances (Admin Only)
      isAdmin
        ? Supplier.find({ status: 'ACTIVE' })
            .select('name phone totalPurchases totalPaid outstandingBalance')
            .sort({ outstandingBalance: -1 })
            .lean()
        : Promise.resolve([]),
    ]);

    const summary = salesSummary[0] || {
      totalRevenue: 0,
      totalCost: 0,
      grossProfit: 0,
      totalDiscount: 0,
      salesCount: 0,
    };

    const stock = stockSummary[0] || {
      totalActiveProducts: 0,
      totalUnits: 0,
      totalValuation: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
    };

    // Format product-wise breakdown
    const formattedProductSales = productSalesBreakdown.map((p) => ({
      productId: p._id,
      name: p.name,
      sku: p.sku,
      unitsSold: p.unitsSold,
      revenue: p.revenue,
      cost: isAdmin ? p.cost : undefined,
      profit: isAdmin ? p.revenue - p.cost : undefined,
    }));

    sendSuccess(res, 'Inventory reports generated', {
      period,
      dateRange: { start: dateRange.start, end: dateRange.end },
      sales: {
        totalRevenue: summary.totalRevenue,
        totalCost: isAdmin ? summary.totalCost : undefined,
        grossProfit: isAdmin ? summary.grossProfit : undefined,
        totalDiscount: summary.totalDiscount,
        salesCount: summary.salesCount,
      },
      stock: {
        totalActiveProducts: stock.totalActiveProducts,
        totalUnits: stock.totalUnits,
        totalValuation: isAdmin ? stock.totalValuation : undefined,
        lowStockCount: stock.lowStockCount,
        outOfStockCount: stock.outOfStockCount,
      },
      productSales: formattedProductSales,
      supplierBalances: isAdmin ? supplierBalances : undefined,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to generate inventory reports', 500);
  }
});

// GET /api/inventory/reports/export (CSV export)
router.get('/reports/export', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { type = 'sales', period = 'month', startDate, endDate } = req.query as Record<string, string>;
    const dateRange = parseReportDateRange(period, startDate, endDate);

    let csvContent = '';
    let filename = `inventory-${type}-${period}.csv`;

    if (type === 'sales') {
      const sales = await InventorySale.find({
        status: 'COMPLETED',
        saleDate: { $gte: dateRange.start, $lte: dateRange.end },
      })
        .populate('cashier', 'fullName')
        .sort({ saleDate: -1 })
        .lean();

      csvContent = 'Receipt Number,Date,Customer,Items Count,Subtotal (INR),Discount (INR),Grand Total (INR),Total Cost (INR),Gross Profit (INR),Payment Method,Cashier\n';
      sales.forEach((s: any) => {
        const dateStr = new Date(s.saleDate).toLocaleDateString('en-GB'); // DD/MM/YYYY
        csvContent += `"${s.receiptNumber}","${dateStr}","${s.customerName || 'Walk-in'}","${s.items.length}",${s.subtotal},${s.discount},${s.grandTotal},${s.totalCost},${s.grossProfit},"${s.paymentMethod}","${s.cashier?.fullName || 'Staff'}"\n`;
      });
    } else if (type === 'stock') {
      const products = await Product.find({ status: 'ACTIVE' }).populate('supplier', 'name').sort({ name: 1 }).lean();
      csvContent = 'SKU,Product Name,Category,Brand,Current Stock,Unit,Min Threshold,Selling Price (INR),Unit Cost (INR),Stock Valuation (INR),Supplier\n';
      products.forEach((p: any) => {
        const valuation = (p.currentStock || 0) * (p.purchaseCost || 0);
        csvContent += `"${p.sku}","${p.name}","${p.category}","${p.brand || ''}",${p.currentStock},"${p.unit}",${p.minStockThreshold},${p.sellingPrice},${p.purchaseCost},${valuation},"${p.supplier?.name || ''}"\n`;
      });
    } else if (type === 'movements') {
      const movements = await StockMovement.find({
        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
      })
        .populate('product', 'name sku')
        .sort({ createdAt: -1 })
        .lean();

      csvContent = 'Date,Product Name,SKU,Movement Type,Quantity,Previous Stock,New Stock,Reason,User\n';
      movements.forEach((m: any) => {
        const dateStr = new Date(m.createdAt).toLocaleDateString('en-GB');
        csvContent += `"${dateStr}","${m.product?.name || ''}","${m.product?.sku || ''}","${m.movementType}",${m.quantity},${m.previousStock},${m.newStock},"${m.reason.replace(/"/g, '""')}","${m.performedByName || ''}"\n`;
      });
    } else {
      sendError(res, 'Invalid export type. Must be sales, stock, or movements.', 400);
      return;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to export report CSV', 500);
  }
});

export default router;
