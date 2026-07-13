using Microsoft.EntityFrameworkCore;
using JapaneseAI.Infrastructure.Data;
using JapaneseAI.Infrastructure.Services;
using JapaneseAI.Infrastructure.Services.Kaiwa;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddHttpClient("GoogleTTS", client =>
{
    client.DefaultRequestHeaders.Add("User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    client.DefaultRequestHeaders.Add("Referer", "https://translate.google.com/");
    client.DefaultRequestHeaders.Add("Accept", "audio/webm,audio/ogg,audio/wav,audio/*;q=0.9,*/*;q=0.5");
    client.DefaultRequestHeaders.Add("Accept-Language", "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7");
    client.Timeout = TimeSpan.FromSeconds(10);
});

builder.Services.AddHttpClient("Ollama", client =>
{
    client.Timeout = TimeSpan.FromMinutes(3);
});

builder.Services.AddHttpClient("ollama", client =>
{
    client.BaseAddress = new Uri("http://localhost:11434");
    client.Timeout = TimeSpan.FromMinutes(3);
});

var ollamaBaseUrl = builder.Configuration["Ollama:BaseUrl"]
    ?? Environment.GetEnvironmentVariable("OLLAMA_BASE_URL")
    ?? "http://localhost:11434";

var ollamaModel = builder.Configuration["Ollama:Model"]
    ?? Environment.GetEnvironmentVariable("OLLAMA_MODEL")
    ?? "qwen3:4b";

builder.Services.AddSingleton(sp => 
{
    var httpClientFactory = sp.GetRequiredService<IHttpClientFactory>();
    var client = httpClientFactory.CreateClient("Ollama");
    var logger = sp.GetRequiredService<ILogger<OllamaService>>();
    return new OllamaService(client, logger, ollamaBaseUrl, ollamaModel);
});

// Kaiwa services
builder.Services.AddScoped<KaiwaService>();
builder.Services.AddHttpClient<TranscriptionService>();
builder.Services.AddHttpClient<TranslationService>();
builder.Services.AddHttpClient<EvaluationService>();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

var dbProvider = DatabaseProviderHelper.Resolve(
    builder.Configuration["Database:Provider"],
    connectionString);

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (DatabaseProviderHelper.IsPostgreSQL(dbProvider))
    {
        options.UseNpgsql(connectionString, b =>
        {
            b.MigrationsAssembly("JapaneseAI.Infrastructure");
            b.EnableRetryOnFailure(3);
        });
    }
    else
    {
        options.UseSqlServer(connectionString, b => b.MigrationsAssembly("JapaneseAI.Infrastructure"));
    }
});

// CORS — localhost + Cloudflare Pages production + env overrides
var corsOrigins = new List<string>
{
    "http://localhost:5173", "https://localhost:5173",
    "http://localhost:5174", "https://localhost:5174",
    // Cloudflare Pages production domains (hardcoded để đảm bảo hoạt động kể cả không set env var)
    "https://jb-ai.pages.dev",
    "https://www.jb-ai.pages.dev",
};

var frontendUrl = builder.Configuration["FRONTEND_URL"]
    ?? Environment.GetEnvironmentVariable("FRONTEND_URL");
if (!string.IsNullOrWhiteSpace(frontendUrl))
    corsOrigins.Add(frontendUrl.TrimEnd('/'));

var extraOrigins = builder.Configuration["CORS_ORIGINS"]
    ?? Environment.GetEnvironmentVariable("CORS_ORIGINS");
if (!string.IsNullOrWhiteSpace(extraOrigins))
    corsOrigins.AddRange(extraOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(corsOrigins.ToArray())
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()
              .WithExposedHeaders("X-Total-Count");
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Render / reverse proxy terminates TLS — skip redirect in Production
if (!app.Environment.IsProduction())
    app.UseHttpsRedirection();

app.UseCors("AllowFrontend");
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow, provider = dbProvider }));

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    await DbInitializer.InitializeAsync(context, logger, dbProvider);
}

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
    app.Urls.Add($"http://0.0.0.0:{port}");

app.Run();
