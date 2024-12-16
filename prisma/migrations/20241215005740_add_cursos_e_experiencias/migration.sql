-- CreateTable
CREATE TABLE "Curso" (
    "id" TEXT NOT NULL,
    "instituicao" TEXT NOT NULL,
    "curso" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataConclusao" TIMESTAMP(3),
    "candidatoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienciaProfissional" (
    "id" TEXT NOT NULL,
    "empresa" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "funcao" TEXT NOT NULL,
    "dataEntrada" TIMESTAMP(3) NOT NULL,
    "dataSaida" TIMESTAMP(3),
    "motivo" TEXT,
    "candidatoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperienciaProfissional_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Curso" ADD CONSTRAINT "Curso_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "Candidato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienciaProfissional" ADD CONSTRAINT "ExperienciaProfissional_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "Candidato"("id") ON DELETE CASCADE ON UPDATE CASCADE;
