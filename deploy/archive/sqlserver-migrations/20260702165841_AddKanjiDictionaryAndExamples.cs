using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JapaneseAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddKanjiDictionaryAndExamples : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Vocabulary",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "GETDATE()",
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AddColumn<string>(
                name: "ExampleRomaji",
                table: "Vocabulary",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExampleSentence",
                table: "Vocabulary",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExampleTranslation",
                table: "Vocabulary",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "KanjiDictionaries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Character = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Onyomi = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Kunyomi = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Meaning = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    HanViet = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    StrokeCount = table.Column<int>(type: "int", nullable: true),
                    Radical = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    JlptLevel = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KanjiDictionaries", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "KanjiDictionaries");

            migrationBuilder.DropColumn(
                name: "ExampleRomaji",
                table: "Vocabulary");

            migrationBuilder.DropColumn(
                name: "ExampleSentence",
                table: "Vocabulary");

            migrationBuilder.DropColumn(
                name: "ExampleTranslation",
                table: "Vocabulary");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Vocabulary",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldDefaultValueSql: "GETDATE()");
        }
    }
}
