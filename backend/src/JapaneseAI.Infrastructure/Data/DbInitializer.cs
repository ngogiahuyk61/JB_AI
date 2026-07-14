using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using JapaneseAI.Core.Entities;
using JapaneseAI.Infrastructure.Data.Importers;

namespace JapaneseAI.Infrastructure.Data
{
    public static class DbInitializer
    {
        public static async Task InitializeAsync(AppDbContext context, ILogger logger, string? dbProvider = null)
        {
            try
            {
                var provider = dbProvider ?? DatabaseProviderHelper.SqlServer;
                var isPostgres = DatabaseProviderHelper.IsPostgreSQL(provider);

                await context.Database.MigrateAsync();

                // ── Import Kaiwa data từ JSON (chạy 1 lần) ──
                var kaiwaJsonPath = DataPathResolver.ResolveFile("kaiwa", "kaiwa_data.json")
                    ?? Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "..", "kaiwa_data.json");

                if (File.Exists(kaiwaJsonPath))
                {
                    var kaiwaImporter = new KaiwaImporter(context, Microsoft.Extensions.Logging.Abstractions.NullLogger<KaiwaImporter>.Instance);
                    await kaiwaImporter.ImportAsync(kaiwaJsonPath);
                }
                else
                {
                    logger.LogInformation("[KaiwaImporter] kaiwa_data.json not found, skipping. Expected path: {path}", kaiwaJsonPath);
                }

                // Import Verbs
                var verbJsonPath = DataPathResolver.ResolveFile("", "verbs.json");
                if (verbJsonPath != null && File.Exists(verbJsonPath))
                {
                    var verbImporter = new VerbImporter(context, Microsoft.Extensions.Logging.Abstractions.NullLogger<VerbImporter>.Instance);
                    await verbImporter.ImportFromJsonAsync(verbJsonPath);
                }
                else
                {
                    logger.LogInformation("[VerbImporter] verbs.json not found, skipping.");
                }

                // ── Import KANJIDIC2 nếu có file, hoặc seed mẫu ──
                var kanjidic2Path = DataPathResolver.ResolveFile("kanjidic2", "kanjidic2.xml")
                    ?? DataPathResolver.ResolveFile("kanjidic2", "sample_kanjidic2.xml");

                if (kanjidic2Path != null)
                {
                    await KanjiDic2Importer.ImportAsync(context, kanjidic2Path, logger);
                }


                // Luôn đảm bảo các Kanji mẫu thông dụng N5/N4 có mặt trong DB
                var requiredKanji = new List<KanjiDictionary>
                {
                    new KanjiDictionary { Character = "私", Onyomi = "シ", Kunyomi = "わたし・わたくし", Meaning = "Tôi, riêng tư", HanViet = "Tư", StrokeCount = 7, Radical = "禾", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "学", Onyomi = "ガク", Kunyomi = "まな.ぶ", Meaning = "Học, học tập", HanViet = "Học", StrokeCount = 8, Radical = "子", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "生", Onyomi = "セイ・ショウ", Kunyomi = "い.きる・う.まれる・なま", Meaning = "Sinh, sống", HanViet = "Sinh", StrokeCount = 5, Radical = "生", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "先", Onyomi = "セン", Kunyomi = "さき", Meaning = "Trước, tiên", HanViet = "Tiên", StrokeCount = 6, Radical = "儿", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "日", Onyomi = "ニチ・ジツ", Kunyomi = "ひ・か", Meaning = "Mặt trời, ngày", HanViet = "Nhật", StrokeCount = 4, Radical = "日", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "本", Onyomi = "ホン", Kunyomi = "もと", Meaning = "Gốc, sách", HanViet = "Bản", StrokeCount = 5, Radical = "木", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "語", Onyomi = "ゴ", Kunyomi = "かた.る", Meaning = "Ngôn ngữ", HanViet = "Ngữ", StrokeCount = 14, Radical = "言", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "大", Onyomi = "ダイ・タイ", Kunyomi = "おお.きい", Meaning = "Lớn, to", HanViet = "Đại", StrokeCount = 3, Radical = "大", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "人", Onyomi = "ジン・ニン", Kunyomi = "ひと", Meaning = "Người", HanViet = "Nhân", StrokeCount = 2, Radical = "人", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "国", Onyomi = "コク", Kunyomi = "くに", Meaning = "Quốc gia, nước", HanViet = "Quốc", StrokeCount = 8, Radical = "囗", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "会", Onyomi = "カイ・エ", Kunyomi = "あ.う", Meaning = "Gặp gỡ, hội", HanViet = "Hội", StrokeCount = 6, Radical = "人", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "社", Onyomi = "シャ", Kunyomi = "", Meaning = "Công ty, xã hội", HanViet = "Xã", StrokeCount = 7, Radical = "示", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "員", Onyomi = "イン", Kunyomi = "", Meaning = "Thành viên, nhân viên", HanViet = "Viên", StrokeCount = 10, Radical = "口", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "友", Onyomi = "ユウ", Kunyomi = "とも", Meaning = "Bạn bè", HanViet = "Hữu", StrokeCount = 4, Radical = "又", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "父", Onyomi = "フ", Kunyomi = "ちち", Meaning = "Cha", HanViet = "Phụ", StrokeCount = 4, Radical = "父", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "母", Onyomi = "ボ", Kunyomi = "はは", Meaning = "Mẹ", HanViet = "Mẫu", StrokeCount = 5, Radical = "母", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "子", Onyomi = "シ・ス", Kunyomi = "こ", Meaning = "Con, trẻ em", HanViet = "Tử", StrokeCount = 3, Radical = "子", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "時", Onyomi = "ジ", Kunyomi = "とき", Meaning = "Giờ, thời gian", HanViet = "Thời", StrokeCount = 10, Radical = "日", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "年", Onyomi = "ネン", Kunyomi = "とし", Meaning = "Năm", HanViet = "Niên", StrokeCount = 6, Radical = "干", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "電", Onyomi = "デン", Kunyomi = "", Meaning = "Điện", HanViet = "Điện", StrokeCount = 13, Radical = "雨", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "車", Onyomi = "シャ", Kunyomi = "くるま", Meaning = "Xe, ô tô", HanViet = "Xa", StrokeCount = 7, Radical = "車", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "行", Onyomi = "コウ・ギョウ・アン", Kunyomi = "い.く・ゆ.く・おこな.う", Meaning = "Đi, ngân hàng, hành động", HanViet = "Hành", StrokeCount = 6, Radical = "行", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "食", Onyomi = "ショク", Kunyomi = "た.べる・く.う", Meaning = "Ăn, thức ăn", HanViet = "Thực", StrokeCount = 9, Radical = "食", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "見", Onyomi = "ケン", Kunyomi = "み.る", Meaning = "Nhìn, thấy", HanViet = "Kiến", StrokeCount = 7, Radical = "見", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "来", Onyomi = "ライ", Kunyomi = "く.る・き.た.る", Meaning = "Đến, lai", HanViet = "Lai", StrokeCount = 7, Radical = "木", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "話", Onyomi = "ワ", Kunyomi = "はな.す・はなし", Meaning = "Nói chuyện, câu chuyện", HanViet = "Thoại", StrokeCount = 13, Radical = "言", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "書", Onyomi = "ショ", Kunyomi = "か.く", Meaning = "Viết, sách", HanViet = "Thư", StrokeCount = 10, Radical = "曰", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "読", Onyomi = "ドク・トク", Kunyomi = "よ.む", Meaning = "Đọc", HanViet = "Đọc", StrokeCount = 14, Radical = "言", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "聞", Onyomi = "ブン・モン", Kunyomi = "き.く", Meaning = "Nghe, hỏi", HanViet = "Văn", StrokeCount = 14, Radical = "耳", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "入", Onyomi = "ニュウ", Kunyomi = "い.る・はい.る", Meaning = "Vào, nhập", HanViet = "Nhập", StrokeCount = 2, Radical = "入", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "出", Onyomi = "シュツ", Kunyomi = "で.る・だ.す", Meaning = "Ra, xuất", HanViet = "Xuất", StrokeCount = 5, Radical = "凵", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "山", Onyomi = "サン", Kunyomi = "やま", Meaning = "Núi", HanViet = "Sơn", StrokeCount = 3, Radical = "山", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "川", Onyomi = "セン", Kunyomi = "かわ", Meaning = "Sông", HanViet = "Xuyên", StrokeCount = 3, Radical = "川", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "木", Onyomi = "モク・ボク", Kunyomi = "き", Meaning = "Cây, gỗ", HanViet = "Mộc", StrokeCount = 4, Radical = "木", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "水", Onyomi = "スイ", Kunyomi = "みず", Meaning = "Nước", HanViet = "Thủy", StrokeCount = 4, Radical = "水", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "火", Onyomi = "カ", Kunyomi = "ひ", Meaning = "Lửa", HanViet = "Hỏa", StrokeCount = 4, Radical = "火", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "金", Onyomi = "キン・コン", Kunyomi = "かね・かな", Meaning = "Vàng, tiền", HanViet = "Kim", StrokeCount = 8, Radical = "金", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "中", Onyomi = "チュウ", Kunyomi = "なか", Meaning = "Trong, giữa", HanViet = "Trung", StrokeCount = 4, Radical = "中", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "上", Onyomi = "ジョウ・ショウ", Kunyomi = "うえ・うわ・かみ", Meaning = "Trên, lên", HanViet = "Thượng", StrokeCount = 3, Radical = "一", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "下", Onyomi = "カ・ゲ", Kunyomi = "した・しも・さ.がる", Meaning = "Dưới, xuống", HanViet = "Hạ", StrokeCount = 3, Radical = "一", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "高", Onyomi = "コウ", Kunyomi = "たか.い", Meaning = "Cao, đắt", HanViet = "Cao", StrokeCount = 10, Radical = "高", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "新", Onyomi = "シン", Kunyomi = "あたら.しい・あら", Meaning = "Mới", HanViet = "Tân", StrokeCount = 13, Radical = "斤", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "何", Onyomi = "カ", Kunyomi = "なに・なん", Meaning = "Cái gì, bao nhiêu", HanViet = "Hà", StrokeCount = 7, Radical = "人", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "今", Onyomi = "コン・キン", Kunyomi = "いま", Meaning = "Bây giờ", HanViet = "Kim", StrokeCount = 4, Radical = "人", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "毎", Onyomi = "マイ", Kunyomi = "", Meaning = "Mỗi", HanViet = "Mai", StrokeCount = 6, Radical = "毋", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "週", Onyomi = "シュウ", Kunyomi = "", Meaning = "Tuần", HanViet = "Chu", StrokeCount = 11, Radical = "辵", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "月", Onyomi = "ゲツ・ガツ", Kunyomi = "つき", Meaning = "Tháng, mặt trăng", HanViet = "Nguyệt", StrokeCount = 4, Radical = "月", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "東", Onyomi = "トウ", Kunyomi = "ひがし", Meaning = "Đông", HanViet = "Đông", StrokeCount = 8, Radical = "木", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "西", Onyomi = "セイ・サイ", Kunyomi = "にし", Meaning = "Tây", HanViet = "Tây", StrokeCount = 6, Radical = "西", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "南", Onyomi = "ナン", Kunyomi = "みなみ", Meaning = "Nam", HanViet = "Nam", StrokeCount = 9, Radical = "十", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "北", Onyomi = "ホク", Kunyomi = "きた", Meaning = "Bắc", HanViet = "Bắc", StrokeCount = 5, Radical = "匕", JlptLevel = "N5" },
                    new KanjiDictionary { Character = "留", Onyomi = "リュウ・ル", Kunyomi = "と.まる", Meaning = "Lưu lại, ở lại", HanViet = "Lưu", StrokeCount = 10, Radical = "田", JlptLevel = "N4" },
                    new KanjiDictionary { Character = "研", Onyomi = "ケン", Kunyomi = "と.ぐ", Meaning = "Nghiên cứu, mài", HanViet = "Nghiên", StrokeCount = 9, Radical = "石", JlptLevel = "N4" },
                    new KanjiDictionary { Character = "究", Onyomi = "キュウ", Kunyomi = "きわ.める", Meaning = "Nghiên cứu sâu", HanViet = "Cứu", StrokeCount = 7, Radical = "穴", JlptLevel = "N4" },
                    new KanjiDictionary { Character = "者", Onyomi = "シャ", Kunyomi = "もの", Meaning = "Người, kẻ", HanViet = "Giả", StrokeCount = 8, Radical = "老", JlptLevel = "N4" },
                    new KanjiDictionary { Character = "技", Onyomi = "ギ", Kunyomi = "わざ", Meaning = "Kỹ năng, kỹ thuật", HanViet = "Kỹ", StrokeCount = 7, Radical = "手", JlptLevel = "N4" },
                    new KanjiDictionary { Character = "術", Onyomi = "ジュツ", Kunyomi = "", Meaning = "Thuật, nghệ thuật", HanViet = "Thuật", StrokeCount = 11, Radical = "行", JlptLevel = "N4" },
                    new KanjiDictionary { Character = "専", Onyomi = "セン", Kunyomi = "もっぱ.ら", Meaning = "Chuyên biệt", HanViet = "Chuyên", StrokeCount = 9, Radical = "寸", JlptLevel = "N4" },
                    new KanjiDictionary { Character = "門", Onyomi = "モン", Kunyomi = "かど", Meaning = "Cửa, môn", HanViet = "Môn", StrokeCount = 8, Radical = "門", JlptLevel = "N4" },
                    new KanjiDictionary { Character = "銀", Onyomi = "ギン", Kunyomi = "", Meaning = "Bạc, ngân hàng", HanViet = "Ngân", StrokeCount = 14, Radical = "金", JlptLevel = "N4" },
                    new KanjiDictionary { Character = "医", Onyomi = "イ", Kunyomi = "", Meaning = "Y tế, chữa bệnh", HanViet = "Y", StrokeCount = 7, Radical = "匸", JlptLevel = "N4" },
                };

                var existingChars = await context.KanjiDictionaries
                    .Select(k => k.Character)
                    .ToListAsync();

                var toAdd = requiredKanji
                    .Where(k => !existingChars.Contains(k.Character))
                    .ToList();

                if (toAdd.Count > 0)
                {
                    logger.LogInformation("Adding {Count} missing required Kanji to database...", toAdd.Count);
                    context.KanjiDictionaries.AddRange(toAdd);
                    await context.SaveChangesAsync();
                    logger.LogInformation("KanjiDictionary seeded successfully!");
                }

                // ── Cập nhật ExampleSentence cho từ vựng (chạy mỗi lần start nếu còn null) ──
                var vocabsToUpdate = new[]
                {
                    new { Kanji = "私", Sentence = "私は学生です。", Translation = "Tôi là học sinh.", Romaji = "Watashi wa gakusei desu." },
                    new { Kanji = "学生", Sentence = "彼は真面目な学生です。", Translation = "Anh ấy là một học sinh chăm chỉ.", Romaji = "Kare wa majime na gakusei desu." },
                    new { Kanji = "先生", Sentence = "田中先生は日本語の先生です。", Translation = "Thầy Tanaka là giáo viên tiếng Nhật.", Romaji = "Tanaka-sensei wa nihongo no sensei desu." },
                    new { Kanji = "電車", Sentence = "毎日電車で学校に行きます。", Translation = "Mỗi ngày tôi đến trường bằng tàu điện.", Romaji = "Mainichi densha de gakkou ni ikimasu." },
                    new { Kanji = "食べます", Sentence = "朝ごはんを食べます。", Translation = "Tôi ăn bữa sáng.", Romaji = "Asagohan wo tabemasu." },
                    new { Kanji = "日本語", Sentence = "日本語を勉強しています。", Translation = "Tôi đang học tiếng Nhật.", Romaji = "Nihongo wo benkyou shite imasu." },
                    new { Kanji = "大学", Sentence = "大学で勉強しています。", Translation = "Tôi đang học ở đại học.", Romaji = "Daigaku de benkyou shite imasu." },
                    new { Kanji = "会社", Sentence = "父は会社員です。", Translation = "Bố tôi là nhân viên công ty.", Romaji = "Chichi wa kaishain desu." },
                    new { Kanji = "友達", Sentence = "友達と映画を見ました。", Translation = "Tôi đã xem phim với bạn bè.", Romaji = "Tomodachi to eiga wo mimashita." },
                    new { Kanji = "今日", Sentence = "Hôm nay thời tiết đẹp.", Translation = "Hôm nay thời tiết đẹp.", Romaji = "Kyou wa tenki ga ii desu." },
                };

                foreach (var item in vocabsToUpdate)
                {
                    var vocab = await context.Vocabulary.FirstOrDefaultAsync(v => v.Kanji == item.Kanji);
                    if (vocab != null && string.IsNullOrEmpty(vocab.ExampleSentence))
                    {
                        vocab.ExampleSentence = item.Sentence;
                        vocab.ExampleTranslation = item.Translation;
                        vocab.ExampleRomaji = item.Romaji;
                        logger.LogInformation("Updated ExampleSentence for: {Kanji}", item.Kanji);
                    }
                }
                await context.SaveChangesAsync();

                // ── Import Tatoeba examples nếu có file TSV ──
                var tatoebaPath = DataPathResolver.ResolveFile("tatoeba", "examples.tsv");
                if (tatoebaPath != null)
                {
                    await TatoebaImporter.ImportAsync(context, tatoebaPath, logger);
                }

                // Check if already seeded (vocabulary)
                var currentVocabCount = await context.Vocabulary.CountAsync();

                // Resolve vocabulary JSON once so we can use it for seeding or merging
                var vocabJson = DataPathResolver.ResolveFile("vocabulary", "all_vocabulary.json");

                if (currentVocabCount > 0)
                {
                    if (currentVocabCount < 2000)
                    {
                        logger.LogInformation("Database has incomplete vocabulary count ({Count}). Cleaning and re-seeding full database...", currentVocabCount);
                        
                        // Xóa sạch dữ liệu cũ
                        context.Vocabulary.RemoveRange(context.Vocabulary);
                        await context.SaveChangesAsync();
                    }
                    else
                    {
                        logger.LogInformation("Database already seeded with full vocabulary ({Count} records). Attempting merge from vocabulary JSON if available.", currentVocabCount);

                        if (vocabJson != null)
                        {
                            try
                            {
                                await VocabularyJsonImporter.ImportAsync(context, vocabJson, logger);
                                logger.LogInformation("Vocabulary JSON merge complete.");
                            }
                            catch (Exception mergeEx)
                            {
                                logger.LogWarning(mergeEx, "Vocabulary JSON merge had errors – continuing to apply special tags.");
                                // Reset EF change tracker to avoid stale state
                                context.ChangeTracker.Clear();
                            }
                            // Apply special tags (n2_bs, tu_lay, luong_tu) always, even if merge had errors
                            await ApplySpecialTagsAsync(context, vocabJson, logger);
                        }
                        else
                        {
                            logger.LogInformation("No vocabulary JSON found to merge.");
                        }

                        return;
                    }
                }

                // If we reach here DB is empty (or was cleaned), import full JSON if available
                if (vocabJson != null)
                {
                    await VocabularyJsonImporter.ImportAsync(context, vocabJson, logger);
                    logger.LogInformation("Vocabulary JSON import done.");
                    // Apply special tags after fresh import
                    await ApplySpecialTagsAsync(context, vocabJson, logger);
                    return;
                }

                if (isPostgres)
                {
                    logger.LogWarning("No vocabulary JSON found for PostgreSQL seed.");
                    return;
                }

                // SQL Server: T-SQL seed files
                // WebAPI is running from f:/JB_AI/backend/src/JapaneseAI.Api
                // The sql folder is at f:/JB_AI/sql
                var baseDir = AppDomain.CurrentDomain.BaseDirectory;
                
                // Let's search upward to find the sql/seed directory
                string seedDir = "";
                var currentPath = new DirectoryInfo(baseDir);
                while (currentPath != null)
                {
                    var testPath = Path.Combine(currentPath.FullName, "sql", "seed");
                    if (Directory.Exists(testPath))
                    {
                        seedDir = testPath;
                        break;
                    }
                    // Also check for parents outside backend folder
                    testPath = Path.Combine(currentPath.FullName, "..", "sql", "seed");
                    if (Directory.Exists(testPath))
                    {
                        seedDir = Path.GetFullPath(testPath);
                        break;
                    }
                    currentPath = currentPath.Parent;
                }

                if (string.IsNullOrEmpty(seedDir) || !Directory.Exists(seedDir))
                {
                    logger.LogError("Could not find SQL seed directory. Base directory: {BaseDir}", baseDir);
                    return;
                }

                logger.LogInformation("Found SQL seed directory at: {SeedDir}", seedDir);

                // SQL seed files in order
                string[] seedFiles = {
                    "N5_vocabulary.sql",
                    "N4_vocabulary.sql",
                    "N3_vocabulary.sql",
                    "N2_vocabulary.sql",
                    "N1_vocabulary.sql",
                    "Special_vocabulary.sql"
                };

                foreach (var file in seedFiles)
                {
                    var filePath = Path.Combine(seedDir, file);
                    if (!File.Exists(filePath))
                    {
                        logger.LogWarning("Seed file {File} does not exist at {Path}", file, filePath);
                        continue;
                    }

                    logger.LogInformation("Executing seed script: {File}", file);
                    
                    // Read file content
                    var sql = await File.ReadAllTextAsync(filePath);
                    
                    // SQL Server scripts generated by excel-to-sql.js contain "USE JapaneseAI;", "GO", and Batch commands.
                    // EF Core's ExecuteSqlRaw does not support "GO" statement. We need to split the script by "GO" or clean it.
                    var cleanedSql = CleanSqlScript(sql);

                    // Execute batch commands
                    foreach (var batch in cleanedSql)
                    {
                        if (string.IsNullOrWhiteSpace(batch)) continue;
                        try
                        {
                            await context.Database.ExecuteSqlRawAsync(batch);
                        }
                        catch (Exception ex)
                        {
                            logger.LogError(ex, "Error executing SQL batch from {File}. Batch length: {Len}", file, batch.Length);
                        }
                    }
                    logger.LogInformation("Completed seed script: {File}", file);
                }

                logger.LogInformation("Database seed process completed successfully!");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "An error occurred during database initialization/seeding.");
            }
        }

        /// <summary>
        /// Reads all_vocabulary.json and applies special tags (n2_bs, tu_lay, luong_tu) to
        /// matching records already in the database.
        /// - N2-BS: matched by HanViet (uppercase, trimmed)
        /// - Từ láy / Lượng từ: matched by Kana
        /// Inserts brand-new records (e.g. entirely new Từ láy words) if not found.
        /// </summary>
        private static async Task ApplySpecialTagsAsync(AppDbContext context, string jsonPath, ILogger logger)
        {
            try
            {
                if (!File.Exists(jsonPath)) return;

                var json = await File.ReadAllTextAsync(jsonPath);
                var rows = JsonSerializer.Deserialize<List<SpecialVocabRow>>(
                    json,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                ) ?? new List<SpecialVocabRow>();

                var specialRows = rows
                    .Where(r => !string.IsNullOrWhiteSpace(r.Tags) && r.Tags!.Contains("special"))
                    .ToList();

                if (specialRows.Count == 0)
                {
                    logger.LogInformation("ApplySpecialTags: no special rows found in JSON.");
                    return;
                }

                logger.LogInformation("ApplySpecialTags: processing {Count} special rows from JSON...", specialRows.Count);

                int updated = 0;
                int inserted = 0;

                // ── Partition by category ──
                var n2BsRows   = specialRows.Where(r => r.Tags!.Contains("n2_bs")).ToList();
                var tuLayRows  = specialRows.Where(r => r.Tags!.Contains("tu_lay")).ToList();
                var luongTuRows = specialRows.Where(r => r.Tags!.Contains("luong_tu")).ToList();

                // ── N2-BS: match by HanViet (normalised upper-case) ──
                var n2BsHanViets = n2BsRows
                    .Where(r => !string.IsNullOrWhiteSpace(r.HanViet))
                    .Select(r => r.HanViet!.Trim().ToUpperInvariant())
                    .Distinct()
                    .ToList();

                // Also build a kana-based lookup for N2-BS rows whose HanViet is empty
                var n2BsKanas = n2BsRows
                    .Where(r => string.IsNullOrWhiteSpace(r.HanViet) && !string.IsNullOrWhiteSpace(r.Kana))
                    .Select(r => r.Kana!.Trim())
                    .Distinct()
                    .ToList();

                if (n2BsHanViets.Count > 0)
                {
                    var dbN2Records = await context.Vocabulary
                        .Where(v => v.JlptLevel == "N2" && v.HanViet != null && n2BsHanViets.Contains(v.HanViet.ToUpper()))
                        .ToListAsync();

                    foreach (var dbRec in dbN2Records)
                    {
                        if (string.IsNullOrEmpty(dbRec.Tags) || !dbRec.Tags.Contains("special"))
                        {
                            dbRec.Tags = MergeTags(dbRec.Tags, "special,n2_bs");
                            updated++;
                        }
                    }
                }

                // ── Từ láy: match by Kana ──
                var tuLayKanas = tuLayRows
                    .Where(r => !string.IsNullOrWhiteSpace(r.Kana))
                    .Select(r => r.Kana!.Trim())
                    .Distinct()
                    .ToList();

                if (tuLayKanas.Count > 0)
                {
                    var dbTuLayRecords = await context.Vocabulary
                        .Where(v => v.JlptLevel == "N3" && tuLayKanas.Contains(v.Kana))
                        .ToListAsync();

                    var foundKanas = dbTuLayRecords.Select(r => r.Kana).ToHashSet();

                    foreach (var dbRec in dbTuLayRecords)
                    {
                        if (string.IsNullOrEmpty(dbRec.Tags) || !dbRec.Tags.Contains("special"))
                        {
                            dbRec.Tags = MergeTags(dbRec.Tags, "special,tu_lay");
                            updated++;
                        }
                    }

                    // Insert brand-new Từ láy words not yet in DB
                    var toInsertTuLay = tuLayRows
                        .Where(r => !string.IsNullOrWhiteSpace(r.Kana) && !foundKanas.Contains(r.Kana!.Trim()))
                        .ToList();

                    foreach (var r in toInsertTuLay)
                    {
                        var kana = r.Kana!.Trim();
                        context.Vocabulary.Add(new Vocabulary
                        {
                            Kanji = string.IsNullOrWhiteSpace(r.Kanji) ? kana : r.Kanji.Trim(),
                            Kana  = kana,
                            HanViet = r.HanViet?.Trim(),
                            Vietnamese = r.Vietnamese?.Trim() ?? string.Empty,
                            JlptLevel = "N3",
                            PartOfSpeech = r.PartOfSpeech?.Trim(),
                            Tags = "special,tu_lay",
                            SortOrder = r.SortOrder ?? 0,
                        });
                        inserted++;
                    }
                }

                // ── Lượng từ: match by Kana ──
                var luongTuKanas = luongTuRows
                    .Where(r => !string.IsNullOrWhiteSpace(r.Kana))
                    .Select(r => r.Kana!.Trim())
                    .Distinct()
                    .ToList();

                if (luongTuKanas.Count > 0)
                {
                    var dbLuongTuRecords = await context.Vocabulary
                        .Where(v => v.JlptLevel == "N3" && luongTuKanas.Contains(v.Kana))
                        .ToListAsync();

                    var foundKanas = dbLuongTuRecords.Select(r => r.Kana).ToHashSet();

                    foreach (var dbRec in dbLuongTuRecords)
                    {
                        if (string.IsNullOrEmpty(dbRec.Tags) || !dbRec.Tags.Contains("special"))
                        {
                            dbRec.Tags = MergeTags(dbRec.Tags, "special,luong_tu");
                            updated++;
                        }
                    }

                    // Insert brand-new Lượng từ words not yet in DB
                    var toInsertLuongTu = luongTuRows
                        .Where(r => !string.IsNullOrWhiteSpace(r.Kana) && !foundKanas.Contains(r.Kana!.Trim()))
                        .ToList();

                    foreach (var r in toInsertLuongTu)
                    {
                        var kana = r.Kana!.Trim();
                        context.Vocabulary.Add(new Vocabulary
                        {
                            Kanji = string.IsNullOrWhiteSpace(r.Kanji) ? kana : r.Kanji.Trim(),
                            Kana  = kana,
                            HanViet = r.HanViet?.Trim(),
                            Vietnamese = r.Vietnamese?.Trim() ?? string.Empty,
                            JlptLevel = "N3",
                            PartOfSpeech = r.PartOfSpeech?.Trim(),
                            Tags = "special,luong_tu",
                            SortOrder = r.SortOrder ?? 0,
                        });
                        inserted++;
                    }
                }

                await context.SaveChangesAsync();
                logger.LogInformation("ApplySpecialTags complete: {Updated} updated, {Inserted} inserted.", updated, inserted);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "ApplySpecialTags failed.");
            }
        }

        private static string MergeTags(string? existing, string incoming)
        {
            var existingSet = (existing ?? string.Empty)
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(t => t.Trim().ToLowerInvariant())
                .Where(t => t.Length > 0)
                .ToHashSet();

            foreach (var tag in incoming.Split(',', StringSplitOptions.RemoveEmptyEntries))
                existingSet.Add(tag.Trim().ToLowerInvariant());

            return string.Join(',', existingSet);
        }

        private class SpecialVocabRow
        {
            public string? Kanji { get; set; }
            public string? Kana { get; set; }
            public string? HanViet { get; set; }
            public string? Vietnamese { get; set; }
            public string? JlptLevel { get; set; }
            public string? PartOfSpeech { get; set; }
            public string? Tags { get; set; }
            public int? SortOrder { get; set; }
        }

        private static string[] CleanSqlScript(string sql)
        {
            // Remove "USE JapaneseAI;" and "GO"
            // Also ensure we split properly
            var lines = sql.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);
            var batches = new System.Collections.Generic.List<string>();
            var currentBatch = new System.Text.StringBuilder();

            foreach (var line in lines)
            {
                var trimmed = line.Trim();
                if (trimmed.Equals("GO", StringComparison.OrdinalIgnoreCase))
                {
                    batches.Add(currentBatch.ToString());
                    currentBatch.Clear();
                }
                else if (trimmed.StartsWith("USE ", StringComparison.OrdinalIgnoreCase) && trimmed.EndsWith(";"))
                {
                    // Skip USE statements to prevent EF core errors
                    continue;
                }
                else if (trimmed.StartsWith("SET NOCOUNT", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }
                else
                {
                    currentBatch.AppendLine(line);
                }
            }

            if (currentBatch.Length > 0)
            {
                batches.Add(currentBatch.ToString());
            }

            return batches.Where(b => !string.IsNullOrWhiteSpace(b)).ToArray();
        }
    }
}
