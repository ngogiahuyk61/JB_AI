-- ============================================================
-- JapaneseAI – Database Schema
-- SQL Server / SQL Server LocalDB
-- Version: 1.0
-- ============================================================

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'JapaneseAI')
BEGIN
    CREATE DATABASE JapaneseAI;
END
GO

USE JapaneseAI;
GO

-- ── Vocabulary ───────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Vocabulary')
BEGIN
    CREATE TABLE Vocabulary (
        Id              INT IDENTITY(1,1) PRIMARY KEY,
        Kanji           NVARCHAR(200)  NOT NULL,
        Kana            NVARCHAR(200)  NOT NULL,
        HanViet         NVARCHAR(500)  NULL,
        Vietnamese      NVARCHAR(1000) NOT NULL,
        JlptLevel       NVARCHAR(10)   NOT NULL, -- N5, N4, N3, N2, N1, Mixed
        PartOfSpeech    NVARCHAR(50)   NULL,      -- N, V, A, Adv, Conj, Pron...
        Tags            NVARCHAR(200)  NULL,      -- 'Từ láy', 'Lượng từ', 'N2 BS'
        SortOrder       INT            NULL,
        CreatedAt       DATETIME2      DEFAULT GETDATE(),

        INDEX IX_Vocabulary_Level (JlptLevel),
        INDEX IX_Vocabulary_Kanji (Kanji),
    );
    PRINT 'Created table: Vocabulary';
END
GO

-- ── Users ────────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users (
        Id              INT IDENTITY(1,1) PRIMARY KEY,
        Email           NVARCHAR(255)  NOT NULL UNIQUE,
        PasswordHash    NVARCHAR(500)  NOT NULL,
        DisplayName     NVARCHAR(200)  NOT NULL,
        JlptGoal        NVARCHAR(5)    DEFAULT 'N5',
        Streak          INT            DEFAULT 0,
        TotalStudied    INT            DEFAULT 0,
        CreatedAt       DATETIME2      DEFAULT GETDATE(),
    );
    PRINT 'Created table: Users';
END
GO

-- ── Decks (Flashcard sets) ───────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Decks')
BEGIN
    CREATE TABLE Decks (
        Id              INT IDENTITY(1,1) PRIMARY KEY,
        UserId          INT            NOT NULL REFERENCES Users(Id) ON DELETE CASCADE,
        Name            NVARCHAR(200)  NOT NULL,
        Source          NVARCHAR(50)   NOT NULL, -- 'excel', 'jlpt'
        JlptLevel       NVARCHAR(10)   NULL,
        CreatedAt       DATETIME2      DEFAULT GETDATE(),
    );
    PRINT 'Created table: Decks';
END
GO

-- ── Flashcards ───────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Flashcards')
BEGIN
    CREATE TABLE Flashcards (
        Id              INT IDENTITY(1,1) PRIMARY KEY,
        DeckId          INT            NOT NULL REFERENCES Decks(Id) ON DELETE CASCADE,
        VocabularyId    INT            NULL REFERENCES Vocabulary(Id),
        Kanji           NVARCHAR(200)  NOT NULL,
        Kana            NVARCHAR(200)  NOT NULL,
        HanViet         NVARCHAR(500)  NULL,
        Vietnamese      NVARCHAR(1000) NOT NULL,
        Status          NVARCHAR(20)   DEFAULT 'new', -- new, learning, known
        StudyCount      INT            DEFAULT 0,
        LastStudiedAt   DATETIME2      NULL,
    );
    PRINT 'Created table: Flashcards';
END
GO

-- ── Conversations (AI Chat) ──────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Conversations')
BEGIN
    CREATE TABLE Conversations (
        Id              INT IDENTITY(1,1) PRIMARY KEY,
        UserId          INT            NOT NULL REFERENCES Users(Id) ON DELETE CASCADE,
        Title           NVARCHAR(200)  NULL,
        CreatedAt       DATETIME2      DEFAULT GETDATE(),
    );
    PRINT 'Created table: Conversations';
END
GO

-- ── Messages ─────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Messages')
BEGIN
    CREATE TABLE Messages (
        Id              INT IDENTITY(1,1) PRIMARY KEY,
        ConversationId  INT            NOT NULL REFERENCES Conversations(Id) ON DELETE CASCADE,
        Role            NVARCHAR(10)   NOT NULL, -- user, ai
        Content         NVARCHAR(MAX)  NOT NULL,
        CreatedAt       DATETIME2      DEFAULT GETDATE(),
    );
    PRINT 'Created table: Messages';
END
GO

PRINT 'Schema created successfully!';
GO
