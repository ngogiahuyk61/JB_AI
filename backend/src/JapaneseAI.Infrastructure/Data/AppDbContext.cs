using Microsoft.EntityFrameworkCore;
using JapaneseAI.Core.Entities;

namespace JapaneseAI.Infrastructure.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Vocabulary> Vocabulary { get; set; } = null!;
        public DbSet<KanjiDictionary> KanjiDictionaries { get; set; } = null!;
        public DbSet<User> Users { get; set; } = null!;
        public DbSet<Deck> Decks { get; set; } = null!;
        public DbSet<Flashcard> Flashcards { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Vocabulary entity configuration
            modelBuilder.Entity<Vocabulary>(entity =>
            {
                entity.ToTable("Vocabulary");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Kanji).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Kana).IsRequired().HasMaxLength(200);
                entity.Property(e => e.HanViet).HasMaxLength(500);
                entity.Property(e => e.Vietnamese).IsRequired().HasMaxLength(1000);
                entity.Property(e => e.JlptLevel).IsRequired().HasMaxLength(10);
                entity.Property(e => e.PartOfSpeech).HasMaxLength(50);
                entity.Property(e => e.Tags).HasMaxLength(200);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => e.JlptLevel);
                entity.HasIndex(e => e.Kanji);

                entity.Property(e => e.ExampleSentence).HasMaxLength(1000);
                entity.Property(e => e.ExampleTranslation).HasMaxLength(1000);
                entity.Property(e => e.ExampleRomaji).HasMaxLength(500);
            });

            // KanjiDictionary configuration
            modelBuilder.Entity<KanjiDictionary>(entity =>
            {
                entity.ToTable("KanjiDictionaries");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Character).IsRequired().HasMaxLength(10);
                entity.Property(e => e.Onyomi).HasMaxLength(200);
                entity.Property(e => e.Kunyomi).HasMaxLength(500);
                entity.Property(e => e.Meaning).HasMaxLength(1000);
                entity.Property(e => e.HanViet).HasMaxLength(100);
                entity.Property(e => e.Radical).HasMaxLength(20);
                entity.Property(e => e.JlptLevel).HasMaxLength(5);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => e.Character).IsUnique();
                entity.HasIndex(e => e.JlptLevel);
            });

            // User entity configuration
            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("Users");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
                entity.HasIndex(e => e.Email).IsUnique();
                entity.Property(e => e.PasswordHash).IsRequired().HasMaxLength(500);
                entity.Property(e => e.DisplayName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.JlptGoal).HasMaxLength(5);
            });

            // Deck configuration
            modelBuilder.Entity<Deck>(entity =>
            {
                entity.ToTable("Decks");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Source).IsRequired().HasMaxLength(50);
                entity.Property(e => e.JlptLevel).HasMaxLength(10);

                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Flashcard configuration
            modelBuilder.Entity<Flashcard>(entity =>
            {
                entity.ToTable("Flashcards");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Kanji).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Kana).IsRequired().HasMaxLength(200);
                entity.Property(e => e.HanViet).HasMaxLength(500);
                entity.Property(e => e.Vietnamese).IsRequired().HasMaxLength(1000);
                entity.Property(e => e.Status).HasMaxLength(20);

                entity.HasOne(e => e.Deck)
                      .WithMany(d => d.Flashcards)
                      .HasForeignKey(e => e.DeckId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Vocabulary)
                      .WithMany()
                      .HasForeignKey(e => e.VocabularyId)
                      .OnDelete(DeleteBehavior.SetNull);
            });
        }
    }
}
