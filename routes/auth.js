const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const prisma = new PrismaClient();
const SALT_ROUNDS = 12;


// Configuração do multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

// Filtro para aceitar apenas arquivos PDF e DOCX
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não suportado. Apenas PDF e DOCX são permitidos.'));
  }
};

const upload = multer({ storage, fileFilter });


// Página de cadastro para empresa
router.get('/register_empresa', (req, res) => {
  res.render('auth/register_empresa', { errors: [] });
});

// Processar cadastro de empresa
router.post(
  '/register_empresa',
  [
    body('razaoSocial').notEmpty().trim().escape().withMessage('Razão Social é obrigatória.'),
    body('nomeFantasia').notEmpty().trim().escape().withMessage('Nome Fantasia é obrigatória.'),
    body('cnpj').isLength({ min: 14 }).trim().escape().withMessage('CNPJ inválido.'),
    body('ie').optional().trim().escape(),
    body('cep').notEmpty().trim().escape().withMessage('CEP é obrigatório.'),
    body('endereco').notEmpty().trim().escape().withMessage('Endereço é obrigatório.'),
    body('numero').notEmpty().trim().escape().withMessage('Número é obrigatório.'),
    body('bairro').notEmpty().trim().escape().withMessage('Bairro é obrigatório.'),
    body('cidade').notEmpty().trim().escape().withMessage('Cidade é obrigatória.'),
    body('estado').notEmpty().trim().escape().withMessage('Estado é obrigatório.'),
    body('telefone').notEmpty().trim().escape().withMessage('Telefone é obrigatório.'),
    body('whatsapp').notEmpty().trim().escape().withMessage('WhatsApp é obrigatório.'),
    body('responsavel').notEmpty().trim().escape().withMessage('Nome do responsável é obrigatório.'),
    body('email').isEmail().normalizeEmail().withMessage('E-mail inválido.'),
    body('senha').isLength({ min: 6 }).trim().escape().withMessage('A senha deve ter pelo menos 6 caracteres.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('auth/register_empresa', { errors: errors.array() });
    }

    const {
      razaoSocial,
      nomeFantasia,
      cnpj,
      ie,
      cep,
      endereco,
      numero,
      bairro,
      cidade,
      estado,
      telefone,
      whatsapp,
      responsavel,
      email,
      senha
    } = req.body;

    try {
      // Verificar se o e-mail já está registrado
      const existingUser = await prisma.empresa.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).render('auth/register_empresa', { errors: [{ msg: 'E-mail já registrado.' }] });
      }

      // Gerar hash da senha
      const hashedPassword = await bcrypt.hash(senha, SALT_ROUNDS);

      // Criar a empresa no banco de dados
      await prisma.empresa.create({
        data: {
          razaoSocial,
          nomeFantasia,
          cnpj,
          ie,
          cep,
          endereco,
          numero,
          bairro,
          cidade,
          estado,
          telefone,
          whatsapp,
          responsavel,
          email,
          senha: hashedPassword
        }
      });

      // Redirecionar para a página de login após o cadastro
      res.redirect('/auth/login_empresa');
    } catch (error) {
      console.error(error);
      res.status(500).render('auth/register_empresa', { errors: [{ msg: 'Erro ao registrar empresa.' }] });
    }
  }
);

// Página de login
router.get('/login', (req, res) => {
  res.render('auth/login');
});

// Processar login
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('E-mail inválido.'),
  body('senha').isLength({ min: 6 }).trim().escape().withMessage('Senha inválida.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('auth/login', { errors: errors.array() });
  }

  const { email, senha } = req.body;

  try {
    // Verificar se o usuário existe
    const user = await prisma.empresa.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).render('auth/login', { errors: [{ msg: 'E-mail ou senha incorretos.' }] });
    }

    // Comparar a senha
    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) {
      return res.status(400).render('auth/login', { errors: [{ msg: 'E-mail ou senha incorretos.' }] });
    }

    // Criar token JWT
    const token = jwt.sign({ userId: user.id, role: 'empresa' }, process.env.JWT_SECRET, {
      expiresIn: '1h'
    });

    // Armazenar o token em um cookie seguro
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'Strict',
      secure: process.env.NODE_ENV === 'production'
    });

    res.redirect('/empresa/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).render('auth/login', { errors: [{ msg: 'Erro ao fazer login.' }] });
  }
});

// Rota de logout
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

// Página de cadastro para candidato
router.get('/register_candidato', (req, res) => {
  res.render('auth/register_candidato', { errors: [] });
});

