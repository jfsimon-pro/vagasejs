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
  try {
    const candidato = await prisma.candidato.findUnique({
      where: { id: req.user.userId },
      include: {
        candidaturas: {
          include: {
            vaga: {
              include: {
                empresa: true, // Inclui os dados da empresa
              },
            },
          },
        },
      },
    });

    if (!candidato) {
      return res.status(404).send('Candidato não encontrado.');
    }

    // Filtrar as vagas aprovadas
    const vagasAprovadas = await Promise.all(
      candidato.candidaturas
        .filter(c => c.selecionado) // Apenas vagas aprovadas
        .map(async candidatura => {
          // Verifica se a empresa já foi avaliada pelo candidato
          const jaAvaliada = await prisma.avaliacao.findFirst({
            where: {
              candidatoId: req.user.userId,
              empresaId: candidatura.vaga.empresa.id,
            },
          });

          return {
            ...candidatura.vaga,
            jaAvaliada: !!jaAvaliada, // Adiciona a flag `jaAvaliada`
          };
        })
    );

    res.render('candidato/dashboard', {
      candidato,
      vagasAprovadas,
    });
  } catch (error) {
    console.error('Erro ao carregar dashboard do candidato:', error);
    res.status(500).send('Erro ao carregar dashboard.');
  }
});

/*
router.get('/vagas', verifyToken, async (req, res) => {
  const { busca, page = 1 } = req.query;
  const perPage = 3; // Quantidade de vagas por página
  const currentPage = parseInt(page, 10) || 1;

  try {
    const candidato = await prisma.candidato.findUnique({
      where: { id: req.user.userId },
      include: {
        candidaturas: {
          select: { vagaId: true }, // Apenas o ID das vagas candidatas
        },
      },
    });

    if (!candidato) {
      return res.status(404).send('Candidato não encontrado.');
    }

    // Lista de IDs das vagas que o candidato já se candidatou
    const vagasCandidatadasIds = candidato.candidaturas.map(c => c.vagaId);

    const where = busca
      ? {
          OR: [
            { titulo: { contains: busca, mode: 'insensitive' } },
            { descricao: { contains: busca, mode: 'insensitive' } },
            { cargo: { contains: busca, mode: 'insensitive' } },
          ],
        }
      : {};

    const totalVagas = await prisma.vaga.count({ where });
    const vagasDisponiveis = await prisma.vaga.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (currentPage - 1) * perPage,
      take: perPage,
    });

    res.render('candidato/vagas_disponiveis', {
      vagasDisponiveis,
      vagasCandidatadasIds, // Passar as vagas candidatas para a view
      busca: busca || '',
      currentPage,
      totalPages: Math.ceil(totalVagas / perPage),
    });
  } catch (error) {
    console.error('Erro ao carregar vagas disponíveis:', error);
    res.status(500).send('Erro ao carregar vagas disponíveis.');
  }
});
*/

router.get('/vagas-candidatadas', verifyToken, async (req, res) => {
  try {
    const candidato = await prisma.candidato.findUnique({
      where: { id: req.user.userId },
      include: {
        candidaturas: {
          include: {
            vaga: true, // Inclui detalhes da vaga na candidatura
          },
        },
      },
    });

    if (!candidato) {
      return res.status(404).send('Candidato não encontrado.');
    }

    // Extrai as vagas das candidaturas
    const vagasCandidatadas = candidato.candidaturas.map(candidatura => candidatura.vaga);

    res.render('candidato/vagas_candidatadas', { vagasCandidatadas });
  } catch (error) {
    console.error('Erro ao carregar vagas candidatadas:', error);
    res.status(500).send('Erro ao carregar as vagas que você se candidatou.');
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
    uf,
    idiomas = [], // Idiomas como array
    escolaridade,
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
        uf,
        idiomas, // Atualiza idiomas
        escolaridade,
      },
    });

    res.redirect('/candidato/dashboard');
  } catch (error) {
    console.error('Erro ao atualizar dados do candidato:', error);
    res.status(500).send('Erro ao atualizar os dados.');
  }
});
// Rota para exibir formulário de avaliação
router.get('/avaliar/:empresaId', verifyToken, async (req, res) => {
  const { empresaId } = req.params;

  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
    });

    if (!empresa) {
      return res.status(404).send('Empresa não encontrada.');
    }

    res.render('candidato/avaliar_empresa', { empresa });
  } catch (error) {
    console.error('Erro ao carregar formulário de avaliação:', error);
    res.status(500).send('Erro ao carregar a página.');
  }
});

