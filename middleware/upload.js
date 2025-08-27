const multer = require('multer');
const path = require('path');
const slugify = require('slugify'); // npm install slugify

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname); // ej: ".pdf" o ".xlsx"
        const baseName = path.basename(file.originalname, ext);
        const safeName = slugify(baseName, { lower: true, strict: true });
        cb(null, `${safeName}-${timestamp}${ext}`);
    }
});

const upload = multer({ storage });

module.exports = upload;
