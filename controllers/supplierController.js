const supplierService = require("../services/supplierService");

// CREATE
exports.createSupplier = async (req, res) => {
  try {
    const data = await supplierService.createSupplier(req.body);

    res.status(201).json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET
exports.getSuppliers = async (req, res) => {
  try {
    const data = await supplierService.getSuppliers(req.query);

    res.json({
      success: true,
      data: data.data,
      meta: {
        total: data.total,
        page: data.page,
        pages: data.pages,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE
exports.updateSupplier = async (req, res) => {
  try {
    const data = await supplierService.updateSupplier(
      req.params.id,
      req.body
    );

    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE
exports.deleteSupplier = async (req, res) => {
  try {
    await supplierService.deleteSupplier(req.params.id);

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ✅ BULK DELETE (FIXED NAME)
exports.bulkDeleteSuppliers = async (req, res) => {
  try {
    await supplierService.bulkDelete(req.body.ids);

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ✅ TOGGLE STATUS (FIXED NAME)
exports.toggleSupplierStatus = async (req, res) => {
  try {
    const data = await supplierService.toggleStatus(req.params.id);

    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};