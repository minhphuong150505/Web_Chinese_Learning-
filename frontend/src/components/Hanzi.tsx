import type { ZhToken } from '../lib/zh';

interface HanziProps {
  tokens: ZhToken[];
  size?: number | string;
  pinyin?: boolean;
  className?: string;
}

export default function Hanzi({ tokens, size, pinyin = true, className = '' }: HanziProps) {
  return (
    <span className={'hz ' + className} style={size ? { fontSize: size } : undefined}>
      {tokens.map((t, i) => {
        if (!t.py) return <span key={i} className="t0">{t.hz}</span>;
        if (!pinyin) return <span key={i} className={'t' + t.tone}>{t.hz}</span>;
        return (
          <ruby key={i} className={'syl t' + t.tone}>
            {t.hz}
            <rt>{t.py}</rt>
          </ruby>
        );
      })}
    </span>
  );
}
