const PATHS = {
  send: 'M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z M21.854 2.147l-10.94 10.939',
  mic: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v3',
  square: 'M5 5h14v14H5z',
  volume: 'M11 5 6 9H2v6h4l5 4z M15.54 8.46a5 5 0 0 1 0 7.07 M19.07 4.93a10 10 0 0 1 0 14.14',
  mute: 'M11 5 6 9H2v6h4l5 4z M22 9l-6 6 M16 9l6 6',
  play: 'M6 4l14 8-14 8z',
  pause: 'M6 5h4v14H6z M14 5h4v14h-4z',
  spark: 'M9.94 4.62 12 1l2.06 3.62a3 3 0 0 0 1.32 1.32L19 8l-3.62 2.06a3 3 0 0 0-1.32 1.32L12 15l-2.06-3.62a3 3 0 0 0-1.32-1.32L5 8l3.62-2.06a3 3 0 0 0 1.32-1.32z M19 14l.7 1.4 1.4.7-1.4.7-.7 1.4-.7-1.4-1.4-.7 1.4-.7z',
  check: 'M20 6 9 17l-5-5',
  plus: 'M12 5v14 M5 12h14',
  x: 'M18 6 6 18 M6 6l12 12',
  chevR: 'M9 18l6-6-6-6',
  lock: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M22 6l-10 7L2 6',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff: 'M3 3l18 18 M10.6 10.6a2 2 0 0 0 2.8 2.8 M9.9 4.2A10.8 10.8 0 0 1 12 4c6.5 0 10 8 10 8a17.7 17.7 0 0 1-2.1 3.2 M6.6 6.6C3.6 8.5 2 12 2 12s3.5 8 10 8a10.4 10.4 0 0 0 3.4-.6',
  swap: 'M8 3 4 7l4 4 M4 7h16 M16 21l4-4-4-4 M20 17H4',
  refresh: 'M3 12a9 9 0 0 1 15-6.7L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-15 6.7L3 16 M3 21v-5h5',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  wave: 'M2 12h3l2-7 4 16 3-12 2 5h6',
  lang: 'M5 8h10 M9 4v4 M7 8s.5 4 4 6 M11 14s-2-1-4-4 M12 20l4-9 4 9 M13.5 17h5',
  pen: 'M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  user: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  swatch: 'M9 3v15a3 3 0 1 0 6 0V3z M3 12h6 M15 7l4-2',
  rotate: 'M3 2v6h6 M21 12A9 9 0 0 0 6 5.3L3 8',
  phone: 'M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384z',
  phoneOff: 'M22 2 2 22 M9.5 5.5 9 5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2 18 18 0 0 0 5.5 13 M16 16l2 2c4 4 7 1 7-1v-3a2 2 0 0 0-2-2h-3a2 2 0 0 0-1.5.7',
  keyboard: 'M10 8h.01 M12 12h.01 M14 8h.01 M16 12h.01 M18 8h.01 M6 8h.01 M7 16h10 M8 12h.01 M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z',
  micOff: 'M2 2 22 22 M18.89 13.23A7 7 0 0 0 19 12v-2 M5 10v2a7 7 0 0 0 12 5 M15 9.34V5a3 3 0 0 0-5.68-1.33 M9 9v3a3 3 0 0 0 5.12 2.12 M12 19v3',
  key: 'M21 2l-2 2 M15.5 7.5l-2 2 M14 3a7 7 0 1 0 7 7 7 7 0 0 0-7-7z M9.5 14.5 3 21 M5 19l2 2 M8 16l2 2',
  trash: 'M3 6h18 M8 6V4h8v2 M19 6l-1 15H6L5 6 M10 11v5 M14 11v5',
  chevDown: 'M6 9l6 6 6-6',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  cards: 'M3 7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M7 3h12a2 2 0 0 1 2 2v12',
  map: 'M9 4 3 7v13l6-3 6 3 6-3V4l-6 3-6-3z M9 4v13 M15 7v13',
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps {
  name: IconName;
  size?: number;
  stroke?: number;
  className?: string;
}

export default function Icon({ name, size = 20, stroke = 2, className = '' }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name].split(' M').map((d, i) => (
        <path key={i} d={(i ? 'M' : '') + d} />
      ))}
    </svg>
  );
}
