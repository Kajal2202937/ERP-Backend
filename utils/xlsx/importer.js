const XLSX = require("xlsx");
const AppError = require("../../utils/AppError");

const parseExcel = (buffer) => {
  try {
    const wb = XLSX.read(buffer, {
      type: "buffer",
      cellDates: true,
    });

    if (!wb.SheetNames.length) {
      throw new AppError("Excel file has no worksheets", 400);
    }

    const sheet = wb.Sheets[wb.SheetNames[0]];

    if (!sheet) {
      throw new AppError("Worksheet missing", 400);
    }

    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      raw: false,
    });

    const filteredRows = rows.filter((row) =>
      Object.values(row).some((v) => String(v).trim() !== ""),
    );

    if (!filteredRows.length) {
      throw new AppError("Excel file is empty", 400);
    }

    return filteredRows;
  } catch (err) {
    throw new AppError(`Invalid Excel file: ${err.message}`, 400);
  }
};

const validate = (row, required, rowNum) => {
  const missing = required.filter((field) => !row[field] && row[field] !== 0);

  if (missing.length) {
    throw new AppError(
      `Row ${rowNum}: Missing fields: ${missing.join(", ")}`,
      400,
    );
  }
};

exports.parseProductImport = (buffer) => {
  const rows = parseExcel(buffer);

  return rows.map((row, i) => {
    validate(row, ["Product Name", "Category", "Price"], i + 2);

    const price = Number(row["Price"]);
    const costPrice = Number(row["Cost Price"] || 0);
    const quantity = Number(row["Quantity"] || 0);

    if (isNaN(price) || price < 0) {
      throw new AppError(`Row ${i + 2}: Invalid price`, 400);
    }

    return {
      name: String(row["Product Name"]).trim(),
      sku: String(row["SKU"] || "").trim(),
      category: String(row["Category"]).trim(),
      price,
      costPrice,
      quantity,
      status: String(row["Status"] || "active").toLowerCase(),
    };
  });
};

exports.parseSupplierImport = (buffer) => {
  const rows = parseExcel(buffer);

  return rows.map((row, i) => {
    validate(row, ["Supplier Name", "Email", "Phone"], i + 2);

    const email = String(row["Email"]).trim().toLowerCase();

    if (!/\S+@\S+\.\S+/.test(email)) {
      throw new AppError(`Row ${i + 2}: Invalid email`, 400);
    }

    return {
      name: String(row["Supplier Name"]).trim(),
      company: String(row["Company"] || "").trim(),
      email,
      phone: String(row["Phone"]).trim(),
      address: String(row["Address"] || "").trim(),
      status: String(row["Status"] || "active").toLowerCase(),
    };
  });
};

exports.parseInventoryImport = (buffer) => {
  const rows = parseExcel(buffer);

  return rows.map((row, i) => {
    const sku = String(row["SKU"] || row["Product Name"] || "").trim();
    if (!sku) {
      throw new AppError(`Row ${i + 2}: Missing SKU or Product Name`, 400);
    }

    const quantity = Number(row["Quantity"]);
    if (isNaN(quantity) || quantity < 0) {
      throw new AppError(`Row ${i + 2}: Invalid quantity`, 400);
    }

    const lowStockLimit =
      row["Low Stock Limit"] !== undefined && row["Low Stock Limit"] !== ""
        ? Number(row["Low Stock Limit"])
        : undefined;

    return {
      sku: String(row["SKU"] || "").trim() || undefined,
      productName: String(row["Product Name"] || "").trim() || undefined,
      quantity,
      ...(lowStockLimit !== undefined &&
        !isNaN(lowStockLimit) && { lowStockLimit }),
    };
  });
};

exports.parseOrdersImport = (buffer) => {
  const rows = parseExcel(buffer);

  return rows.map((row, i) => {
    validate(row, ["Product", "Quantity", "Price"], i + 2);

    return {
      product: String(row["Product"]).trim(),
      quantity: Number(row["Quantity"]),
      price: Number(row["Price"]),
      costPrice: Number(row["Cost Price"] || 0),
      supplier: String(row["Supplier"] || "").trim(),
      status: String(row["Status"] || "completed").toLowerCase(),
      orderDate: row["Order Date"] || new Date(),
    };
  });
};
