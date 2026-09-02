-- Migration manual 002 — tabela EDC_PASSWORD_RESET.
-- Usado pelo fluxo POST /auth/recuperar-senha + /confirmar.
-- Aplicar via SSMS no banco EDU_<cliente>_M5_DEV (mesmo do schema Prisma).
-- NÃO usar prisma migrate dev / prisma db push neste banco.

BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[EDC_PASSWORD_RESET] (
    [id] NVARCHAR(1000) NOT NULL,
    [responsavelId] INT NOT NULL,
    [codeHash] VARCHAR(255) NOT NULL,
    [emailEnviado] VARCHAR(255) NOT NULL,
    [tentativas] INT NOT NULL CONSTRAINT [EDC_PASSWORD_RESET_tentativas_df] DEFAULT 0,
    [expiresAt] DATETIME2 NOT NULL,
    [usedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [EDC_PASSWORD_RESET_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [EDC_PASSWORD_RESET_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [EDC_PASSWORD_RESET_responsavelId_createdAt_idx] ON [dbo].[EDC_PASSWORD_RESET]([responsavelId], [createdAt]);

-- AddForeignKey
ALTER TABLE [dbo].[EDC_PASSWORD_RESET] ADD CONSTRAINT [EDC_PASSWORD_RESET_responsavelId_fkey] FOREIGN KEY ([responsavelId]) REFERENCES [dbo].[EDC_RESPONSAVEL]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
