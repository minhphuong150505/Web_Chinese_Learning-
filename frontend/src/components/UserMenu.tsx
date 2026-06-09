import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage, type Language } from '../i18n/LanguageProvider';
import { apiClient } from '../lib/apiClient';
import Icon from './Icon';
import Spinner from './Spinner';

type DialogMode = 'password' | 'delete';

function accountError(message: string, language: Language) {
  const text = (vi: string, en: string) => (language === 'vi' ? vi : en);
  if (message === 'Current password is incorrect') {
    return text('Mật khẩu hiện tại không đúng.', 'The current password is incorrect.');
  }
  if (message.includes('72 bytes')) {
    return text('Mật khẩu quá dài.', 'The password is too long.');
  }
  if (message === 'Type DELETE to confirm account deletion') {
    return text('Hãy nhập DELETE để xác nhận.', 'Type DELETE to confirm.');
  }
  return message || text('Đã có lỗi xảy ra. Vui lòng thử lại.', 'Something went wrong. Please try again.');
}

function AccountDialog({ mode, onClose }: { mode: DialogMode; onClose: () => void }) {
  const { user, updateUser, logout } = useAuth();
  const { language, text } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const changePassword = useMutation({
    mutationFn: () =>
      apiClient.patch('/auth/password', {
        currentPassword: user?.hasPassword ? currentPassword : null,
        newPassword,
      }),
    onSuccess: () => {
      if (user) updateUser({ ...user, hasPassword: true });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setSuccess(true);
    },
    onError: (mutationError) => setError(accountError(mutationError.message, language)),
  });

  const deleteAccount = useMutation({
    mutationFn: () =>
      apiClient.delete('/auth/account', {
        data: {
          currentPassword: user?.hasPassword ? currentPassword : null,
          confirmation: deleteConfirmation,
        },
      }),
    onSuccess: logout,
    onError: (mutationError) => setError(accountError(mutationError.message, language)),
  });

  const pending = changePassword.isPending || deleteAccount.isPending;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pending) onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, pending]);

  function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword !== confirmPassword) {
      setError(text('Mật khẩu xác nhận không khớp.', 'The password confirmation does not match.'));
      return;
    }
    changePassword.mutate();
  }

  function submitDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    deleteAccount.mutate();
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-dialog-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <div className="w-full max-w-[440px] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-violet-500">
              {text('Quản lý tài khoản', 'Account settings')}
            </div>
            <h2 id="account-dialog-title" className="mt-1 text-xl font-extrabold text-slate-900">
              {mode === 'password'
                ? user?.hasPassword
                  ? text('Thay đổi mật khẩu', 'Change password')
                  : text('Đặt mật khẩu', 'Set password')
                : text('Xóa tài khoản', 'Delete account')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
            aria-label={text('Đóng', 'Close')}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {mode === 'password' ? (
          <form className="mt-5 space-y-4" onSubmit={submitPassword}>
            {!user?.hasPassword && (
              <p className="rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-3 text-[13px] leading-5 text-blue-700">
                {text(
                  'Tài khoản này đang dùng Google. Sau khi đặt mật khẩu, bạn có thể đăng nhập bằng email và mật khẩu.',
                  'This account currently uses Google. After setting a password, you can also sign in with email and password.',
                )}
              </p>
            )}
            {user?.hasPassword && (
              <PasswordField
                label={text('Mật khẩu hiện tại', 'Current password')}
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
                disabled={pending}
              />
            )}
            <PasswordField
              label={text('Mật khẩu mới', 'New password')}
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              disabled={pending}
              minLength={8}
            />
            <PasswordField
              label={text('Xác nhận mật khẩu mới', 'Confirm new password')}
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              disabled={pending}
              minLength={8}
            />

            {success && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-[13px] font-semibold text-emerald-700">
                <Icon name="check" size={16} />
                {text('Mật khẩu đã được cập nhật.', 'Your password has been updated.')}
              </div>
            )}
            {error && <ErrorMessage message={error} />}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {success ? text('Xong', 'Done') : text('Hủy', 'Cancel')}
              </button>
              {!success && (
                <button
                  type="submit"
                  disabled={pending || newPassword.length < 8 || confirmPassword.length < 8}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending && <Spinner size={15} />}
                  {text('Lưu mật khẩu', 'Save password')}
                </button>
              )}
            </div>
          </form>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={submitDelete}>
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-5 text-red-700">
              <p className="font-extrabold">{text('Hành động này không thể hoàn tác.', 'This action cannot be undone.')}</p>
              <p className="mt-1">
                {text(
                  'Tài khoản, hội thoại, lịch sử phát âm và các tệp âm thanh của bạn sẽ bị xóa.',
                  'Your account, conversations, pronunciation history, and audio files will be deleted.',
                )}
              </p>
            </div>
            {user?.hasPassword && (
              <PasswordField
                label={text('Mật khẩu hiện tại', 'Current password')}
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
                disabled={pending}
              />
            )}
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">
                {text('Nhập DELETE để xác nhận', 'Type DELETE to confirm')}
              </span>
              <input
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                disabled={pending}
                autoComplete="off"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
                placeholder="DELETE"
                required
              />
            </label>
            {error && <ErrorMessage message={error} />}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {text('Hủy', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={pending || deleteConfirmation !== 'DELETE'}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending && <Spinner size={15} />}
                {text('Xóa tài khoản', 'Delete account')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  disabled: boolean;
  minLength?: number;
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  disabled,
  minLength = 1,
}: PasswordFieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        disabled={disabled}
        minLength={minLength}
        maxLength={72}
        required
        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
      />
    </label>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] font-semibold text-red-700">
      <Icon name="x" className="mt-0.5 shrink-0" size={15} />
      {message}
    </div>
  );
}

