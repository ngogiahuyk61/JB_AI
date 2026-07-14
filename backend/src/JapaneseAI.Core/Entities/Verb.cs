using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace JapaneseAI.Core.Entities;

public class Verb
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Meaning { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string DictionaryForm { get; set; } = string.Empty;

    [MaxLength(50)]
    public string MasuForm { get; set; } = string.Empty;

    [MaxLength(50)]
    public string TeForm { get; set; } = string.Empty;

    [MaxLength(50)]
    public string TaForm { get; set; } = string.Empty;

    [MaxLength(50)]
    public string NaiForm { get; set; } = string.Empty;

    [MaxLength(10)]
    public string VerbGroup { get; set; } = string.Empty; // "I", "II", "III"

    [MaxLength(10)]
    public string JlptLevel { get; set; } = "N5"; // N5, N4...
}
