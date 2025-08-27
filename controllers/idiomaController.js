const path = require('path');
const fs = require('fs');

exports.getTranslation = (req, res) => {
    const lang = req.params.lang;
    const filePath = path.join(__dirname, '..', 'locales', `${lang}.json`);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Idioma no soportado' });
    }
    const translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(translations);
};