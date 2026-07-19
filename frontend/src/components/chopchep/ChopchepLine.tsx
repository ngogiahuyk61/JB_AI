import { useState } from 'react';
import { Volume2 } from 'lucide-react';

interface ChopchepLineProps {
  line: string;
  isActive: boolean;
  onClick: () => void;
  isHeaderLine: (text: string) => boolean;
}

export const parseForSpeech = (line: string) => {
  let text = line.trim();
  text = text.replace(/^\*\s*/, '');
  text = text.replace(/\(([\u4e00-\u9faf]+)\s*-\s*([^\)]+)\)/g, ''); // strip kanji

  let speaker = '';
  if (text.includes('：')) {
    const parts = text.split('：');
    speaker = parts[0].trim();
    text = parts.slice(1).join('：').trim();
  }

  let japanese = text;
  let vietnamese = '';
  // match " (translation)" at the end of string, allowing spaces
  const viMatch = text.match(/\s*\(([^)]+)\)\s*$/);
  if (viMatch) {
    vietnamese = viMatch[1].trim();
    japanese = text.replace(/\s*\(([^)]+)\)\s*$/, '').trim();
  }

  return { japanese, vietnamese, speaker };
};

export default function ChopchepLine({ line, isActive, onClick, isHeaderLine }: ChopchepLineProps) {
  const [showKanji, setShowKanji] = useState(false);

  let text = line.trim();
  const isEmpty = !text;
  const isHeader = isHeaderLine(text) || text.startsWith('第');

  if (isEmpty) return <div style={{ height: '16px' }} />;
  
  if (isHeader) {
    return (
      <div className="chopchep-header-sticky">
        <div className="chopchep-header-badge">{text.replace(/^\*\s*/, '')}</div>
      </div>
    );
  }

  // Strip leading '* '
  text = text.replace(/^\*\s*/, '');

  let kanjiInfo = '';
  text = text.replace(/\(([\u4e00-\u9faf]+)\s*-\s*([^\)]+)\)/g, (_, kanji, hanviet) => {
    kanjiInfo += (kanjiInfo ? ' | ' : '') + `${kanji} - ${hanviet}`;
    return '';
  });

  const { japanese, vietnamese, speaker } = parseForSpeech(line);

  return (
    <div className={`chopchep-line-item ${isActive ? 'active' : ''}`} onClick={onClick}>
      <div className="chopchep-icon">
        <Volume2 size={20} />
      </div>
      <div className="chopchep-text-main">
        {speaker && <span className="chopchep-speaker">{speaker}</span>}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
           <span>{japanese}</span>
           {kanjiInfo && (
             <button 
                onClick={(e) => { e.stopPropagation(); setShowKanji(!showKanji); }}
                className="kanji-badge"
             >
               Hán tự
             </button>
           )}
        </div>
        {showKanji && kanjiInfo && (
          <div className="kanji-info-box">
             {kanjiInfo}
          </div>
        )}
        {vietnamese && (
          <div className="chopchep-text-trans" style={{ marginTop: '4px' }}>
            {vietnamese}
          </div>
        )}
      </div>
    </div>
  );
}
