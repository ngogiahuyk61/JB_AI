using JapaneseAI.Core.Entities;
using JapaneseAI.Core.Interfaces;
using JapaneseAI.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JapaneseAI.Infrastructure.Services;

public class VerbQuizService : IVerbQuizService
{
    private readonly AppDbContext _context;
    private static readonly Random _random = new();

    public VerbQuizService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<object> GenerateQuizAsync(string jlptLevel, string[] verbGroups, string[] forms, int count, string mode)
    {
        var query = _context.Verbs.AsQueryable();
        
        if (!string.IsNullOrEmpty(jlptLevel) && jlptLevel != "All")
        {
            query = query.Where(v => v.JlptLevel == jlptLevel);
        }

        if (verbGroups != null && verbGroups.Length > 0 && !verbGroups.Contains("All"))
        {
            query = query.Where(v => verbGroups.Contains(v.VerbGroup));
        }

        var verbs = await query.ToListAsync();
        if (verbs.Count < 4)
        {
            // Fall back to all verbs to ensure we have enough distractors
            verbs = await _context.Verbs.ToListAsync();
            if (verbs.Count < 4)
                throw new Exception("Not enough verbs in database to generate choices. Need at least 4.");
        }

        var questions = new List<object>();

        for (int i = 0; i < count; i++)
        {
            var targetVerb = verbs[_random.Next(verbs.Count)];
            var type = _random.Next(1, 6); // Just supporting 5 types for now to keep it simple

            object question = type switch
            {
                1 => GenerateType1(targetVerb, verbs),
                2 => GenerateType2(targetVerb, verbs),
                3 => GenerateType3(targetVerb, verbs),
                4 => GenerateType4(targetVerb, verbs),
                _ => GenerateType5(targetVerb, verbs)
            };

            questions.Add(question);
        }

        return questions;
    }

    // Type 1: Dictionary -> Te
    private object GenerateType1(Verb target, List<Verb> allVerbs)
    {
        var choices = new List<string> { target.TeForm };
        int attempts = 0;
        while (choices.Count < 4 && attempts < 50)
        {
            attempts++;
            var randomVerb = allVerbs[_random.Next(allVerbs.Count)];
            if (!choices.Contains(randomVerb.TeForm) && !string.IsNullOrEmpty(randomVerb.TeForm))
                choices.Add(randomVerb.TeForm);
        }
        choices = choices.OrderBy(c => _random.Next()).ToList();

        return new
        {
            id = Guid.NewGuid(),
            questionType = "dictionary_to_te",
            question = $"Thể て của 【{target.DictionaryForm}】 là gì?",
            choices = choices,
            correctIndex = choices.IndexOf(target.TeForm),
            explanation = $"{target.DictionaryForm} thuộc Nhóm {target.VerbGroup}, thể て là {target.TeForm}."
        };
    }

    // Type 2: Reverse (Te -> Dictionary)
    private object GenerateType2(Verb target, List<Verb> allVerbs)
    {
        var choices = new List<string> { target.DictionaryForm };
        int attempts = 0;
        while (choices.Count < 4 && attempts < 50)
        {
            attempts++;
            var randomVerb = allVerbs[_random.Next(allVerbs.Count)];
            if (!choices.Contains(randomVerb.DictionaryForm))
                choices.Add(randomVerb.DictionaryForm);
        }
        choices = choices.OrderBy(c => _random.Next()).ToList();

        return new
        {
            id = Guid.NewGuid(),
            questionType = "te_to_dictionary",
            question = $"Đây là thể từ điển của động từ nào: 【{target.TeForm}】?",
            choices = choices,
            correctIndex = choices.IndexOf(target.DictionaryForm),
            explanation = $"Thể từ điển của {target.TeForm} là {target.DictionaryForm}."
        };
    }

    // Type 3: Identify form
    private object GenerateType3(Verb target, List<Verb> allVerbs)
    {
        var forms = new List<(string formValue, string formName)>
        {
            (target.DictionaryForm, "Thể Từ điển"),
            (target.MasuForm, "Thể ます"),
            (target.TeForm, "Thể て"),
            (target.TaForm, "Thể た"),
            (target.NaiForm, "Thể ない")
        }.Where(f => !string.IsNullOrEmpty(f.formValue)).ToList();

        var selectedForm = forms[_random.Next(forms.Count)];

        var choices = new List<string> { selectedForm.formName };
        var allFormNames = new[] { "Thể Từ điển", "Thể ます", "Thể て", "Thể た", "Thể ない" };
        foreach(var f in allFormNames)
        {
            if (choices.Count >= 4) break;
            if (!choices.Contains(f)) choices.Add(f);
        }
        choices = choices.OrderBy(c => _random.Next()).ToList();

        return new
        {
            id = Guid.NewGuid(),
            questionType = "identify_form",
            question = $"Từ 【{selectedForm.formValue}】 thuộc thể gì?",
            choices = choices,
            correctIndex = choices.IndexOf(selectedForm.formName),
            explanation = $"{selectedForm.formValue} là {selectedForm.formName} của {target.DictionaryForm}."
        };
    }

    // Type 4: Meaning
    private object GenerateType4(Verb target, List<Verb> allVerbs)
    {
        var choices = new List<string> { target.Meaning };
        int attempts = 0;
        while (choices.Count < 4 && attempts < 50)
        {
            attempts++;
            var randomVerb = allVerbs[_random.Next(allVerbs.Count)];
            if (!choices.Contains(randomVerb.Meaning))
                choices.Add(randomVerb.Meaning);
        }
        choices = choices.OrderBy(c => _random.Next()).ToList();

        return new
        {
            id = Guid.NewGuid(),
            questionType = "meaning",
            question = $"Ý nghĩa của 【{target.DictionaryForm}】 là gì?",
            choices = choices,
            correctIndex = choices.IndexOf(target.Meaning),
            explanation = $"{target.DictionaryForm} có nghĩa là {target.Meaning}."
        };
    }

    // Type 5: Verb Group
    private object GenerateType5(Verb target, List<Verb> allVerbs)
    {
        var choices = new List<string> { "Nhóm I", "Nhóm II", "Nhóm III", "Không xác định" };
        var correct = $"Nhóm {target.VerbGroup}";
        
        return new
        {
            id = Guid.NewGuid(),
            questionType = "identify_group",
            question = $"Động từ 【{target.DictionaryForm}】 thuộc nhóm mấy?",
            choices = choices,
            correctIndex = choices.IndexOf(correct),
            explanation = $"{target.DictionaryForm} thuộc Nhóm {target.VerbGroup}."
        };
    }
}
