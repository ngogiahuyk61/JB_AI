using Microsoft.EntityFrameworkCore;
using JapaneseAI.Core.Entities;
using JapaneseAI.Core.Entities.Kaiwa;

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

        // Kaiwa entities
        public DbSet<KaiwaLesson> KaiwaLessons { get; set; } = null!;
        public DbSet<KaiwaQuestion> KaiwaQuestions { get; set; } = null!;
        public DbSet<KaiwaExpectedAnswer> KaiwaExpectedAnswers { get; set; } = null!;
        public DbSet<KaiwaAnswerHistory> KaiwaAnswerHistories { get; set; } = null!;

        // Verbs Table
        public DbSet<Verb> Verbs { get; set; } = null!;

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
                entity.Property(e => e.PartOfSpeech).HasMaxLength(200);
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
            // KaiwaLesson configuration
            modelBuilder.Entity<KaiwaLesson>(entity =>
            {
                entity.ToTable("KaiwaLessons");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(100);
                entity.Property(e => e.TitleVi).HasMaxLength(200);
                entity.Property(e => e.JlptLevel).HasMaxLength(5).HasDefaultValue("N5");
                entity.HasIndex(e => e.OrderIndex);
            });

            // KaiwaQuestion configuration
            modelBuilder.Entity<KaiwaQuestion>(entity =>
            {
                entity.ToTable("KaiwaQuestions");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.JapaneseText).IsRequired().HasMaxLength(500);
                entity.HasIndex(e => new { e.LessonId, e.OrderIndex });
                entity.HasOne(e => e.Lesson)
                      .WithMany(l => l.Questions)
                      .HasForeignKey(e => e.LessonId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // KaiwaExpectedAnswer configuration
            modelBuilder.Entity<KaiwaExpectedAnswer>(entity =>
            {
                entity.ToTable("KaiwaExpectedAnswers");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.AnswerText).IsRequired().HasMaxLength(1000);
                entity.HasOne(e => e.Question)
                      .WithMany(q => q.ExpectedAnswers)
                      .HasForeignKey(e => e.QuestionId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // KaiwaAnswerHistory configuration
            modelBuilder.Entity<KaiwaAnswerHistory>(entity =>
            {
                entity.ToTable("KaiwaAnswerHistories");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.UserAnswer).HasMaxLength(500);
                entity.Property(e => e.Feedback).HasMaxLength(1000);
                entity.Property(e => e.GrammarExplanation).HasMaxLength(1000);
                entity.Property(e => e.CorrectSentence).HasMaxLength(500);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.HasIndex(e => e.CreatedAt);
                entity.HasOne(e => e.Question)
                      .WithMany(q => q.History)
                      .HasForeignKey(e => e.QuestionId)
                      .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}
