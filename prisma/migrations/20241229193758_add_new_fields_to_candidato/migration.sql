-- AlterTable
ALTER TABLE "Candidato" ADD COLUMN     "disponibilidade" TEXT,
ADD COLUMN     "escolaridade" TEXT,
ADD COLUMN     "idiomas" TEXT[],
ADD COLUMN     "ocupacao" TEXT,
ADD COLUMN     "tipoContrato" TEXT;
