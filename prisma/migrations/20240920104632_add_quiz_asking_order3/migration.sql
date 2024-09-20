/*
  Warnings:

  - You are about to drop the column `askingOrder` on the `Quiz` table. All the data in the column will be lost.

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
    CONSTRAINT "Quiz_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Quiz" ("answerLanguage", "createdAt", "id", "ownerId", "questionLanguage", "title", "updatedAt") SELECT "answerLanguage", "createdAt", "id", "ownerId", "questionLanguage", "title", "updatedAt" FROM "Quiz";
DROP TABLE "Quiz";
ALTER TABLE "new_Quiz" RENAME TO "Quiz";
CREATE TABLE "new_QuizSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "order" TEXT NOT NULL DEFAULT 'random',
    "readOption" TEXT NOT NULL DEFAULT 'none',
    "askingOrder" TEXT NOT NULL DEFAULT 'question-to-answer',
    CONSTRAINT "QuizSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QuizSetting_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_QuizSetting" ("id", "order", "quizId", "readOption", "userId") SELECT "id", "order", "quizId", "readOption", "userId" FROM "QuizSetting";
DROP TABLE "QuizSetting";
ALTER TABLE "new_QuizSetting" RENAME TO "QuizSetting";
CREATE UNIQUE INDEX "QuizSetting_userId_quizId_key" ON "QuizSetting"("userId", "quizId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
