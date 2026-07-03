namespace JapaneseAI.Infrastructure.Data;

public static class DatabaseProviderHelper
{
    public const string PostgreSQL = "PostgreSQL";
    public const string SqlServer = "SqlServer";

    public static string Resolve(string? configured, string connectionString)
    {
        if (!string.IsNullOrWhiteSpace(configured))
            return configured;

        var cs = connectionString.ToLowerInvariant();
        if (cs.Contains("host=") || cs.Contains("postgres") || cs.Contains("neon.tech"))
            return PostgreSQL;

        return SqlServer;
    }

    public static bool IsPostgreSQL(string provider) =>
        provider.Equals(PostgreSQL, StringComparison.OrdinalIgnoreCase);
}
