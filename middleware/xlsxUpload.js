const multer = require("multer");
const AppError = require("../utils/AppError");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ];

  const validExtension =
    file.originalname.endsWith(".xlsx") ||
    file.originalname.endsWith(".xls");

  if (
    allowedMimeTypes.includes(file.mimetype) ||
    validExtension
  ) {
    cb(null, true);
  } else {
    cb(new AppError("Only Excel files are allowed", 400));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

module.exports = upload;