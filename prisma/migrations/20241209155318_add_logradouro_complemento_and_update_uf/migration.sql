/*
  Warnings:

  - You are about to drop the column `estado` on the `Empresa` table. All the data in the column will be lost.
  - Added the required column `logradouro` to the `Empresa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uf` to the `Empresa` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Empresa" DROP COLUMN "estado",
ADD COLUMN     "complemento" TEXT,
ADD COLUMN     "logradouro" TEXT NOT NULL,
ADD COLUMN     "uf" TEXT NOT NULL;
