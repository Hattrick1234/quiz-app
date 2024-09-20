/*
  Warnings:

  - You are about to drop the column `askingorder` on the `Quiz` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Quiz" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ownerId" TEXT NOT NULL,
    "questionLanguage" TEXT NOT NULL DEFAULT 'nl',
    "answerLanguage" TEXT NOT NULL DEFAULT 'nl',
    "askingOrder" TEXT NOT NULL DEFAULT 'question-to-answer',
    CONSTRAINT "Quiz_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Quiz" ("answerLanguage", "createdAt", "id", "ownerId", "questionLanguage", "title", "updatedAt") SELECT "answerLanguage", "createdAt", "id", "ownerId", "questionLanguage", "title", "updatedAt" FROM "Quiz";
DROP TABLE "Quiz";
ALTER TABLE "new_Quiz" RENAME TO "Quiz";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
