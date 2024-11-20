const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// Middleware de autenticação do Admin
const verifyAdmin = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.redirect('/auth/login_admin');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.redirect('/auth/login_admin');
    }
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Erro ao verificar o token:', error);
    res.redirect('/auth/login_admin');
  }
};

// Página inicial do Admin
router.get('/dashboard', verifyAdmin, async (req, res) => {
  res.render('admin/dashboard');
});

// Gerenciar Candidatos
router.get('/candidatos', verifyAdmin, async (req, res) => {
  const candidatos = await prisma.candidato.findMany();
  res.render('admin/candidatos', { candidatos });
});

router.post('/candidatos/:id/delete', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.candidato.delete({ where: { id } });
    res.redirect('/admin/candidatos');
  } catch (error) {
    console.error('Erro ao excluir candidato:', error);
    res.status(500).send('Erro ao excluir candidato.');
  }
});

// Gerenciar Empresas
router.get('/empresas', verifyAdmin, async (req, res) => {
  const empresas = await prisma.empresa.findMany();
  res.render('admin/empresas', { empresas });
});

router.post('/empresas/:id/delete', verifyAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Excluir todas as vagas associadas à empresa
    await prisma.vaga.deleteMany({
      where: { empresaId: id },
    });

    // Excluir a empresa
    await prisma.empresa.delete({
      where: { id },
    });

    res.redirect('/admin/empresas');
  } catch (error) {
    console.error('Erro ao excluir empresa:', error);
    res.status(500).send('Erro ao excluir empresa.');
  }
});


// Gerenciar Vagas
router.get('/vagas', verifyAdmin, async (req, res) => {
  try {
    const vagas = await prisma.vaga.findMany({
      include: { empresa: true }, // Inclui os detalhes da empresa associada
    });

    res.render('admin/vagas', { vagas });
  } catch (error) {
    console.error('Erro ao carregar as vagas:', error);
    res.status(500).send('Erro ao carregar as vagas.');
  }
});


router.post('/vagas/:id/delete', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.vaga.delete({ where: { id } });
    res.redirect('/admin/vagas');
  } catch (error) {
    console.error('Erro ao excluir vaga:', error);
    res.status(500).send('Erro ao excluir vaga.');
  }
});

module.exports = router;
