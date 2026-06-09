import { toPinyinLine, type ZhToken } from '../lib/zh';

interface HanziProps {
  tokens: ZhToken[];
  size?: number | string;
  pinyin?: boolean;
  className?: string;
}

export default function Hanzi({ tokens, size, pinyin = true, className = '' }: HanziProps) {
  const pinyinLine = pinyin ? toPinyinLine(tokens) : '';

  return (
    <span className={'hz ' + className} style={size ? { fontSize: size } : undefined}>
      <span className="hz-stack">
        <span className="hz-text">
          {tokens.map((token, index) => (
            <span key={index} className={'t' + token.tone}>
              {token.hz}
            </span>
          ))}
        </span>
        {pinyinLine && <span className="hz-pinyin">{pinyinLine}</span>}
      </span>
    </span>
  );
}