export default function UserMenu() {
  const { user, logout } = useAuth();
  const { text } = useLanguage();
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogMode | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  if (!user) return null;

  function openDialog(mode: DialogMode) {
    setOpen(false);
    setDialog(mode);
  }

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex h-11 items-center gap-2 rounded-xl px-1.5 text-left transition hover:bg-slate-50 sm:px-2"
        >
          <div className="grid h-9 w-9 place-items-center rounded-full border border-violet-100 bg-violet-50 text-[15px] font-extrabold text-violet-700">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden min-w-0 flex-col leading-tight md:flex">
            <span className="max-w-[180px] truncate text-[13.5px] font-bold text-slate-900">
              {user.displayName}
            </span>
            <span className="max-w-[180px] truncate text-[11.5px] text-slate-400">{user.email}</span>
          </div>
          <Icon
            name="chevDown"
            size={14}
            className={'hidden text-slate-400 transition md:block ' + (open ? 'rotate-180' : '')}
          />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-[250px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10"
          >
            <div className="border-b border-slate-100 px-3 pb-2.5 pt-1.5 md:hidden">
              <div className="truncate text-sm font-extrabold text-slate-900">{user.displayName}</div>
              <div className="mt-0.5 truncate text-xs text-slate-400">{user.email}</div>
            </div>
            <MenuButton
              icon="key"
              label={
                user.hasPassword
                  ? text('Thay đổi mật khẩu', 'Change password')
                  : text('Đặt mật khẩu', 'Set password')
              }
              onClick={() => openDialog('password')}
            />
            <MenuButton
              icon="trash"
              label={text('Xóa tài khoản', 'Delete account')}
              onClick={() => openDialog('delete')}
              danger
            />
            <div className="my-1 h-px bg-slate-100" />
            <MenuButton icon="logout" label={text('Đăng xuất', 'Sign out')} onClick={logout} />
          </div>
        )}
      </div>
      {dialog && <AccountDialog mode={dialog} onClose={() => setDialog(null)} />}
    </>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: 'key' | 'trash' | 'logout';
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={
        'flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[13.5px] font-bold transition ' +
        (danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')
      }
    >
      <Icon name={icon} size={17} />
      {label}
    </button>
  );
}
