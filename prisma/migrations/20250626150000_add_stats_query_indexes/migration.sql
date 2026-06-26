-- CreateIndex
CREATE INDEX "Email_campaignId_idx" ON "Email"("campaignId");

-- CreateIndex
CREATE INDEX "Open_campaignId_idx" ON "Open"("campaignId");

-- CreateIndex
CREATE INDEX "Open_emailId_idx" ON "Open"("emailId");

-- CreateIndex
CREATE INDEX "Click_campaignId_idx" ON "Click"("campaignId");

-- CreateIndex
CREATE INDEX "Click_emailId_idx" ON "Click"("emailId");
