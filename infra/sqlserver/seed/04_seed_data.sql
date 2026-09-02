/*
 * 04_seed_data.sql
 *
 * Seed mínimo pra ambiente DEV. Cria:
 *   - 1 escola, 1 curso, 1 série, 1 turma, 1 turno
 *   - 1 responsável (mãe) e 2 alunos (filhos) na GER_PESSOA_FISICA
 *   - Vínculo turma + matrícula
 *   - 1 disciplina, 1 atividade futura, 5 conteúdos diários
 *   - 2 ocorrências (1 ciente, 1 pendente)
 *   - 1 autorização de aprovação + 1 de presença
 *   - 2 tipos de solicitação
 *   - 1 template de email pra recuperação de senha
 *   - 1 Responsavel no app (EDC_RESPONSAVEL) com hash de senha "123456"
 *
 * Login DEV:
 *   CPF: 12345678901
 *   Senha: 123456
 *
 * Idempotente: usa MERGE / IF NOT EXISTS pra não duplicar.
 */
USE EDU_CORURIPE_M5_DEV;
GO

-- ─── Catálogos básicos ─────────────────────────────────────────────
MERGE EDU_ESCOLA AS t USING (VALUES (1, 'Colégio Recreio')) AS s(ESC_COD, NOME)
    ON t.ESC_COD = s.ESC_COD
    WHEN NOT MATCHED THEN INSERT (ESC_COD, ESC_NOME_REDUZIDO) VALUES (s.ESC_COD, s.NOME);

MERGE EDU_CURSO AS t USING (VALUES (1, 'Ensino Fundamental')) AS s(CUR_COD, NOME)
    ON t.CUR_COD = s.CUR_COD
    WHEN NOT MATCHED THEN INSERT (CUR_COD, CUR_NOME_REDUZIDO) VALUES (s.CUR_COD, s.NOME);

MERGE EDU_SERIE AS t USING (VALUES (1, '5º Ano', 800)) AS s(SER_COD, NOME, AULAS)
    ON t.SER_COD = s.SER_COD
    WHEN NOT MATCHED THEN INSERT (SER_COD, SER_NOME, SER_TOTAL_AULA_ANUAL) VALUES (s.SER_COD, s.NOME, s.AULAS);

MERGE EDU_TURMA AS t USING (VALUES (1, '5ºA', 1)) AS s(TMA_COD, NOME, CUR_COD)
    ON t.TMA_COD = s.TMA_COD
    WHEN NOT MATCHED THEN INSERT (TMA_COD, TMA_NOME, CUR_COD) VALUES (s.TMA_COD, s.NOME, s.CUR_COD);

MERGE EDU_TURNO AS t USING (VALUES (1, 'Manhã')) AS s(TUR_COD, NOME)
    ON t.TUR_COD = s.TUR_COD
    WHEN NOT MATCHED THEN INSERT (TUR_COD, TUR_NOME) VALUES (s.TUR_COD, s.NOME);

MERGE EDU_TURMA_ALUNO_SITUACAO AS t USING (VALUES (1, 'Transferido'), (2, 'Cancelado')) AS s(TAS_COD, DESCR)
    ON t.TAS_COD = s.TAS_COD
    WHEN NOT MATCHED THEN INSERT (TAS_COD, TAS_DESCRICAO) VALUES (s.TAS_COD, s.DESCR);
GO

-- ─── Pessoas (responsável + alunos) ───────────────────────────────
-- PES_COD 100 = Maria Silva (mãe), 200 = Pedro Silva (filho1), 201 = Ana Silva (filha2)
MERGE GER_PESSOA AS t USING (VALUES
    (100, 'MARIA SILVA SANTOS'),
    (200, 'PEDRO SILVA SANTOS'),
    (201, 'ANA SILVA SANTOS')
) AS s(COD, NOME)
    ON t.PES_COD = s.COD
    WHEN NOT MATCHED THEN INSERT (PES_COD, PES_NOME) VALUES (s.COD, s.NOME);

