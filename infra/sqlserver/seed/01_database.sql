/*
 * 01_database.sql
 *
 * Cria o banco de desenvolvimento `EDU_CORURIPE_M5_DEV` se ainda não existir.
 * Idempotente — pode rodar múltiplas vezes sem erro.
 */
IF DB_ID('EDU_CORURIPE_M5_DEV') IS NULL
BEGIN
    CREATE DATABASE EDU_CORURIPE_M5_DEV;
    PRINT 'Banco EDU_CORURIPE_M5_DEV criado.';
END
ELSE
    PRINT 'Banco EDU_CORURIPE_M5_DEV já existe — skipping.';
GO
