-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_QuizSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "order" TEXT NOT NULL DEFAULT 'random',
    "readOption" TEXT NOT NULL DEFAULT 'none',
    "askingOrder" TEXT NOT NULL DEFAULT 'question-to-answer',
    "difficultSetting" TEXT NOT NULL DEFAULT 'off',
    CONSTRAINT "QuizSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QuizSetting_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_QuizSetting" ("askingOrder", "id", "order", "quizId", "readOption", "userId") SELECT "askingOrder", "id", "order", "quizId", "readOption", "userId" FROM "QuizSetting";
DROP TABLE "QuizSetting";
ALTER TABLE "new_QuizSetting" RENAME TO "QuizSetting";
CREATE UNIQUE INDEX "QuizSetting_userId_quizId_key" ON "QuizSetting"("userId", "quizId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
