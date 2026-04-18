const supplierService = require("../services/supplierService");

exports.createSupplier = async (req, res) => {
  try {
    const data = await supplierService.createSupplier(req.body);

    res.status(201).json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getSuppliers = async (req, res) => {
  try {
    const result = await supplierService.getSuppliers(req.query);

    res.json({
      success: true,
      data: {
        data: result.data,
        total: result.total,
        totalPages: result.totalPages,
        activeCount: result.activeCount,
        productCount: result.productCount,
        stockValue: result.stockValue,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const data = await supplierService.updateSupplier(req.params.id, req.body);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

exports.deleteSupplier = async (req, res) => {
  try {
    await supplierService.deleteSupplier(req.params.id);

    res.json({
      success: true,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

exports.bulkDeleteSuppliers = async (req, res) => {
  try {
    const ids = req.body.ids;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No supplier IDs provided",
      });
    }

    await supplierService.bulkDelete(ids);

    res.json({
      success: true,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

exports.toggleSupplierStatus = async (req, res) => {
  try {
    const data = await supplierService.toggleStatus(req.params.id);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getSupplierAnalytics = async (req, res) => {
  try {
    const data = await supplierService.getSupplierAnalytics();

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
