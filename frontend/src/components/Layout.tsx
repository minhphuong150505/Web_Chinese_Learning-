import type { ReactNode } from 'react';
import Icon from './Icon';
import LanguageToggle from './LanguageToggle';
import UserMenu from './UserMenu';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen min-h-0 flex-col">
      <header className="flex h-[68px] flex-none items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-7" style={{ zIndex: 20 }}>
        <div className="flex items-center gap-3">
          <div className="grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-violet-600 text-white shadow-accent">
            <Icon name="chat" size={18} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[16px] font-extrabold tracking-tight text-slate-900">Chinese Learning</span>
            <span className="font-zh text-[13px] font-semibold text-violet-600">学中文</span>
          </div>
        </div>
        <div className="flex flex-none items-center gap-2 sm:gap-3.5">
          <LanguageToggle />
          <UserMenu />
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
