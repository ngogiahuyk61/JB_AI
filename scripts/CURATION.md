Curation workflow — `data/vocabulary/all_vocabulary.json`

Goal
- Provide a lightweight manual curation process so editors can review and fix entries, preserve `tags`/examples/grammar, and submit changes.

Files
- `data/vocabulary/all_vocabulary.json` — canonical dataset used by frontend & backend
- `frontend/src/data/all_vocabulary.json` — frontend copy (kept in sync by scripts)
- `data/vocabulary/flashcards/*` — generated exports (CSV/JSON)

Process
1. Run auto-tag & export (already provided):
   - `node scripts/import-vocabulary-data.js`  # regenerate from Excel
   - `node scripts/auto-tag-vocab.js`         # auto-tag onomatopoeia/counters
   - `node scripts/generate-flashcards.js`    # create CSV/JSON exports

2. Inspect results locally (recommended):
   - Open `data/vocabulary/all_vocabulary.json` in VS Code
   - Use the `Search` view to find suspicious encodings or missing `exampleSentence`.
   - Open `data/vocabulary/flashcards/flashcards.csv` in a spreadsheet for bulk review.

3. Manual edits
   - Edit individual objects in `data/vocabulary/all_vocabulary.json`. Keep fields: `kanji,kana,vietnamese,jlptLevel,partOfSpeech,tags,exampleSentence,exampleTranslation,grammarPoint`.
   - Use consistent `tags` (comma-separated), e.g. `special,onomatopoeia,counter`.

4. Validate changes
   - Run `node scripts/generate-flashcards.js` to recreate exports.
   - Optionally run `npm run build:check` in `frontend/` to ensure no runtime errors.

5. Commit
   - Commit the updated JSON and exports. If working with multiple editors, use small atomic commits (e.g., `vocab: fix examples for N5-001..N5-100`).

6. Seed DB (optional)
   - To apply the updated dataset to the backend DB, start the API (it will import `data/vocabulary/all_vocabulary.json` on first run):

```powershell
cd backend\src\JapaneseAI.Api
dotnet run
```

Notes
- Keep backups: before large edits, copy `all_vocabulary.json` to `all_vocabulary.backup.json`.
- If you prefer a GUI for edits, open the CSV export and edit there, then convert back to JSON using a small script (we can add one).

If you'd like, I can now run the backend seed (`dotnet run`) here to import the current JSON into your LocalDB. Reply with `yes` to proceed, or `no` / `later` to skip.