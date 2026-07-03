using System.IO;

namespace JapaneseAI.Infrastructure.Data.Importers
{
    public static class DataPathResolver
    {
        public static string? FindDataDirectory()
        {
            var baseDir = AppDomain.CurrentDomain.BaseDirectory;
            var current = new DirectoryInfo(baseDir);

            while (current != null)
            {
                var candidate = Path.Combine(current.FullName, "data");
                if (Directory.Exists(candidate))
                    return candidate;

                current = current.Parent;
            }

            return null;
        }

        public static string? ResolveFile(params string[] segments)
        {
            var dataDir = FindDataDirectory();
            if (dataDir == null) return null;

            var path = Path.Combine(dataDir, Path.Combine(segments));
            return File.Exists(path) ? path : null;
        }
    }
}