// Processar cadastro de candidato
router.post(
  '/register_candidato',
  upload.single('curriculo'), // Middleware de upload para o campo 'curriculo'
  [
    body('nomeCompleto').notEmpty().trim().escape().withMessage('Nome completo é obrigatório.'),
    body('cpf').isLength({ min: 11 }).trim().escape().withMessage('CPF inválido.'),
    body('telefone').notEmpty().trim().escape().withMessage('Telefone é obrigatório.'),
    body('email').isEmail().normalizeEmail().withMessage('E-mail inválido.'),
    body('senha').isLength({ min: 6 }).trim().escape().withMessage('A senha deve ter pelo menos 6 caracteres.'),
    body('cep').notEmpty().trim().escape().withMessage('CEP é obrigatório.'),
    body('endereco').notEmpty().trim().escape().withMessage('Endereço é obrigatório.'),
    body('numero').notEmpty().trim().escape().withMessage('Número é obrigatório.'),
    body('bairro').notEmpty().trim().escape().withMessage('Bairro é obrigatório.'),
    body('cidade').notEmpty().trim().escape().withMessage('Cidade é obrigatória.'),
    body('estado').notEmpty().trim().escape().withMessage('Estado é obrigatório.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('auth/register_candidato', { errors: errors.array() });
    }

    const {
      nomeCompleto,
      cpf,
      telefone,
      email,
      senha,
      cep,
      endereco,
      numero,
      bairro,
      cidade,
      estado,
    } = req.body;

    const curriculo = req.file ? req.file.path : null;

    try {
      const existingUser = await prisma.candidato.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).render('auth/register_candidato', { errors: [{ msg: 'E-mail já registrado.' }] });
      }

      const hashedPassword = await bcrypt.hash(senha, SALT_ROUNDS);

      await prisma.candidato.create({
        data: {
          nomeCompleto,
          cpf,
          telefone,
          email,
          senha: hashedPassword,
          cep,
          endereco,
          numero,
          bairro,
          cidade,
          estado,
          curriculo,
        },
      });

      res.redirect('/auth/login_candidato');
    } catch (error) {
      console.error(error);
      res.status(500).render('auth/register_candidato', { errors: [{ msg: 'Erro ao registrar candidato.' }] });
    }
  }
);

// Processar login de candidato
// Página de login da empresa
router.get('/login_empresa', (req, res) => {
  res.render('auth/login_empresa', { errors: [] });
});

// Processar login da empresa
router.post('/login_empresa', [
  body('email').isEmail().normalizeEmail().withMessage('E-mail inválido.'),
  body('senha').isLength({ min: 6 }).trim().escape().withMessage('Senha inválida.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('auth/login_empresa', { errors: errors.array() });
  }

  const { email, senha } = req.body;

  try {
    const empresa = await prisma.empresa.findUnique({ where: { email } });
    if (!empresa) {
      return res.status(400).render('auth/login_empresa', { errors: [{ msg: 'E-mail ou senha incorretos.' }] });
    }

    const senhaValida = await bcrypt.compare(senha, empresa.senha);
    if (!senhaValida) {
      return res.status(400).render('auth/login_empresa', { errors: [{ msg: 'E-mail ou senha incorretos.' }] });
    }

    const token = jwt.sign({ userId: empresa.id, role: 'empresa' }, process.env.JWT_SECRET, {
      expiresIn: '1h'
    });

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'Strict',
      secure: process.env.NODE_ENV === 'production'
    });

    res.redirect('/empresa/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).render('auth/login_empresa', { errors: [{ msg: 'Erro ao fazer login.' }] });
  }
});

// Página de login do candidato
router.get('/login_candidato', (req, res) => {
  res.render('auth/login_candidato', { errors: [] });
});

// Processar login do candidato
router.post('/login_candidato', [
  body('email').isEmail().normalizeEmail().withMessage('E-mail inválido.'),
  body('senha').isLength({ min: 6 }).trim().escape().withMessage('Senha inválida.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('auth/login_candidato', { errors: errors.array() });
  }

  const { email, senha } = req.body;

  try {
    const candidato = await prisma.candidato.findUnique({ where: { email } });
    if (!candidato) {
      return res.status(400).render('auth/login_candidato', { errors: [{ msg: 'E-mail ou senha incorretos.' }] });
    }

    const senhaValida = await bcrypt.compare(senha, candidato.senha);
    if (!senhaValida) {
      return res.status(400).render('auth/login_candidato', { errors: [{ msg: 'E-mail ou senha incorretos.' }] });
    }

    const token = jwt.sign({ userId: candidato.id, role: 'candidato' }, process.env.JWT_SECRET, {
      expiresIn: '1h'
    });

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'Strict',
      secure: process.env.NODE_ENV === 'production'
    });

    res.redirect('/candidato/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).render('auth/login_candidato', { errors: [{ msg: 'Erro ao fazer login.' }] });
  }
});

router.get('/login_admin', (req, res) => {
  res.render('auth/login_admin', { errors: [] });
});

router.post('/login_admin', async (req, res) => {
  const { email, senha } = req.body;

  try {
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      return res.status(400).render('auth/login_admin', { errors: [{ msg: 'E-mail ou senha incorretos.' }] });
    }

    const senhaValida = await bcrypt.compare(senha, admin.senha);
    if (!senhaValida) {
      return res.status(400).render('auth/login_admin', { errors: [{ msg: 'E-mail ou senha incorretos.' }] });
    }

    const token = jwt.sign({ userId: admin.id, role: 'admin' }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'Strict',
      secure: process.env.NODE_ENV === 'production',
    });

    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).render('auth/login_admin', { errors: [{ msg: 'Erro ao fazer login.' }] });
  }
});


module.exports = router;
