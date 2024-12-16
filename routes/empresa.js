const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const prisma = new PrismaClient();
const { upload, compressImage } = require('../utils/upload'); // Já importado do utilitário


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
router.post('/vagas/criar', verifyToken, async (req, res) => {
  const {
    titulo,
    descricao,
    tags,
    cargo,
    faixaSalarial,
    tipoContrato,
    disponibilidade,
    horarioTrabalho,
    tipoTrabalho,
    escolaridade,
    idiomas,
    beneficios
  } = req.body;

  try {
    await prisma.vaga.create({
      data: {
        titulo,
        descricao,
        tags: tags.split(',').map(tag => tag.trim()),
        cargo,
        faixaSalarial,
        tipoContrato,
        disponibilidade,
        horarioTrabalho,
        tipoTrabalho,
        escolaridade,
        idiomas: idiomas || [],
        beneficios: beneficios || [],
        empresaId: req.user.userId,
      },
    });

    res.redirect('/empresa/vagas');
  } catch (error) {
    console.error('Erro ao criar vaga:', error);
    res.status(500).send('Erro ao criar vaga.');
  }
});

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


// Rota para exibir os candidatos de uma vaga específica com filtro de busca
router.get('/vagas/:vagaId/candidatos', verifyToken, async (req, res) => {
  const { vagaId } = req.params;
  const { busca } = req.query; // Captura o filtro de busca, se existir

  try {
    const candidatosQuery = {
      where: {
        candidaturas: {
          some: {
            vagaId,
          },
        },
      },
      include: {
        candidaturas: {
          where: { vagaId },
        },
        cursos: true,
        experienciasProfissionais: true,
      },
    };

    if (busca) {
      // Adicionar o filtro de busca
      candidatosQuery.where.OR = [
        { nomeCompleto: { contains: busca, mode: 'insensitive' } },
        { cidade: { contains: busca, mode: 'insensitive' } },
        {
          cursos: {
            some: {
              curso: { contains: busca, mode: 'insensitive' },
            },
          },
        },
        {
          experienciasProfissionais: {
            some: {
              empresa: { contains: busca, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    // Busca os candidatos filtrados
    const candidatos = await prisma.candidato.findMany(candidatosQuery);

    res.render('empresa/candidatos', { candidatos, vagaId, busca });
  } catch (error) {
    console.error('Erro ao buscar candidatos:', error);
    res.status(500).send('Erro ao carregar candidatos.');
  }
});

// Rota para exibir os detalhes de um candidato específico
router.get('/candidatos/:candidatoId', verifyToken, async (req, res) => {
  const { candidatoId } = req.params;

  try {
    const candidato = await prisma.candidato.findUnique({
      where: { id: candidatoId },
      include: {
        cursos: true,
        experienciasProfissionais: true,
      },
    });

    if (!candidato) {
      return res.status(404).send('Candidato não encontrado.');
    }

    res.render('empresa/detalhes_candidato', { candidato });
  } catch (error) {
    console.error('Erro ao carregar detalhes do candidato:', error);
    res.status(500).send('Erro ao carregar detalhes do candidato.');
  }
});


router.get('/candidatos/:id/detalhes', verifyToken, async (req, res) => {
  const candidatoId = req.params.id;

  try {
    const candidato = await prisma.candidato.findUnique({
      where: { id: candidatoId },
      include: {
        cursos: true,
        experienciasProfissionais: true,
        candidaturas: { // Inclui as candidaturas associadas
          include: {
            vaga: true, // Inclui detalhes da vaga para referência
          },
        },
      },
    });

    if (!candidato) {
      return res.status(404).send('Candidato não encontrado.');
    }

    res.render('empresa/detalhes_candidato', { candidato });
  } catch (error) {
    console.error('Erro ao carregar detalhes do candidato:', error);
    res.status(500).send('Erro ao carregar os detalhes do candidato.');
  }
});




router.get('/vagas/candidatos/:id', verifyToken, async (req, res) => {
  const vagaId = req.params.id;

  try {
    const candidatos = await prisma.candidatura.findMany({
      where: { vagaId },
      include: { candidato: { include: { cursos: true, experiencias: true } } },
    });

    res.render('empresa/candidatos', { candidatos });
  } catch (error) {
    console.error('Erro ao carregar candidatos:', error);
    res.status(500).send('Erro ao carregar candidatos.');
  }
});

router.get('/editar-perfil', verifyToken, async (req, res) => {
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: req.user.userId },
    });

    if (!empresa) {
      return res.status(404).send('Empresa não encontrada.');
    }

    res.render('empresa/editar_perfil', { empresa });
  } catch (error) {
    console.error('Erro ao carregar perfil da empresa:', error);
    res.status(500).send('Erro ao carregar perfil.');
  }
});



// Configuração para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads'); // Pasta onde as logos serão armazenadas
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

router.get('/editar-perfil', verifyToken, async (req, res) => {
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: req.user.userId },
    });

    if (!empresa) {
      return res.status(404).send('Empresa não encontrada.');
    }

    res.render('empresa/editar_perfil', { empresa, error: null }); // Adicione error: null
  } catch (error) {
    console.error('Erro ao carregar página de edição de perfil:', error);
    res.status(500).send('Erro ao carregar a página de edição.');
  }
});
router.post(
  '/editar-perfil',
  verifyToken,
  (req, res, next) => {
    upload.single('logo')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).render('empresa/editar_perfil', {
            empresa: req.body,
            error: 'O arquivo enviado excede o tamanho permitido de 2MB.',
          });
        }
      } else if (err) {
        return res.status(400).render('empresa/editar_perfil', {
          empresa: req.body,
          error: 'Erro ao fazer upload da imagem.',
        });
      }
      next();
    });
  },
  async (req, res) => {
    const { sobre, twitter, instagram, facebook, linkedin, whatsapp } = req.body;

    try {
      let logo = null;

      if (req.file) {
        const compressedPath = path.join(req.file.destination, `compressed-${req.file.filename}`);
        await compressImage(req.file.path, compressedPath);
        logo = `uploads/compressed-${req.file.filename}`;
      }

      await prisma.empresa.update({
        where: { id: req.user.userId },
        data: {
          logo,
          sobre,
          twitter,
          instagram,
          facebook,
          linkedin,
          whatsapp,
        },
      });

      res.redirect('/empresa/dashboard');
    } catch (error) {
      console.error('Erro ao editar perfil da empresa:', error);
      res.status(500).render('empresa/editar_perfil', {
        empresa: req.body,
        error: 'Erro ao salvar as informações. Tente novamente.',
      });
    }
  }
);



module.exports = router;