-- Mãe (responsável legal — sem CHECK_RESP, sem CPF_RESP)
MERGE GER_PESSOA_FISICA AS t USING (VALUES
    (100, N'MARIA SILVA',     N'MARIA SILVA SANTOS', '12345678901', NULL,           '1985-04-12', 'F', NULL),
    (200, N'PEDRO SILVA',     N'MARIA SILVA SANTOS', '06611193507', '12345678901',  '2015-09-01', 'M', 'S'),
    (201, N'ANA SILVA',       N'MARIA SILVA SANTOS', '06611193508', '12345678901',  '2017-03-20', 'F', 'S')
) AS s(COD, APELIDO, RESP, CPF, CPF_RESP, NASC, SEXO, CHECK_RESP)
    ON t.PES_COD = s.COD
    WHEN NOT MATCHED THEN INSERT (PES_COD, PFI_APELIDO, PFI_RESP, PFI_CPF, PFI_CPF_RESP, PFI_NASCIMENTO, PFI_SEXO, CHECK_RESP)
    VALUES (s.COD, s.APELIDO, s.RESP, s.CPF, s.CPF_RESP, s.NASC, s.SEXO, s.CHECK_RESP);
GO

-- ─── EDU_ALUNO (registro de aluno) ────────────────────────────────
MERGE EDU_ALUNO AS t USING (VALUES
    (200, '20250001', 'PEDRO SILVA SANTOS'),
    (201, '20250002', 'ANA SILVA SANTOS')
) AS s(COD, MAT, NOME)
    ON t.PES_COD_ALUNO = s.COD
    WHEN NOT MATCHED THEN INSERT (PES_COD_ALUNO, ALU_NUMERO_MATRICULA, ALU_NOME) VALUES (s.COD, s.MAT, s.NOME);
GO

-- ─── EDU_TURMA_ALUNO (matrícula no ano atual) ─────────────────────
DECLARE @anoAtual INT = YEAR(GETDATE());

IF NOT EXISTS (SELECT 1 FROM EDU_TURMA_ALUNO WHERE PES_COD_ALUNO = 200 AND TMH_ANO_LETIVO = @anoAtual)
BEGIN
    INSERT INTO EDU_TURMA_ALUNO (PES_COD_ALUNO, ESC_COD, CUR_COD, SER_COD, TMA_COD, TUR_COD, TMH_ANO_LETIVO, TMH_HABILITADO, TMH_SITUACAO, TMH_DATA_MATRICULA)
    VALUES (200, 1, 1, 1, 1, 1, @anoAtual, 'S', 'A', DATEADD(month, -3, GETDATE()));
END;

IF NOT EXISTS (SELECT 1 FROM EDU_TURMA_ALUNO WHERE PES_COD_ALUNO = 201 AND TMH_ANO_LETIVO = @anoAtual)
BEGIN
    INSERT INTO EDU_TURMA_ALUNO (PES_COD_ALUNO, ESC_COD, CUR_COD, SER_COD, TMA_COD, TUR_COD, TMH_ANO_LETIVO, TMH_HABILITADO, TMH_SITUACAO, TMH_DATA_MATRICULA)
    VALUES (201, 1, 1, 1, 1, 1, @anoAtual, 'S', 'A', DATEADD(month, -3, GETDATE()));
END;
GO

-- ─── Disciplina + atividade futura ────────────────────────────────
MERGE EDU_DISCIPLINA AS t USING (VALUES (1, 'Matemática', 'Matemática')) AS s(COD, NOME, MEC)
    ON t.DIS_COD = s.COD
    WHEN NOT MATCHED THEN INSERT (DIS_COD, DIS_NOME, DIS_NOME_MEC) VALUES (s.COD, s.NOME, s.MEC);

IF NOT EXISTS (SELECT 1 FROM EDU_INSTRUMENTO_AVALIATIVO WHERE TMA_COD = 1 AND IAV_DESCRICAO = 'Prova bimestral')
    INSERT INTO EDU_INSTRUMENTO_AVALIATIVO (DIS_COD, TMA_COD, IAV_DATA, IAV_DESCRICAO)
    VALUES (1, 1, DATEADD(day, 7, GETDATE()), 'Prova bimestral');
GO

