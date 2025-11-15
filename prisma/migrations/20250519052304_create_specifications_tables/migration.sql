-- CreateTable
CREATE TABLE "Groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Attributes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "_AttributesToGroups" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_AttributesToGroups_A_fkey" FOREIGN KEY ("A") REFERENCES "Attributes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_AttributesToGroups_B_fkey" FOREIGN KEY ("B") REFERENCES "Groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Groups_name_key" ON "Groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Attributes_name_key" ON "Attributes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_AttributesToGroups_AB_unique" ON "_AttributesToGroups"("A", "B");

-- CreateIndex
CREATE INDEX "_AttributesToGroups_B_index" ON "_AttributesToGroups"("B");
