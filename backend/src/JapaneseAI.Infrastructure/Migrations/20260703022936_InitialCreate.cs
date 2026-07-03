using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace JapaneseAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "KanjiDictionaries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Character = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Onyomi = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Kunyomi = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Meaning = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    HanViet = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    StrokeCount = table.Column<int>(type: "integer", nullable: true),
                    Radical = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    JlptLevel = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KanjiDictionaries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    PasswordHash = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    JlptGoal = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    Streak = table.Column<int>(type: "integer", nullable: false),
                    TotalStudied = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Vocabulary",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Kanji = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Kana = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    HanViet = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Vietnamese = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    JlptLevel = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    PartOfSpeech = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Tags = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: true),
                    ExampleSentence = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ExampleTranslation = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ExampleRomaji = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Vocabulary", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Decks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    JlptLevel = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Decks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Decks_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Flashcards",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DeckId = table.Column<int>(type: "integer", nullable: false),
                    VocabularyId = table.Column<int>(type: "integer", nullable: true),
                    Kanji = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Kana = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    HanViet = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Vietnamese = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    StudyCount = table.Column<int>(type: "integer", nullable: false),
                    LastStudiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Flashcards", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Flashcards_Decks_DeckId",
                        column: x => x.DeckId,
                        principalTable: "Decks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Flashcards_Vocabulary_VocabularyId",
                        column: x => x.VocabularyId,
                        principalTable: "Vocabulary",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Decks_UserId",
                table: "Decks",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Flashcards_DeckId",
                table: "Flashcards",
                column: "DeckId");

            migrationBuilder.CreateIndex(
                name: "IX_Flashcards_VocabularyId",
                table: "Flashcards",
                column: "VocabularyId");

            migrationBuilder.CreateIndex(
                name: "IX_KanjiDictionaries_Character",
                table: "KanjiDictionaries",
                column: "Character",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_KanjiDictionaries_JlptLevel",
                table: "KanjiDictionaries",
                column: "JlptLevel");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Vocabulary_JlptLevel",
                table: "Vocabulary",
                column: "JlptLevel");

            migrationBuilder.CreateIndex(
                name: "IX_Vocabulary_Kanji",
                table: "Vocabulary",
                column: "Kanji");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Flashcards");

            migrationBuilder.DropTable(
                name: "KanjiDictionaries");

            migrationBuilder.DropTable(
                name: "Decks");

            migrationBuilder.DropTable(
                name: "Vocabulary");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
