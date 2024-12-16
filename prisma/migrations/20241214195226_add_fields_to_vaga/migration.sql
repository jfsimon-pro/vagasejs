/*
  Warnings:

  - You are about to drop the column `salario` on the `Vaga` table. All the data in the column will be lost.
  - Added the required column `cargo` to the `Vaga` table without a default value. This is not possible if the table is not empty.
  - Added the required column `escolaridade` to the `Vaga` table without a default value. This is not possible if the table is not empty.
  - Added the required column `faixaSalarial` to the `Vaga` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tipoContrato` to the `Vaga` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tipoTrabalho` to the `Vaga` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Vaga" DROP COLUMN "salario",
ADD COLUMN     "beneficios" TEXT[],
ADD COLUMN     "cargo" TEXT NOT NULL,
ADD COLUMN     "disponibilidade" TEXT,
ADD COLUMN     "escolaridade" TEXT NOT NULL,
ADD COLUMN     "faixaSalarial" TEXT NOT NULL,
ADD COLUMN     "horarioTrabalho" TEXT,
ADD COLUMN     "idiomas" TEXT[],
ADD COLUMN     "tipoContrato" TEXT NOT NULL,
ADD COLUMN     "tipoTrabalho" TEXT NOT NULL;
