const multer = require("multer");
const AppError = require("../utils/AppError");

const ALLOWED_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

const ALLOWED_EXTENSIONS = new Set([".xlsx", ".xls"]);

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const FILE_SIGNATURES = {
  xlsx: [0x50, 0x4b, 0x03, 0x04],
  xls: [0xd0, 0xcf, 0x11, 0xe0],
};

const matchesSignature = (buffer, signature) => {
  if (buffer.length < signature.length) return false;
  return signature.every((byte, i) => buffer[i] === byte);
};

const fileFilter = (req, file, cb) => {
  if (
    file.originalname.includes("..") ||
    file.originalname.includes("/") ||
    file.originalname.includes("\\") ||
    file.originalname.includes("\0")
  ) {
    return cb(new AppError("Invalid filename", 400));
  }

  const ext = file.originalname
    .toLowerCase()
    .slice(file.originalname.lastIndexOf("."));

  if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(
      new AppError(
        `Only Excel files (.xlsx, .xls) are allowed. ` +
          `Received: ${file.mimetype} / ${file.originalname}`,
        400,
      ),
    );
  }

  cb(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

const validateBufferMiddleware = (req, res, next) => {
  if (!req.file) {
    return next(new AppError("Please upload an Excel file", 400));
  }

  const { buffer, originalname } = req.file;

  if (!buffer || buffer.length < 4) {
    return next(
      new AppError("Uploaded file is empty or too small to be valid", 400),
    );
  }

  const ext = originalname.toLowerCase().slice(originalname.lastIndexOf("."));

  if (ext === ".xlsx" && !matchesSignature(buffer, FILE_SIGNATURES.xlsx)) {
    return next(
      new AppError(
        "File content does not match XLSX format. Upload a valid Excel file.",
        400,
      ),
    );
  }

  if (ext === ".xls" && !matchesSignature(buffer, FILE_SIGNATURES.xls)) {
    return next(
      new AppError(
        "File content does not match XLS format. Upload a valid Excel file.",
        400,
      ),
    );
  }

  next();
};

const validateXlsxBuffer = (buffer, originalname) => {
  if (!buffer || buffer.length < 4) {
    throw new AppError("Uploaded file is empty or too small to be valid", 400);
  }

  const ext = originalname.toLowerCase().slice(originalname.lastIndexOf("."));

  if (ext === ".xlsx" && !matchesSignature(buffer, FILE_SIGNATURES.xlsx)) {
    throw new AppError(
      "File content does not match XLSX format. Upload a valid Excel file.",
      400,
    );
  }

  if (ext === ".xls" && !matchesSignature(buffer, FILE_SIGNATURES.xls)) {
    throw new AppError(
      "File content does not match XLS format. Upload a valid Excel file.",
      400,
    );
  }
};

module.exports = { upload, validateBufferMiddleware, validateXlsxBuffer };
