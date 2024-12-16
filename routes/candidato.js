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

router.get('/dashboard', verifyToken, async (req, res) => {
  const { busca, page = 1 } = req.query; // Captura o filtro de busca e a página atual
  const perPage = 3; // Quantidade de vagas por página
  const currentPage = parseInt(page, 10) || 1;

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

    if (!candidato) {
      return res.status(404).send('Candidato não encontrado.');
    }

    const vagasCandidatadasIds = candidato.candidaturas.map(c => c.vagaId);

    const whereDisponiveis = busca
      ? {
          AND: [
            { id: { notIn: vagasCandidatadasIds } },
            {
              OR: [
                { titulo: { contains: busca, mode: 'insensitive' } },
                { descricao: { contains: busca, mode: 'insensitive' } },
                { cargoFuncao: { contains: busca, mode: 'insensitive' } },
              ],
            },
          ],
        }
      : {
          id: { notIn: vagasCandidatadasIds },
        };

    const totalVagasDisponiveis = await prisma.vaga.count({ where: whereDisponiveis });
    const vagasDisponiveis = await prisma.vaga.findMany({
      where: whereDisponiveis,
      orderBy: { createdAt: 'desc' },
      skip: (currentPage - 1) * perPage,
      take: perPage,
    });

    const vagasCandidatadas = candidato.candidaturas.map(c => c.vaga);

    res.render('candidato/dashboard', {
      candidato,
      vagasDisponiveis,
      totalVagasDisponiveis,
      vagasCandidatadas,
      busca: busca || '',
      currentPage,
      totalPages: Math.ceil(totalVagasDisponiveis / perPage),
    });
  } catch (error) {
    console.error('Erro ao carregar dashboard do candidato:', error);
    res.status(500).send('Erro ao carregar dashboard.');
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

// Rota para exibir o formulário de lançamento de curso e listar cursos existentes
router.get('/lancar-curso', verifyToken, async (req, res) => {
  try {
    const cursos = await prisma.curso.findMany({
      where: { candidatoId: req.user.userId },
      orderBy: { createdAt: 'desc' }, // Ordena por data de criação
    });

    res.render('candidato/lancar_curso', { cursos });
  } catch (error) {
    console.error('Erro ao carregar cursos:', error);
    res.status(500).send('Erro ao carregar os cursos.');
  }
});


// Rota para salvar um curso no banco de dados
router.post('/lancar-curso', verifyToken, async (req, res) => {
  const { instituicao, curso, dataInicio, dataConclusao } = req.body;

  try {
    await prisma.curso.create({
      data: {
        instituicao,
        curso,
        dataInicio: new Date(dataInicio),
        dataConclusao: dataConclusao ? new Date(dataConclusao) : null,
        candidatoId: req.user.userId,
      },
    });

    res.redirect('/candidato/dashboard');
  } catch (error) {
    console.error('Erro ao lançar curso:', error);
    res.status(500).send('Erro ao lançar o curso.');
  }
});

// Rota para excluir um curso
router.post('/lancar-curso/excluir/:id', verifyToken, async (req, res) => {
  const cursoId = req.params.id;

  try {
    // Verifica se o curso pertence ao candidato logado
    const curso = await prisma.curso.findUnique({
      where: { id: cursoId },
    });

    if (!curso || curso.candidatoId !== req.user.userId) {
      return res.status(403).send('Acesso negado.');
    }

    // Exclui o curso
    await prisma.curso.delete({
      where: { id: cursoId },
    });

    res.redirect('/candidato/lancar-curso');
  } catch (error) {
    console.error('Erro ao excluir curso:', error);
    res.status(500).send('Erro ao excluir o curso.');
  }
});



// Rota para exibir o formulário de lançamento de experiências profissionais e listar existentes
router.get('/lancar-experiencia', verifyToken, async (req, res) => {
  try {
    const experiencias = await prisma.experienciaProfissional.findMany({
      where: { candidatoId: req.user.userId },
      orderBy: { createdAt: 'desc' }, // Ordena por data de criação
    });

    res.render('candidato/lancar_experiencia', { experiencias });
  } catch (error) {
    console.error('Erro ao carregar experiências:', error);
    res.status(500).send('Erro ao carregar as experiências.');
  }
});


// Rota para salvar uma experiência no banco de dados
router.post('/lancar-experiencia', verifyToken, async (req, res) => {
  const { empresa, cargo, funcao, dataEntrada, dataSaida, motivo } = req.body;

  try {
    await prisma.experienciaProfissional.create({
      data: {
        empresa,
        cargo,
        funcao,
        dataEntrada: new Date(dataEntrada),
        dataSaida: dataSaida ? new Date(dataSaida) : null,
        motivo,
        candidatoId: req.user.userId,
      },
    });

    res.redirect('/candidato/dashboard');
  } catch (error) {
    console.error('Erro ao lançar experiência:', error);
    res.status(500).send('Erro ao lançar a experiência.');
  }
});

// Rota para excluir uma experiência profissional
router.post('/lancar-experiencia/excluir/:id', verifyToken, async (req, res) => {
  const experienciaId = req.params.id;

  try {
    // Verifica se a experiência pertence ao candidato logado
    const experiencia = await prisma.experienciaProfissional.findUnique({
      where: { id: experienciaId },
    });

    if (!experiencia || experiencia.candidatoId !== req.user.userId) {
      return res.status(403).send('Acesso negado.');
    }

    // Exclui a experiência
    await prisma.experienciaProfissional.delete({
      where: { id: experienciaId },
    });

    res.redirect('/candidato/lancar-experiencia');
  } catch (error) {
    console.error('Erro ao excluir experiência:', error);
    res.status(500).send('Erro ao excluir a experiência.');
  }
});


// Rota para exibir o formulário de edição de dados
router.get('/editar-dados', verifyToken, async (req, res) => {
  try {
    const candidato = await prisma.candidato.findUnique({
      where: { id: req.user.userId },
    });

    if (!candidato) {
      return res.status(404).send('Candidato não encontrado.');
    }

    res.render('candidato/editar_dados', { candidato });
  } catch (error) {
    console.error('Erro ao carregar dados do candidato:', error);
    res.status(500).send('Erro ao carregar a página.');
  }
});


// Rota para processar a edição de dados
router.post('/editar-dados', verifyToken, async (req, res) => {
  const {
    nomeCompleto,
    telefone,
    email,
    cep,
    logradouro,
    complemento,
    numero,
    bairro,
    cidade,
    uf
  } = req.body;

  try {
    await prisma.candidato.update({
      where: { id: req.user.userId },
      data: {
        nomeCompleto,
        telefone,
        email,
        cep,
        logradouro,
        complemento,
        numero,
        bairro,
        cidade,
        uf
      },
    });

    res.redirect('/candidato/dashboard');
  } catch (error) {
    console.error('Erro ao atualizar dados do candidato:', error);
    res.status(500).send('Erro ao atualizar os dados.');
  }
});


// Rota para listar vagas disponíveis com filtro de busca
router.get('/vagas', verifyToken, async (req, res) => {
  const { busca } = req.query;

  try {
    // Filtro de busca
    const where = busca
      ? {
          OR: [
            { titulo: { contains: busca, mode: 'insensitive' } },
            { descricao: { contains: busca, mode: 'insensitive' } },
            { cargoFuncao: { contains: busca, mode: 'insensitive' } },
          ],
        }
      : {};

    const vagas = await prisma.vaga.findMany({
      where,
      orderBy: { createdAt: 'desc' }, // Ordena por data de criação
    });

    res.render('candidato/vagas', { vagas, busca });
  } catch (error) {
    console.error('Erro ao carregar vagas:', error);
    res.status(500).send('Erro ao carregar as vagas disponíveis.');
  }
});


module.exports = router;
