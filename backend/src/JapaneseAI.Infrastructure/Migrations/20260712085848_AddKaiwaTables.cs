using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace JapaneseAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddKaiwaTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "KaiwaLessons",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Title = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TitleVi = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    JlptLevel = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false, defaultValue: "N5"),
                    OrderIndex = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KaiwaLessons", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "KaiwaQuestions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LessonId = table.Column<int>(type: "integer", nullable: false),
                    JapaneseText = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    OrderIndex = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KaiwaQuestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KaiwaQuestions_KaiwaLessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "KaiwaLessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "KaiwaAnswerHistories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    QuestionId = table.Column<int>(type: "integer", nullable: false),
                    UserAnswer = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    GrammarScore = table.Column<int>(type: "integer", nullable: false),
                    VocabularyScore = table.Column<int>(type: "integer", nullable: false),
                    NaturalnessScore = table.Column<int>(type: "integer", nullable: false),
                    OverallScore = table.Column<int>(type: "integer", nullable: false),
                    Feedback = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    GrammarExplanation = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    CorrectSentence = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    RetryCount = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KaiwaAnswerHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KaiwaAnswerHistories_KaiwaQuestions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "KaiwaQuestions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "KaiwaExpectedAnswers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    QuestionId = table.Column<int>(type: "integer", nullable: false),
                    AnswerText = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    IsPreferred = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KaiwaExpectedAnswers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KaiwaExpectedAnswers_KaiwaQuestions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "KaiwaQuestions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_KaiwaAnswerHistories_CreatedAt",
                table: "KaiwaAnswerHistories",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_KaiwaAnswerHistories_QuestionId",
                table: "KaiwaAnswerHistories",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_KaiwaExpectedAnswers_QuestionId",
                table: "KaiwaExpectedAnswers",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_KaiwaLessons_OrderIndex",
                table: "KaiwaLessons",
                column: "OrderIndex");

            migrationBuilder.CreateIndex(
                name: "IX_KaiwaQuestions_LessonId_OrderIndex",
                table: "KaiwaQuestions",
                columns: new[] { "LessonId", "OrderIndex" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "KaiwaAnswerHistories");

            migrationBuilder.DropTable(
                name: "KaiwaExpectedAnswers");

            migrationBuilder.DropTable(
                name: "KaiwaQuestions");

            migrationBuilder.DropTable(
                name: "KaiwaLessons");
        }
    }
}
