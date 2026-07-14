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
            var type = _random.Next(1, 7); // 6 question types

            object question = type switch
            {
                1 => GenerateIdentifyGroup(targetVerb),
                2 => GenerateIdentifyForm(targetVerb),
                3 => GenerateDictionaryToTe(targetVerb, verbs),
                4 => GenerateDictionaryToMasu(targetVerb, verbs),
                5 => GenerateDictionaryToNai(targetVerb, verbs),
                _ => GenerateMeaning(targetVerb, verbs)
            };

            questions.Add(question);
        }

        return questions;
    }

    // Type 1: Identify Group (3 choices)
    private object GenerateIdentifyGroup(Verb target)
    {
        var choices = new List<string> { "Nhóm I", "Nhóm II", "Nhóm III" };
        var correct = $"Nhóm {target.VerbGroup}";
        
        string rule = target.VerbGroup switch {
            "I" => "Động từ Nhóm I có âm cuối trước ます thuộc cột い (như い, き, ぎ, し, ち, に, ひ, み, り).",
            "II" => "Động từ Nhóm II thường có âm cuối trước ます thuộc cột え (hoặc một số động từ đặc biệt cột い như 見る, 起きる).",
            "III" => "Động từ Nhóm III là các động từ bất quy tắc (する, くる) và các danh động từ đi với する.",
            _ => ""
        };

        return new
        {
            id = Guid.NewGuid(),
            questionType = "identify_group",
            question = $"Động từ 【{target.DictionaryForm}】 ({target.Meaning}) thuộc nhóm mấy?",
            choices = choices,
            correctIndex = choices.IndexOf(correct),
            explanation = $"【{target.DictionaryForm}】 thuộc {correct}. {rule}"
        };
    }

    // Type 2: Identify Form
    private object GenerateIdentifyForm(Verb target)
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
            explanation = $"【{selectedForm.formValue}】 là {selectedForm.formName} của động từ {target.DictionaryForm} ({target.Meaning})."
        };
    }

    // Type 3: Dictionary -> Te
    private object GenerateDictionaryToTe(Verb target, List<Verb> allVerbs)
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
            explanation = $"【{target.DictionaryForm}】 thuộc Nhóm {target.VerbGroup}, chia sang Thể て là 【{target.TeForm}】."
        };
    }

    // Type 4: Dictionary -> Masu
    private object GenerateDictionaryToMasu(Verb target, List<Verb> allVerbs)
    {
        var choices = new List<string> { target.MasuForm };
        int attempts = 0;
        while (choices.Count < 4 && attempts < 50)
        {
            attempts++;
            var randomVerb = allVerbs[_random.Next(allVerbs.Count)];
            if (!choices.Contains(randomVerb.MasuForm) && !string.IsNullOrEmpty(randomVerb.MasuForm))
                choices.Add(randomVerb.MasuForm);
        }
        choices = choices.OrderBy(c => _random.Next()).ToList();

        return new
        {
            id = Guid.NewGuid(),
            questionType = "dictionary_to_masu",
            question = $"Thể ます của 【{target.DictionaryForm}】 là gì?",
            choices = choices,
            correctIndex = choices.IndexOf(target.MasuForm),
            explanation = $"【{target.DictionaryForm}】 thuộc Nhóm {target.VerbGroup}, chia sang Thể ます là 【{target.MasuForm}】."
        };
    }

    // Type 5: Dictionary -> Nai
    private object GenerateDictionaryToNai(Verb target, List<Verb> allVerbs)
    {
        var choices = new List<string> { target.NaiForm };
        int attempts = 0;
        while (choices.Count < 4 && attempts < 50)
        {
            attempts++;
            var randomVerb = allVerbs[_random.Next(allVerbs.Count)];
            if (!choices.Contains(randomVerb.NaiForm) && !string.IsNullOrEmpty(randomVerb.NaiForm))
                choices.Add(randomVerb.NaiForm);
        }
        choices = choices.OrderBy(c => _random.Next()).ToList();

        return new
        {
            id = Guid.NewGuid(),
            questionType = "dictionary_to_nai",
            question = $"Thể ない của 【{target.DictionaryForm}】 là gì?",
            choices = choices,
            correctIndex = choices.IndexOf(target.NaiForm),
            explanation = $"【{target.DictionaryForm}】 thuộc Nhóm {target.VerbGroup}, chia sang Thể ない là 【{target.NaiForm}】."
        };
    }

    // Type 6: Meaning
    private object GenerateMeaning(Verb target, List<Verb> allVerbs)
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
            explanation = $"【{target.DictionaryForm}】 có nghĩa là \"{target.Meaning}\"."
        };
    }
}