-- ─── Conteúdos diários (5 últimos dias) ───────────────────────────
DECLARE @i INT = 0;
WHILE @i < 5
BEGIN
    DECLARE @dataConteudo DATETIME2 = DATEADD(day, -@i, CAST(GETDATE() AS DATE));
    IF NOT EXISTS (SELECT 1 FROM EDU_DIARIO_CONTEUDO WHERE TMA_COD = 1 AND DIC_DATA = @dataConteudo)
    BEGIN
        INSERT INTO EDU_DIARIO_CONTEUDO (TMA_COD, UNS_COD, DIC_DATA, DIC_TEMA, DIC_CONTEUDO, DIC_DESENVOLVIMENTO, DIS_COD)
        VALUES (1, 1, @dataConteudo,
            CONCAT('Tema ', 5 - @i, ': operações com frações'),
            'Soma e subtração de frações com denominadores diferentes.',
            'Exercícios práticos no caderno.',
            1);
    END;
    SET @i = @i + 1;
END;
GO

-- Frequência: marca presente em todos os conteúdos
INSERT INTO EDU_DIARIO_FREQUENCIA (DIC_COD, TMH_COD, DIF_PRESENTE)
SELECT dc.DIC_COD, ta.TMH_COD, 'S'
FROM EDU_DIARIO_CONTEUDO dc
CROSS JOIN EDU_TURMA_ALUNO ta
WHERE ta.TMH_ANO_LETIVO = YEAR(GETDATE())
  AND NOT EXISTS (
    SELECT 1 FROM EDU_DIARIO_FREQUENCIA df
    WHERE df.DIC_COD = dc.DIC_COD AND df.TMH_COD = ta.TMH_COD
  );
GO

-- ─── Tipos de ocorrência ──────────────────────────────────────────
MERGE EDU_TIPO_OCORRENCIA_ALUNO AS t USING (VALUES
    (1, 'Comportamental'),
    (2, 'Pedagógica'),
    (3, 'Material')
) AS s(COD, DESCR)
    ON t.TIPO_OCORRENCIA_COD = s.COD
    WHEN NOT MATCHED THEN INSERT (TIPO_OCORRENCIA_COD, TPO_DESCRICAO) VALUES (s.COD, s.DESCR);
GO

-- ─── 2 ocorrências (1 ciente, 1 pendente) ─────────────────────────
DECLARE @tmhPedro INT = (SELECT TOP 1 TMH_COD FROM EDU_TURMA_ALUNO WHERE PES_COD_ALUNO = 200 AND TMH_ANO_LETIVO = YEAR(GETDATE()));

IF @tmhPedro IS NOT NULL AND NOT EXISTS (SELECT 1 FROM EDU_ALUNO_OCORRENCIA WHERE TMH_COD = @tmhPedro AND AOC_TITULO = 'Conversa em sala')
BEGIN
    INSERT INTO EDU_ALUNO_OCORRENCIA (TMH_COD, PES_COD_PROFESSOR, ESC_COD, TMA_COD, TIPO_OCORRENCIA_COD, AOC_TITULO, AOC_DESCRICAO, AOC_DT_OCORRENCIA, AOC_RESP_CIENTE, AOC_DT_CIENCIA_RESP, AOC_ANO_LETIVO, AOC_EXIGIR_CONHECIMENTO)
    VALUES (@tmhPedro, 100, 1, 1, 1, 'Conversa em sala', 'Aluno conversou durante a aula de matemática.', DATEADD(day, -10, GETDATE()), 1, DATEADD(day, -8, GETDATE()), YEAR(GETDATE()), 1);

    INSERT INTO EDU_ALUNO_OCORRENCIA (TMH_COD, PES_COD_PROFESSOR, ESC_COD, TMA_COD, TIPO_OCORRENCIA_COD, AOC_TITULO, AOC_DESCRICAO, AOC_DT_OCORRENCIA, AOC_RESP_CIENTE, AOC_ANO_LETIVO, AOC_EXIGIR_CONHECIMENTO)
    VALUES (@tmhPedro, 100, 1, 1, 2, 'Tarefa não entregue', 'Aluno não entregou tarefa de matemática no prazo.', DATEADD(day, -2, GETDATE()), 0, YEAR(GETDATE()), 1);
END;
GO

