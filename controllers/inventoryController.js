const inventoryService = require("../services/inventoryService");

// ============================
// CREATE INVENTORY
// ============================
exports.createInventory = async (req, res) => {
  try {
    const data = await inventoryService.createInventory(req.body);

    res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================
// GET INVENTORY (PAGINATION + FILTERS)
// ============================
exports.getInventory = async (req, res) => {
  try {
    const result = await inventoryService.getInventory(req.query);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================
// ADD STOCK
// ============================
exports.addStock = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    const data = await inventoryService.addStock(productId, quantity);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================
// UPDATE STOCK (ABSOLUTE VALUE)
// ============================
exports.updateStock = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    const data = await inventoryService.updateStock(productId, quantity);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================
// DISABLE INVENTORY (ERP SAFE)
// ============================
exports.disableInventory = async (req, res) => {
  try {
    const { productId } = req.body;

    const data = await inventoryService.disableInventory(productId);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================
// ENABLE INVENTORY
// ============================
exports.enableInventory = async (req, res) => {
  try {
    const { productId } = req.body;

    const data = await inventoryService.enableInventory(productId);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================
// DELETE INVENTORY (SOFT ARCHIVE)
// ============================
exports.deleteInventory = async (req, res) => {
  try {
    const { productIds } = req.body;

    const data = await inventoryService.deleteInventory(productIds);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};