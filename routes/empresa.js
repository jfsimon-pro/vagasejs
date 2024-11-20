const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const prisma = new PrismaClient();

// Middleware de verificação de token
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.redirect('/auth/login');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Erro ao verificar o token:', error);
    return res.redirect('/auth/login');
  }
};

// Rota para o dashboard da empresa
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: req.user.userId },
    });

    if (!empresa) {
      return res.status(404).send('Empresa não encontrada.');
    }

    res.render('empresa/dashboard', { empresa });
  } catch (error) {
    console.error('Erro ao carregar o dashboard:', error);
    res.status(500).send('Erro ao carregar o dashboard.');
  }
});

// Rota para listar vagas da empresa
router.get('/vagas', verifyToken, async (req, res) => {
  try {
    const vagas = await prisma.vaga.findMany({
      where: { empresaId: req.user.userId },
    });

    res.render('empresa/vagas', { vagas });
  } catch (error) {
    console.error('Erro ao listar vagas:', error);
    res.status(500).send('Erro ao listar vagas.');
  }
});

// Rota para exibir o formulário de criação de vaga
router.get('/vagas/criar', verifyToken, (req, res) => {
  res.render('empresa/criar_vaga');
});

// Rota para criar uma nova vaga
router.post(
  '/vagas/criar',
  verifyToken,
  [
    body('titulo').notEmpty().trim().escape().withMessage('Título é obrigatório.'),
    body('descricao').notEmpty().trim().escape().withMessage('Descrição é obrigatória.'),
    body('salario').isFloat().withMessage('Salário deve ser um número válido.'),
    body('tags').trim().escape(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('empresa/criar_vaga', { errors: errors.array() });
    }

    const { titulo, descricao, salario, tags } = req.body;

    try {
      await prisma.vaga.create({
        data: {
          titulo,
          descricao,
          salario: parseFloat(salario),
          tags: tags.split(',').map(tag => tag.trim()),
          empresaId: req.user.userId,
        },
      });

      res.redirect('/empresa/vagas');
    } catch (error) {
      console.error('Erro ao criar vaga:', error);
      res.status(500).send('Erro ao criar vaga.');
    }
  }
);

// Rota para editar dados da empresa
router.post(
  '/editar',
  verifyToken,
  [
    body('razaoSocial').notEmpty().trim().escape().withMessage('Razão Social é obrigatória.'),
    body('nomeFantasia').notEmpty().trim().escape().withMessage('Nome Fantasia é obrigatória.'),
    body('cnpj').isLength({ min: 14 }).trim().escape().withMessage('CNPJ inválido.'),
    body('ie').optional().trim().escape(), // Removido .withMessage()
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
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send('Erro de validação.');
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
    } = req.body;

    try {
      await prisma.empresa.update({
        where: { id: req.user.userId },
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
        },
      });

      res.redirect('/empresa/dashboard');
    } catch (error) {
      console.error('Erro ao atualizar dados da empresa:', error);
      res.status(500).send('Erro ao atualizar dados.');
    }
  }
);

// Rota de logout
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/auth/login');
});


// Rota para excluir uma vaga
router.post('/vagas/excluir/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const vaga = await prisma.vaga.findUnique({
      where: { id },
    });

    if (!vaga || vaga.empresaId !== req.user.userId) {
      return res.status(403).send('Acesso negado.');
    }

    await prisma.vaga.delete({
      where: { id },
    });

    res.redirect('/empresa/vagas'); // Redireciona para a lista de vagas
  } catch (error) {
    console.error('Erro ao excluir vaga:', error);
    res.status(500).send('Erro ao excluir vaga.');
  }
});


// Rota para visualizar candidatos inscritos em uma vaga
router.get('/vagas/:id/candidatos', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar se a vaga pertence à empresa logada
    const vaga = await prisma.vaga.findUnique({
      where: { id },
      include: {
        candidaturas: {
          include: {
            candidato: true, // Inclui os dados do candidato
          },
        },
      },
    });

    if (!vaga || vaga.empresaId !== req.user.userId) {
      return res.status(403).send('Acesso negado.');
    }

    // Passar os candidatos para a view
    res.render('empresa/candidatos', { vaga });
  } catch (error) {
    console.error('Erro ao carregar candidatos:', error);
    res.status(500).send('Erro ao carregar candidatos.');
  }
});


module.exports = router;
