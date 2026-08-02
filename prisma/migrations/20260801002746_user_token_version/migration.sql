-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "passwordHash" TEXT,
    "phone" TEXT,
    "phoneVerifiedAt" DATETIME,
    "role" TEXT NOT NULL DEFAULT 'user',
    "accountStatus" TEXT NOT NULL DEFAULT 'active',
    "locale" TEXT NOT NULL DEFAULT 'ar',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "notificationsOn" BOOLEAN NOT NULL DEFAULT true,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "realName" TEXT,
    "lastActiveAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("accountStatus", "createdAt", "email", "emailVerified", "id", "lastActiveAt", "locale", "notificationsOn", "passwordHash", "phone", "phoneVerifiedAt", "realName", "role", "theme", "updatedAt") SELECT "accountStatus", "createdAt", "email", "emailVerified", "id", "lastActiveAt", "locale", "notificationsOn", "passwordHash", "phone", "phoneVerifiedAt", "realName", "role", "theme", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_accountStatus_idx" ON "User"("accountStatus");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
