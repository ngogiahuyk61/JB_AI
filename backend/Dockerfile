# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copy solution and csproj files for restore
COPY JapaneseAI.sln ./
COPY src/JapaneseAI.Core/JapaneseAI.Core.csproj src/JapaneseAI.Core/
COPY src/JapaneseAI.Infrastructure/JapaneseAI.Infrastructure.csproj src/JapaneseAI.Infrastructure/
COPY src/JapaneseAI.Api/JapaneseAI.Api.csproj src/JapaneseAI.Api/

# Restore dependencies
RUN dotnet restore

# Copy everything else and build
COPY src/ src/
RUN dotnet publish src/JapaneseAI.Api/JapaneseAI.Api.csproj -c Release -o out

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/out .

# Expose port (ASP.NET 8 defaults to port 8080)
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "JapaneseAI.Api.dll"]
