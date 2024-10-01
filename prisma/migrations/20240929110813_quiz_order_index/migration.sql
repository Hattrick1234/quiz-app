/*
  Warnings:

  - Added the required column `orderIndex` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "difficult" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "quizId" TEXT NOT NULL,
    CONSTRAINT "Question_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Question" ("answer", "createdAt", "id", "question", "quizId", "updatedAt") SELECT "answer", "createdAt", "id", "question", "quizId", "updatedAt" FROM "Question";
DROP TABLE "Question";
ALTER TABLE "new_Question" RENAME TO "Question";
-- Voeg een standaardwaarde toe aan de nieuwe orderIndex-kolom
-- ALTER TABLE "Question" ADD COLUMN "orderIndex" INTEGER NOT NULL DEFAULT 0;

-- Verwijder de standaardwaarde voor toekomstige invoer
--ALTER TABLE "Question" ALTER COLUMN "orderIndex" DROP DEFAULT;
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
