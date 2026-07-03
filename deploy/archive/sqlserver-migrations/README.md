# Khôi phục SQL Server migrations (local dev với LocalDB)

Nếu bạn phát triển local với **SQL Server LocalDB** (không dùng Neon):

```powershell
# Sao chép migrations SQL Server về thư mục Migrations
Copy-Item deploy\archive\sqlserver-migrations\* backend\src\JapaneseAI.Infrastructure\Migrations\ -Force

# Xóa migrations PostgreSQL (nếu có)
Remove-Item backend\src\JapaneseAI.Infrastructure\Migrations\20260703022936_* -Force
Remove-Item backend\src\JapaneseAI.Infrastructure\Migrations\AppDbContextModelSnapshot.cs -Force
# Copy lại snapshot từ archive sqlserver
Copy-Item deploy\archive\sqlserver-migrations\AppDbContextModelSnapshot.cs backend\src\JapaneseAI.Infrastructure\Migrations\
```

appsettings.json: `"Database": { "Provider": "SqlServer" }`

## Cloud deploy dùng PostgreSQL migrations

Migrations hiện tại trong `Migrations/` là **PostgreSQL** (Neon/Render).
SQL Server migrations được lưu tại `deploy/archive/sqlserver-migrations/`.
