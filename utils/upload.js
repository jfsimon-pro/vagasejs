const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Configuração de armazenamento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// Configuração do multer com limite de tamanho
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // Limite de 2MB
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png/;
    const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = fileTypes.test(file.mimetype);

    if (extName && mimeType) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos JPEG, JPG e PNG são permitidos.'));
    }
  },
});

// Função para comprimir imagem
const compressImage = async (filePath, outputPath) => {
  try {
    await sharp(filePath)
      .resize(800) // Redimensiona a largura para 800px (mantém proporção)
      .jpeg({ quality: 80 }) // Comprime para qualidade 80
      .toFile(outputPath);

    fs.unlinkSync(filePath); // Remove o arquivo original
  } catch (error) {
    console.error('Erro ao comprimir imagem:', error);
  }
};

module.exports = { upload, compressImage };
