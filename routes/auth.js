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
const nodemailer = require('nodemailer');

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
    body('cnpj').isLength({ min: 14 }).trim().escape().withMessage('CNPJ inválido.'),
    body('razaoSocial').notEmpty().trim().escape().withMessage('Razão Social é obrigatória.'),
    body('nomeFantasia').notEmpty().trim().escape().withMessage('Nome Fantasia é obrigatória.'),    
    body('ie').optional().trim().escape(),
    body('cep').notEmpty().trim().escape().withMessage('CEP é obrigatório.'),
    body('logradouro').notEmpty().trim().escape().withMessage('Logradouro é obrigatório.'),
    body('complemento').notEmpty().trim().escape().withMessage('Complemento é obrigatório.'),
    body('numero').notEmpty().trim().escape().withMessage('Número é obrigatório.'),
    body('bairro').notEmpty().trim().escape().withMessage('Bairro é obrigatório.'),
    body('cidade').notEmpty().trim().escape().withMessage('Cidade é obrigatória.'),
    body('uf').notEmpty().trim().escape().withMessage('Uf é obrigatório.'),
    body('telefone').notEmpty().trim().escape().withMessage('Telefone é obrigatório.'),
    body('whatsapp').notEmpty().trim().escape().withMessage('WhatsApp é obrigatório.'),
    body('responsavel').notEmpty().trim().escape().withMessage('Nome do responsável é obrigatório.'),
    body('email').isEmail().withMessage('E-mail inválido.'),
    body('senha').isLength({ min: 6 }).trim().escape().withMessage('A senha deve ter pelo menos 6 caracteres.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('auth/register_empresa', { errors: errors.array() });
    }

    const {
      cnpj,
      razaoSocial,
      nomeFantasia,      
      ie,
      cep,
      logradouro,
      complemento,
      numero,
      bairro,
      cidade,
      uf,
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

      // Criar token de verificação de e-mail
      const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '24h' });

      // Criar a empresa no banco de dados com emailVerificado = false
      await prisma.empresa.create({
        data: {
          cnpj,
          razaoSocial,
          nomeFantasia,          
          ie,
          cep,
          logradouro,
          complemento,
          numero,
          bairro,
          cidade,
          uf,
          telefone,
          whatsapp,
          responsavel,
          email,
          senha: hashedPassword,
          emailVerificado: false,
          verificationToken
        }
      });

      // Enviar e-mail de verificação
      const transporter = nodemailer.createTransport({
        service: 'Gmail', // Configure para outro serviço, se necessário
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
          
        }
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Confirme seu e-mail',
        html: `<p>Clique no link para confirmar seu e-mail:</p>
               <a href="http://localhost:3000/auth/verify-email?token=${verificationToken}">Verificar E-mail</a>`
      };

      await transporter.sendMail(mailOptions);

      // Redirecionar para a página de login com mensagem de verificação
      // Redirecionar para a página de login com mensagem de verificação
    res.render('auth/login_empresa', { errors: [], message: 'Cadastro realizado. Verifique seu e-mail para confirmar.' });

    } catch (error) {
      console.error(error);
      res.status(500).render('auth/register_empresa', { errors: [{ msg: 'Erro ao registrar empresa.' }] });
    }
  }
);


// Rota para verificar e-mail
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).render('auth/login_empresa', {
      errors: [{ msg: 'Token de verificação inválido ou expirado.' }],
      message: null, // Adicione o message para garantir que está definido
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const empresa = await prisma.empresa.findUnique({ where: { email: decoded.email } });

    if (!empresa || empresa.emailVerificado) {
      return res.status(400).render('auth/login_empresa', {
        errors: [{ msg: 'E-mail já verificado ou token inválido.' }],
        message: null,
      });
    }

    await prisma.empresa.update({
      where: { email: decoded.email },
      data: { emailVerificado: true },
    });

    return res.render('auth/login_empresa', {
      errors: [],
      message: 'E-mail verificado com sucesso. Você já pode fazer login.',
    });
  } catch (error) {
    console.error(error);
    return res.status(400).render('auth/login_empresa', {
      errors: [{ msg: 'Erro ao verificar o e-mail. Tente novamente.' }],
      message: null,
    });
  }
});


