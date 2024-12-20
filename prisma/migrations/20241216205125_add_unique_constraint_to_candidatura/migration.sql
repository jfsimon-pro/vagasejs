/*
  Warnings:

  - A unique constraint covering the columns `[candidatoId,vagaId]` on the table `Candidatura` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Candidatura_candidatoId_vagaId_key" ON "Candidatura"("candidatoId", "vagaId");
