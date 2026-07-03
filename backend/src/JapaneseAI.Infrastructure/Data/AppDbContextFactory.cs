using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace JapaneseAI.Infrastructure.Data;

/// <summary>Design-time factory for EF migrations (PostgreSQL / Neon).</summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var cs = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? "Host=localhost;Database=JapaneseAI;Username=postgres;Password=postgres";

        var provider = DatabaseProviderHelper.Resolve(
            Environment.GetEnvironmentVariable("DATABASE_PROVIDER"),
            cs);

        var options = new DbContextOptionsBuilder<AppDbContext>();
        if (DatabaseProviderHelper.IsPostgreSQL(provider))
            options.UseNpgsql(cs, b => b.MigrationsAssembly("JapaneseAI.Infrastructure"));
        else
            options.UseSqlServer(cs, b => b.MigrationsAssembly("JapaneseAI.Infrastructure"));

        return new AppDbContext(options.Options);
    }
}