-- ─── Avisos do mural ──────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM EDU_AVISOS WHERE TITULO = 'Bem-vindos ao Recreio!')
BEGIN
    INSERT INTO EDU_AVISOS (TITULO, AVISO, DATA_INICIO, DATA_FIM, TODA_REDE, EDU_CONECTA)
    VALUES
        ('Bem-vindos ao Recreio!',
         '<p>Olá responsável! Estamos felizes em tê-los conosco. Acompanhe aqui novidades da escola.</p>',
         DATEADD(day, -2, GETDATE()), DATEADD(day, 30, GETDATE()), 'S', 'S'),
        ('Reunião de pais',
         '<p>Reunião do 1º bimestre dia 25 às 19h no auditório.</p>',
         DATEADD(day, -1, GETDATE()), DATEADD(day, 15, GETDATE()), 'S', 'S'),
        ('Festa Junina dia 22',
         '<p>Confirme presença na tela de Autorizações. Custo: R$ 25 por família.</p>',
         DATEADD(hour, -6, GETDATE()), DATEADD(day, 10, GETDATE()), 'S', 'S');
END;
GO

-- ─── Autorizações (1 aprovação + 1 presença) ──────────────────────
IF NOT EXISTS (SELECT 1 FROM EDC_AUTORIZACOES WHERE AUT_TITULO = 'Autorização passeio museu')
BEGIN
    INSERT INTO EDC_AUTORIZACOES (AUT_TITULO, AUT_DESCRICAO, AUT_TIPO_SOLICITACAO, AUT_DT)
    VALUES ('Autorização passeio museu', 'Visita ao Museu de Ciências dia 25. Custo R$ 30 inclui transporte e lanche.', 'A', DATEADD(day, -5, GETDATE()));

    INSERT INTO EDC_AUTORIZACOES (AUT_TITULO, AUT_DESCRICAO, AUT_TIPO_SOLICITACAO, AUT_DT)
    VALUES ('Festa Junina', 'Festa Junina dia 22 às 18h no pátio da escola. Confirmar presença.', 'P', DATEADD(day, -2, GETDATE()));
END;
GO

-- ─── Tipos de solicitação ─────────────────────────────────────────
MERGE EDC_TIPO_SOLICITACAO AS t USING (VALUES
    (1, 'Cadastro de portador'),
    (2, 'Atualização cadastral')
) AS s(COD, DESCR)
    ON t.TIP_COD = s.COD
    WHEN NOT MATCHED THEN INSERT (TIP_COD, TIP_DESCRICAO) VALUES (s.COD, s.DESCR);
GO

-- ─── Template de email pra recuperação de senha (EMA_COD = 6) ─────
IF NOT EXISTS (SELECT 1 FROM GER_PADRAO_EMAIL WHERE EMA_COD = 6)
    INSERT INTO GER_PADRAO_EMAIL (EMA_COD, EMA_ASSUNTO, EMA_CONTEUDO)
    VALUES (
        6,
        N'Recuperação de senha — Recreio',
        N'<html><body style="font-family:Arial,sans-serif;color:#1F2937;background:#FAF8F4;padding:32px;">'
      + N'<h1 style="color:#FF6B35;">Olá!</h1>'
      + N'<p>Recebemos uma solicitação de recuperação de senha. Use o código abaixo:</p>'
      + N'<div style="background:#FF6B35;color:#fff;padding:24px;border-radius:16px;font-size:32px;text-align:center;letter-spacing:8px;font-weight:bold;">$CODIGO</div>'
      + N'<p style="color:#475569;font-size:13px;margin-top:24px;">O código expira em 10 minutos. Se você não solicitou, ignore este e-mail.</p>'
      + N'</body></html>'
    );
GO

-- ─── Responsável no app (EDC_RESPONSAVEL) ─────────────────────────
-- Senha: 123456 (hash argon2id pré-computado)
IF NOT EXISTS (SELECT 1 FROM EDC_RESPONSAVEL WHERE cpf = '12345678901')
BEGIN
    INSERT INTO EDC_RESPONSAVEL (cpf, email, senhaHash, ativo)
    VALUES (
        '12345678901',
        'maria.silva@teste.dev',
        '$argon2id$v=19$m=19456,t=2,p=1$oMRzTrbhi+pyM8evKLlykw$XnO79rs4Bg3Io2Neq6QGdodIO8cSceMBbmCoetbhBiI',
        1
    );
END;
GO

PRINT '✓ Seed data aplicado.';
PRINT '';
PRINT '=== Login DEV ===';
PRINT '  CPF:   12345678901';
PRINT '  Senha: 123456';
PRINT '';
