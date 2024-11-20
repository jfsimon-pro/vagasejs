const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// Middleware de verificação de token
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.redirect('/auth/login_candidato');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    if (req.user.role !== 'candidato') {
      return res.redirect('/auth/login_candidato');
    }
    next();
  } catch (error) {
    console.error('Erro ao verificar o token:', error);
    return res.redirect('/auth/login_candidato');
  }
};

// Rota para o dashboard do candidato
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const candidato = await prisma.candidato.findUnique({
      where: { id: req.user.userId },
      include: {
        candidaturas: {
          include: {
            vaga: true,
          },
        },
      },
    });

    // Buscar todas as vagas disponíveis
    const vagas = await prisma.vaga.findMany();

    // Filtrar as vagas em que o candidato já se inscreveu
    const vagasCandidatadasIds = candidato.candidaturas.map(c => c.vagaId);
    const vagasDisponiveis = vagas.filter(vaga => !vagasCandidatadasIds.includes(vaga.id));

    res.render('candidato/dashboard', {
      candidato,
      vagasDisponiveis,
      vagasCandidatadas: candidato.candidaturas.map(c => c.vaga),
    });
  } catch (error) {
    console.error('Erro ao carregar o dashboard:', error);
    res.status(500).send('Erro ao carregar o dashboard.');
  }
});

router.post('/candidatar', verifyToken, async (req, res) => {
  const { vagaId } = req.body;

  try {
    // Verificar se o candidato já se candidatou à vaga
    const existingCandidatura = await prisma.candidatura.findFirst({
      where: {
        candidatoId: req.user.userId,
        vagaId,
      },
    });

    if (existingCandidatura) {
      return res.status(400).send('Você já se candidatou a esta vaga.');
    }

    // Criar a candidatura
    await prisma.candidatura.create({
      data: {
        candidatoId: req.user.userId,
        vagaId,
      },
    });

    res.redirect('/candidato/dashboard');
  } catch (error) {
    console.error('Erro ao candidatar-se:', error);
    res.status(500).send('Erro ao candidatar-se.');
  }
});

module.exports = router;