// Página de login
router.get('/login', (req, res) => {
  res.render('auth/login');
});

// Processar login
router.post('/login', [
  body('email').isEmail().withMessage('E-mail inválido.'),
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






// Página de login da empresa
router.get('/login_empresa', (req, res) => {
  res.render('auth/login_empresa', { errors: [], message: '' });
});

// Processar login da empresa
router.post('/login_empresa', [
  body('email').isEmail().withMessage('E-mail inválido.'),
  body('senha').isLength({ min: 6 }).trim().escape().withMessage('Senha inválida.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('auth/login_empresa', { errors: errors.array(), message: '' });
  }

  const { email, senha } = req.body;

  try {
    const empresa = await prisma.empresa.findUnique({ where: { email } });
    if (!empresa) {
      return res.status(400).render('auth/login_empresa', { errors: [{ msg: 'E-mail ou senha incorretos.' }], message: '' });
    }

    if (!empresa.emailVerificado) {
      return res.status(400).render('auth/login_empresa', { errors: [], message: 'Por favor, confirme seu e-mail antes de fazer login.' });
    }

    const senhaValida = await bcrypt.compare(senha, empresa.senha);
    if (!senhaValida) {
      return res.status(400).render('auth/login_empresa', { errors: [{ msg: 'E-mail ou senha incorretos.' }], message: '' });
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
    res.status(500).render('auth/login_empresa', { errors: [{ msg: 'Erro ao fazer login.' }], message: '' });
  }
});










































// ---------------------------------
// ROTAS DE AUTENTICAÇÃO DO CANDIDATO
// ---------------------------------

// Página de cadastro para candidato
router.get('/register_candidato', (req, res) => {
  res.render('auth/register_candidato', { errors: [] });
});




// Função para enviar e-mails
async function sendEmail(to, subject, html) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Certifique-se de configurar o EMAIL_USER no .env
        pass: process.env.EMAIL_PASSWORD, // Certifique-se de configurar o EMAIL_PASS no .env
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`E-mail enviado para ${to}`);
  } catch (error) {
    console.error('Erro ao enviar o e-mail:', error);
    throw error;
  }
}
router.post(
  '/register_candidato',
  [
    body('nomeCompleto').notEmpty().trim().escape().withMessage('Nome completo é obrigatório.'),
    body('cpf')
      .isLength({ min: 11, max: 11 }).trim().escape().withMessage('CPF inválido. Deve ter 11 caracteres.'),
    body('telefone').notEmpty().trim().escape().withMessage('Telefone é obrigatório.'),
    body('email').isEmail().withMessage('E-mail inválido.'),
    body('senha').isLength({ min: 6 }).trim().escape().withMessage('A senha deve ter pelo menos 6 caracteres.'),
    body('cep').notEmpty().trim().escape().withMessage('CEP é obrigatório.'),
    body('logradouro').notEmpty().trim().escape().withMessage('Logradouro é obrigatório.'),
    body('complemento').notEmpty().trim().escape().withMessage('Complemento é obrigatório.'),
    body('numero').notEmpty().trim().escape().withMessage('Número é obrigatório.'),
    body('bairro').notEmpty().trim().escape().withMessage('Bairro é obrigatório.'),
    body('cidade').notEmpty().trim().escape().withMessage('Cidade é obrigatória.'),
    body('uf').notEmpty().trim().escape().withMessage('UF é obrigatório.'),
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
      logradouro,
      complemento,
      numero,
      bairro,
      cidade,
      uf,
    } = req.body;

    try {
      const existingUser = await prisma.candidato.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).render('auth/register_candidato', { errors: [{ msg: 'E-mail já registrado.' }] });
      }

      const hashedPassword = await bcrypt.hash(senha, SALT_ROUNDS);
      const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '24h' });

      await prisma.candidato.create({
        data: {
          nomeCompleto,
          cpf,
          telefone,
          email,
          senha: hashedPassword,
          emailVerificado: false,
          verificationToken,
          cep,
          logradouro,
          complemento,
          numero,
          bairro,
          cidade,
          uf,
        },
      });

      // Enviar o e-mail de verificação
      const verificationLink = `http://localhost:3000/auth/verify_candidato?token=${verificationToken}`;
      await sendEmail(email, 'Confirmação de Cadastro', `
        <h1>Confirmação de Cadastro</h1>
        <p>Olá ${nomeCompleto},</p>
        <p>Por favor, confirme seu cadastro clicando no link abaixo:</p>
        <a href="${verificationLink}">Confirmar Cadastro</a>
      `);

      res.render('auth/login_candidato', { message: 'Cadastro realizado! Por favor, verifique seu e-mail para confirmar.' });
    } catch (error) {
      console.error('Erro ao registrar candidato:', error);
      res.status(500).render('auth/register_candidato', { errors: [{ msg: 'Erro ao registrar candidato.' }] });
    }
  }
);


