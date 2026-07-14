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

    public static string FormatConnectionString(string connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
            return connectionString;

        // If it's already a standard ADO.NET connection string, return it
        if (connectionString.Contains("Host=") || connectionString.Contains("Server="))
            return connectionString;

        // Handle URL format: postgresql://username:password@host/database?sslmode
        if (connectionString.StartsWith("postgres://") || connectionString.StartsWith("postgresql://"))
        {
            var uriString = connectionString;
            // Fix missing require in sslmode for Neon
            if (uriString.EndsWith("?sslmode"))
            {
                uriString += "=require";
            }
            
            var uri = new Uri(uriString);
            var userInfo = uri.UserInfo.Split(':');
            var builder = new System.Text.StringBuilder();
            builder.Append($"Host={uri.Host};");
            if (uri.Port > 0) builder.Append($"Port={uri.Port};");
            builder.Append($"Database={uri.LocalPath.TrimStart('/')};");
            
            if (userInfo.Length > 0 && !string.IsNullOrEmpty(userInfo[0]))
                builder.Append($"Username={userInfo[0]};");
            if (userInfo.Length > 1 && !string.IsNullOrEmpty(userInfo[1]))
                builder.Append($"Password={userInfo[1]};");

            if (uriString.Contains("sslmode=require", StringComparison.OrdinalIgnoreCase) || 
                uriString.Contains("neon.tech", StringComparison.OrdinalIgnoreCase))
            {
                builder.Append("Ssl Mode=Require;Trust Server Certificate=true;");
            }

            return builder.ToString();
        }

        return connectionString;
    }
}
