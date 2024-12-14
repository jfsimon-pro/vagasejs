/*
  Warnings:

  - You are about to drop the column `endereco` on the `Candidato` table. All the data in the column will be lost.
  - You are about to drop the column `estado` on the `Candidato` table. All the data in the column will be lost.
  - Added the required column `complemento` to the `Candidato` table without a default value. This is not possible if the table is not empty.
  - Added the required column `logradouro` to the `Candidato` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uf` to the `Candidato` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Candidato" DROP COLUMN "endereco",
DROP COLUMN "estado",
ADD COLUMN     "complemento" TEXT NOT NULL,
ADD COLUMN     "logradouro" TEXT NOT NULL,
ADD COLUMN     "uf" TEXT NOT NULL;