// Verificar e-mail do candidato
router.get('/verify', async (req, res) => {
  const { token } = req.query;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { email } = decoded;

    const candidato = await prisma.candidato.findUnique({ where: { email } });

    if (!candidato) {
      return res.status(404).send('Candidato não encontrado.');
    }

    if (candidato.emailVerificado) {
      return res.render('auth/verify_success', { message: 'E-mail já verificado. Você pode fazer login agora.' });
    }

    await prisma.candidato.update({
      where: { email },
      data: { emailVerificado: true, verificationToken: null },
    });

    res.render('auth/verify_success', { message: 'E-mail verificado com sucesso! Você pode fazer login agora.' });
  } catch (error) {
    console.error(error);
    res.status(400).send('Token inválido ou expirado.');
  }
});

// Página de login do candidato
router.get('/login_candidato', (req, res) => {
  res.render('auth/login_candidato', { errors: [], message: null });
});

// Processar login do candidato
router.post(
  '/login_candidato',
  [
    body('email').isEmail().withMessage('E-mail inválido.'),
    body('senha').isLength({ min: 6 }).trim().escape().withMessage('Senha inválida.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('auth/login_candidato', { errors: errors.array(), message: null });
    }

    const { email, senha } = req.body;

    try {
      const candidato = await prisma.candidato.findUnique({ where: { email } });

      if (!candidato) {
        return res.status(400).render('auth/login_candidato', {
          errors: [{ msg: 'E-mail ou senha incorretos.' }],
          message: null,
        });
      }

      if (!candidato.emailVerificado) {
        return res.status(400).render('auth/login_candidato', {
          errors: [{ msg: 'E-mail não verificado. Verifique sua caixa de entrada.' }],
          message: null,
        });
      }

      const senhaValida = await bcrypt.compare(senha, candidato.senha);
      if (!senhaValida) {
        return res.status(400).render('auth/login_candidato', {
          errors: [{ msg: 'E-mail ou senha incorretos.' }],
          message: null,
        });
      }

      const token = jwt.sign({ userId: candidato.id, role: 'candidato' }, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.cookie('token', token, {
        httpOnly: true,
        sameSite: 'Strict',
        secure: process.env.NODE_ENV === 'production',
      });

      res.redirect('/candidato/dashboard');
    } catch (error) {
      console.error(error);
      res.status(500).render('auth/login_candidato', { errors: [{ msg: 'Erro ao fazer login.' }], message: null });
    }
  }
);
// Verificar e-mail do candidato
router.get('/verify_candidato', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send('Token de verificação ausente.');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const candidato = await prisma.candidato.findUnique({
      where: { email: decoded.email },
    });

    if (!candidato) {
      return res.status(404).send('Candidato não encontrado.');
    }

    if (candidato.emailVerificado) {
      return res.redirect('/auth/login_candidato');
    }

    await prisma.candidato.update({
      where: { email: decoded.email },
      data: { emailVerificado: true, verificationToken: null },
    });

    res.redirect('/auth/login_candidato');
  } catch (error) {
    console.error('Erro ao verificar e-mail:', error);
    res.status(400).send('Token de verificação inválido ou expirado.');
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
