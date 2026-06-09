import type { ReactNode } from 'react';
import Icon from './Icon';
import LanguageToggle from './LanguageToggle';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../i18n/LanguageProvider';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { text } = useLanguage();

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
          {user && (
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-full border border-violet-100 bg-violet-50 text-[15px] font-extrabold text-violet-700">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden flex-col leading-tight md:flex">
                <span className="text-[13.5px] font-bold text-slate-900">{user.displayName}</span>
                <span className="text-[11.5px] text-slate-400">{user.email}</span>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={logout}
            className="tip inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-[13px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 sm:px-3.5"
            data-tip={text('Đăng xuất', 'Sign out')}
            aria-label={text('Đăng xuất', 'Sign out')}
          >
            <Icon name="logout" size={16} />
            <span className="hidden sm:inline">{text('Đăng xuất', 'Sign out')}</span>
          </button>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
