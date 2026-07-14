using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace JapaneseAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddVerbTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Verbs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Meaning = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    DictionaryForm = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    MasuForm = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    TeForm = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    TaForm = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    NaiForm = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    VerbGroup = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    JlptLevel = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Verbs", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Verbs");
        }
    }
}
