-- DropForeignKey
ALTER TABLE "Candidatura" DROP CONSTRAINT "Candidatura_vagaId_fkey";

-- AddForeignKey
ALTER TABLE "Candidatura" ADD CONSTRAINT "Candidatura_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "Vaga"("id") ON DELETE CASCADE ON UPDATE CASCADE;