// Rota para salvar avaliação
router.post('/avaliar/:empresaId', verifyToken, async (req, res) => {
  const { empresaId } = req.params;
  const { nota, comentario } = req.body;

  try {
    // Salva a avaliação no banco
    await prisma.avaliacao.create({
      data: {
        candidatoId: req.user.userId,
        empresaId,
        nota: parseInt(nota, 10),
        comentario,
      },
    });

    res.redirect('/candidato/dashboard');
  } catch (error) {
    console.error('Erro ao salvar avaliação:', error);
    res.status(500).send('Erro ao salvar a avaliação.');
  }
});

router.get('/perfil/:id', async (req, res) => {
  
  const { id } = req.params;

  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id },
      select: {
        nomeFantasia: true,
        razaoSocial: true,
        cnpj: true,
        logradouro: true,
        numero: true,
        complemento: true,
        bairro: true,
        cidade: true,
        uf: true,
        telefone: true,
        whatsapp: true,
        sobre: true,
        redesSociais: true,
        logo: true,
      },
    });

    if (!empresa) {
      return res.status(404).send('Empresa não encontrada.');
    }

    res.render('empresa/perfil', { empresa });
  } catch (error) {
    console.error('Erro ao carregar perfil da empresa:', error);
    res.status(500).send('Erro ao carregar perfil da empresa.');
  }
});





















router.get('/vagas/:vagaId/avaliar', verifyToken, async (req, res) => {
  const { vagaId } = req.params;

  try {
    const candidatura = await prisma.candidatura.findUnique({
      where: {
        candidatoId_vagaId: {
          candidatoId: req.user.userId,
          vagaId: vagaId,
        },
      },
      include: {
        vaga: {
          include: { empresa: true },
        },
      },
    });

    if (!candidatura) {
      return res.status(404).send('Candidatura não encontrada.');
    }

    res.render('candidato/avaliar_empresa', {
      vagaId,
      empresa: candidatura.vaga.empresa,
    });
  } catch (error) {
    console.error('Erro ao carregar página de avaliação:', error);
    res.status(500).send('Erro ao carregar a página de avaliação.');
  }
});



router.post('/vagas/:vagaId/avaliar', verifyToken, async (req, res) => {
  const { vagaId } = req.params;
  const { nota, comentario } = req.body;

  try {
    // Verificar a vaga e a empresa associada
    const vaga = await prisma.vaga.findUnique({
      where: { id: vagaId },
    });

    if (!vaga) {
      return res.status(404).send('Vaga não encontrada.');
    }

    // Verificar se o candidato já avaliou a empresa
    const avaliacaoExistente = await prisma.avaliacao.findFirst({
      where: {
        candidatoId: req.user.userId,
        empresaId: vaga.empresaId,
      },
    });

    if (avaliacaoExistente) {
      return res.redirect(`/candidato/dashboard?error=Você já avaliou esta empresa.`);
    }

    // Criar a avaliação
    await prisma.avaliacao.create({
      data: {
        candidatoId: req.user.userId,
        empresaId: vaga.empresaId,
        nota: parseInt(nota, 10),
        comentario,
      },
    });

    res.redirect(`/candidato/dashboard?success=Avaliação registrada com sucesso.`);
  } catch (error) {
    console.error('Erro ao registrar avaliação:', error);
    res.status(500).send('Erro ao registrar avaliação.');
  }
});



