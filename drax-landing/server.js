const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PWD = process.env.ADMIN_PWD || 'drax2025';
const CONTENT_PATH = path.join(__dirname, 'content.json');
const IMAGES_DIR = path.join(__dirname, 'public', 'images');

// Asegurarse que la carpeta images existe
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

// Multer: guarda imágenes en public/images con su nombre original
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, IMAGES_DIR),
  filename: (req, file, cb) => cb(null, req.params.key + path.extname(file.originalname))
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se permiten imágenes'));
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GET /api/content → devuelve el content.json
app.get('/api/content', (req, res) => {
  try {
    const data = fs.readFileSync(CONTENT_PATH, 'utf8');
    res.json(JSON.parse(data));
  } catch (e) {
    res.status(500).json({ error: 'No se pudo leer el contenido' });
  }
});

// POST /api/content → guarda el content.json (requiere password)
app.post('/api/content', (req, res) => {
  if (req.headers['x-admin-pwd'] !== ADMIN_PWD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  try {
    fs.writeFileSync(CONTENT_PATH, JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo guardar' });
  }
});

// POST /api/upload/:key → sube una imagen (requiere password)
app.post('/api/upload/:key', (req, res, next) => {
  if (req.headers['x-admin-pwd'] !== ADMIN_PWD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  next();
}, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });
  const url = '/images/' + req.file.filename;
  res.json({ ok: true, url });
});

app.listen(PORT, () => console.log(`DRAX Landing corriendo en puerto ${PORT}`));
