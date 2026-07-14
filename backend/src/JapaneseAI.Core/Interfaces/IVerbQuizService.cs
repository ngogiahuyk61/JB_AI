using JapaneseAI.Core.Entities;

namespace JapaneseAI.Core.Interfaces;

public interface IVerbQuizService
{
    Task<object> GenerateQuizAsync(string jlptLevel, string[] verbGroups, string[] forms, int count, string mode);
}
