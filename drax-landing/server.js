const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PWD = process.env.ADMIN_PWD || 'drax2025';
const CONTENT_PATH = path.join(__dirname, 'content.json');
const IMAGES_DIR = path.join(__dirname, 'public', 'images');

if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

// Filenames con timestamp para soportar múltiples imágenes por key
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, IMAGES_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const safe = req.params.key.replace(/[^a-z0-9_-]/gi, '_');
    cb(null, safe + '_' + Date.now() + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo imágenes'));
  }
});

function authCheck(req, res, next) {
  if (req.headers['x-admin-pwd'] !== ADMIN_PWD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  next();
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GET /api/content
app.get('/api/content', (req, res) => {
  try {
    res.json(JSON.parse(fs.readFileSync(CONTENT_PATH, 'utf8')));
  } catch (e) {
    res.status(500).json({ error: 'No se pudo leer el contenido' });
  }
});

// POST /api/content — guarda todo el JSON
app.post('/api/content', authCheck, (req, res) => {
  try {
    fs.writeFileSync(CONTENT_PATH, JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo guardar' });
  }
});

// POST /api/upload/:key — sube una imagen, devuelve su URL
app.post('/api/upload/:key', authCheck, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Sin imagen' });
  res.json({ ok: true, url: '/images/' + req.file.filename });
});

// DELETE /api/image?url=/images/xxx.jpg — elimina un archivo de imagen
app.delete('/api/image', authCheck, (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('/images/')) {
    return res.status(400).json({ error: 'URL inválida' });
  }
  const filePath = path.join(IMAGES_DIR, path.basename(url));
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'No se pudo eliminar' });
  }
});

app.listen(PORT, () => console.log(`DRAX Landing en puerto ${PORT}`));
