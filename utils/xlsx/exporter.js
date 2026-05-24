const XLSX = require("xlsx");

const headerStyle = {
  font: {
    bold: true,
    color: { rgb: "FFFFFF" },
    sz: 12,
  },
  fill: {
    fgColor: { rgb: "4F46E5" },
  },
  alignment: {
    horizontal: "center",
    vertical: "center",
  },
  border: {
    top: { style: "thin", color: { rgb: "D1D5DB" } },
    bottom: { style: "thin", color: { rgb: "D1D5DB" } },
    left: { style: "thin", color: { rgb: "D1D5DB" } },
    right: { style: "thin", color: { rgb: "D1D5DB" } },
  },
};

const currencyFormat = "₹#,##0.00";
const dateFormat = "dd/mm/yyyy";

const styleHeaders = (ws, headers) => {
  headers.forEach((_, i) => {
    const ref = XLSX.utils.encode_cell({ r: 0, c: i });

    if (ws[ref]) {
      ws[ref].s = headerStyle;
    }
  });
};

const setCols = (ws, widths) => {
  ws["!cols"] = widths.map((w) => ({
    wch: w,
  }));
};

const freezeHeader = (ws) => {
  ws["!freeze"] = {
    xSplit: 0,
    ySplit: 1,
  };
};

const applyCurrencyFormat = (ws, cols, totalRows) => {
  cols.forEach((col) => {
    for (let r = 1; r <= totalRows; r++) {
      const cellRef = `${col}${r + 1}`;

      if (ws[cellRef]) {
        ws[cellRef].z = currencyFormat;
      }
    }
  });
};

const applyDateFormat = (ws, cols, totalRows) => {
  cols.forEach((col) => {
    for (let r = 1; r <= totalRows; r++) {
      const cellRef = `${col}${r + 1}`;

      if (ws[cellRef]) {
        ws[cellRef].z = dateFormat;
      }
    }
  });
};

const sendWorkbook = (wb, res, filename) => {
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}.xlsx"`,
  );

  const buffer = XLSX.write(wb, {
    type: "buffer",
    bookType: "xlsx",
    cellStyles: true,
  });

  res.end(buffer);
};

exports.exportProducts = (products, res) => {
  const headers = [
    "Product Name",
    "SKU",
    "Category",
    "Price",
    "Cost Price",
    "Quantity",
    "Supplier",
    "Status",
  ];

  const rows = products.map((p) => ({
    "Product Name": p.name || "",
    SKU: p.sku || "",
    Category: p.category || "",
    Price: p.price || 0,
    "Cost Price": p.costPrice || 0,
    Quantity: p.quantity || 0,
    Supplier: p.supplier?.name || "",
    Status: p.status || "active",
  }));

  const wb = XLSX.utils.book_new();

  const ws = XLSX.utils.json_to_sheet(rows);

  styleHeaders(ws, headers);

  freezeHeader(ws);

  setCols(ws, [28, 18, 18, 14, 16, 12, 24, 14]);

  applyCurrencyFormat(ws, ["D", "E"], rows.length);

  XLSX.utils.book_append_sheet(wb, ws, "Products");

  sendWorkbook(wb, res, `Products-Export-${Date.now()}`);
};

exports.exportSuppliers = (suppliers, res) => {
  const headers = [
    "Supplier Name",
    "Company",
    "Email",
    "Phone",
    "Address",
    "Status",
  ];

  const rows = suppliers.map((s) => ({
    "Supplier Name": s.name || "",
    Company: s.company || "",
    Email: s.email || "",
    Phone: s.phone || "",
    Address: s.address || "",
    Status: s.status || "active",
  }));

  const wb = XLSX.utils.book_new();

  const ws = XLSX.utils.json_to_sheet(rows);

  styleHeaders(ws, headers);

  freezeHeader(ws);

  setCols(ws, [28, 24, 30, 18, 30, 14]);

  XLSX.utils.book_append_sheet(wb, ws, "Suppliers");

  sendWorkbook(wb, res, `Suppliers-Export-${Date.now()}`);
};

exports.exportInventory = (inventory, res) => {
  const headers = [
    "Product Name",
    "SKU",
    "Category",
    "Quantity",
    "Low Stock Limit",
    "Status",
    "Last Updated",
  ];

  const rows = inventory.map((item) => ({
    "Product Name": item.product?.name || "",
    SKU: item.product?.sku || "",
    Category: item.product?.category || "",
    Quantity: item.quantity || 0,
    "Low Stock Limit": item.lowStockLimit || 0,
    Status: item.quantity <= item.lowStockLimit ? "Low Stock" : "Normal",
    "Last Updated": item.lastUpdated ? new Date(item.lastUpdated) : "",
  }));

  const wb = XLSX.utils.book_new();

  const ws = XLSX.utils.json_to_sheet(rows);

  styleHeaders(ws, headers);

  freezeHeader(ws);

  setCols(ws, [28, 18, 18, 12, 18, 16, 18]);

  applyDateFormat(ws, ["G"], rows.length);

  XLSX.utils.book_append_sheet(wb, ws, "Inventory");

  sendWorkbook(wb, res, `Inventory-Export-${Date.now()}`);
};

exports.exportOrders = (orders, res) => {
  const headers = [
    "Product",
    "Quantity",
    "Price",
    "Cost Price",
    "Supplier",
    "Status",
    "Order Date",
  ];

  const rows = orders.map((o) => ({
    Product: o.product?.name || "",
    Quantity: o.quantity || 0,
    Price: o.price || 0,
    "Cost Price": o.costPrice || 0,
    Supplier: o.product?.supplier?.name || "",
    Status: o.status || "",
    "Order Date": o.createdAt ? new Date(o.createdAt) : "",
  }));

  const wb = XLSX.utils.book_new();

  const ws = XLSX.utils.json_to_sheet(rows);

  styleHeaders(ws, headers);

  freezeHeader(ws);

  setCols(ws, [28, 12, 14, 16, 24, 14, 18]);

  applyCurrencyFormat(ws, ["C", "D"], rows.length);

  applyDateFormat(ws, ["G"], rows.length);

  XLSX.utils.book_append_sheet(wb, ws, "Orders");

  sendWorkbook(wb, res, `Orders-Export-${Date.now()}`);
};