router.get('/vagas', verifyToken, async (req, res) => {
  const { busca, faixaSalarial, tipoContrato, page = 1 } = req.query;
  const perPage = 3; // Quantidade de vagas por página
  const currentPage = parseInt(page, 10) || 1;

  try {
    // Buscar IDs das vagas já candidatadas pelo candidato
    const candidaturas = await prisma.candidatura.findMany({
      where: { candidatoId: req.user.userId },
      select: { vagaId: true },
    });

    const vagasCandidatadasIds = candidaturas.map((candidatura) => candidatura.vagaId);

    // Montar condições de busca
    const where = {
      AND: [
        ...(busca
          ? [
              {
                OR: [
                  { titulo: { contains: busca, mode: 'insensitive' } },
                  { descricao: { contains: busca, mode: 'insensitive' } },
                  { cargo: { contains: busca, mode: 'insensitive' } },
                ],
              },
            ]
          : []),
        ...(faixaSalarial
          ? [{ faixaSalarial: { equals: faixaSalarial } }]
          : []),
        ...(tipoContrato
          ? [{ tipoContrato: { equals: tipoContrato } }]
          : []),
      ],
    };

    // Total de vagas
    const totalVagas = await prisma.vaga.count({ where });

    // Buscar vagas com paginação
    const vagasDisponiveis = await prisma.vaga.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (currentPage - 1) * perPage,
      take: perPage,
    });

    // Renderizar a página com as vagas filtradas
    res.render('candidato/vagas_disponiveis', {
      vagasDisponiveis,
      vagasCandidatadasIds, // Passar os IDs das vagas já candidatadas
      busca: busca || '',
      faixaSalarial: faixaSalarial || '',
      tipoContrato: tipoContrato || '',
      currentPage,
      totalPages: Math.ceil(totalVagas / perPage),
    });
  } catch (error) {
    console.error('Erro ao carregar vagas disponíveis:', error);
    res.status(500).send('Erro ao carregar vagas disponíveis.');
  }
});













router.get('/metas', verifyToken, async (req, res) => {
  try {
    const candidato = await prisma.candidato.findUnique({
      where: { id: req.user.userId },
      select: {
        tipoContrato: true,
        ocupacao: true,
        disponibilidade: true,
        faixaSalarial: true,
      },
    });

    if (!candidato) {
      return res.status(404).send('Candidato não encontrado.');
    }

    res.render('candidato/minhas_metas', { candidato });
  } catch (error) {
    console.error('Erro ao carregar metas:', error);
    res.status(500).send('Erro ao carregar metas.');
  }
});











router.post('/metas', verifyToken, async (req, res) => {
  const { tipoContrato, ocupacao, disponibilidade, faixaSalarial } = req.body;



  try {
    await prisma.candidato.update({
      where: { id: req.user.userId },
      data: {
        tipoContrato: tipoContrato || null,
        ocupacao: ocupacao || null,
        disponibilidade: disponibilidade || null,
        faixaSalarial: faixaSalarial || null,
      },
    });

    res.redirect('/candidato/metas');
  } catch (error) {
    console.error('Erro ao salvar metas:', error);
    res.status(500).send('Erro ao salvar metas.');
  }
});






























router.get('/vagas/:vagaId/detalhes', verifyToken, async (req, res) => {
  const { vagaId } = req.params;

  try {
    const vaga = await prisma.vaga.findUnique({
      where: { id: vagaId },
      include: {
        empresa: true, // Inclui informações da empresa que criou a vaga
      },
    });

    if (!vaga) {
      return res.status(404).send('Vaga não encontrada.');
    }

    // Verificar se o candidato já está associado à vaga
    const candidaturaExistente = await prisma.candidatura.findFirst({
      where: {
        vagaId: vaga.id,
        candidatoId: req.user.userId,
      },
    });

    const jaCandidatado = !!candidaturaExistente;

    res.render('candidato/detalhes_vaga', { vaga, jaCandidatado });
  } catch (error) {
    console.error('Erro ao carregar detalhes da vaga:', error);
    res.status(500).send('Erro ao carregar os detalhes da vaga.');
  }
});



module.exports = router;







