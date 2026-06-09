import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useState, type FormEvent } from 'react';
import Icon from '../../components/Icon';
import Hanzi from '../../components/Hanzi';
import LanguageToggle from '../../components/LanguageToggle';
import Spinner from '../../components/Spinner';
import { useLanguage, type Language } from '../../i18n/LanguageProvider';
import { parseZh } from '../../lib/zh';
import { useGoogleLogin } from '../../hooks/useGoogleLogin';
import { useLogin } from '../../hooks/useLogin';
import { useRegister } from '../../hooks/useRegister';

const BRAND_ZH = parseZh('念|niàn|4 念|niàn|4 不|bù|4 忘|wàng|4');

type AuthMode = 'login' | 'register';

function errorMessage(message: string, language: Language) {
  const text = (vi: string, en: string) => (language === 'vi' ? vi : en);
  if (message === 'Invalid email or password') {
    return text('Thông tin đăng nhập hoặc mật khẩu không đúng.', 'Invalid email or password.');
  }
  if (message === 'An account with this email already exists') {
    return text('Email này đã có tài khoản.', 'An account with this email already exists.');
  }
  if (message === 'Invalid Google token') {
    return text(
      'Không thể xác thực Google. Vui lòng thử lại.',
      'Google authentication failed. Please try again.',
    );
  }
  if (message.includes('password') && message.includes('8')) {
    return text('Mật khẩu cần ít nhất 8 ký tự.', 'Password must be at least 8 characters.');
  }
  if (message.toLowerCase().includes('email')) {
    return text('Email không hợp lệ.', 'Invalid email address.');
  }
  return message || text('Đã có lỗi xảy ra. Vui lòng thử lại.', 'Something went wrong. Please try again.');
}

export default function LoginScreen() {
  const { language, text } = useLanguage();
  const login = useLogin();
  const register = useRegister();
  const googleLogin = useGoogleLogin();
  const [mode, setMode] = useState<AuthMode>('login');
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const pending = login.isPending || register.isPending || googleLogin.isPending;
  const isRegister = mode === 'register';

  function switchMode(nextMode: AuthMode) {
    if (pending) return;
    setMode(nextMode);
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (isRegister) {
      register.mutate(
        {
          displayName: displayName.trim(),
          email: email.trim(),
          password,
        },
        { onError: (mutationError) => setError(errorMessage(mutationError.message, language)) },
      );
      return;
    }

    login.mutate(
      { email: email.trim(), password },
      { onError: (mutationError) => setError(errorMessage(mutationError.message, language)) },
    );
  }

  function handleGoogleSuccess(response: CredentialResponse) {
    setError(null);
    if (!response.credential) {
      setError(
        text(
          'Google không trả về thông tin đăng nhập. Vui lòng thử lại.',
          'Google did not return sign-in information. Please try again.',
        ),
      );
      return;
    }
    googleLogin.mutate(response.credential, {
      onError: (mutationError) => setError(errorMessage(mutationError.message, language)),
    });
  }

  return (
    <main className="relative min-h-screen overflow-y-auto bg-slate-100 px-4 py-8 sm:grid sm:place-items-center">
      <div className="absolute right-4 top-4 sm:right-7 sm:top-6">
        <LanguageToggle />
      </div>
      <section className="mx-auto w-full max-w-[430px] animate-pop rounded-lg border border-slate-200 bg-white px-5 py-6 text-center shadow-xl shadow-slate-900/10 sm:px-8 sm:py-8">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-rose-600 text-white shadow-lg shadow-rose-600/20">
          <Icon name="mail" size={23} />
        </div>
        <div className="mt-3 text-2xl text-rose-700">
          <Hanzi tokens={BRAND_ZH} />
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {text('Không gian luyện tiếng Trung riêng tư.', 'Your private Chinese practice space.')}
        </p>

        <div className="mt-6 grid grid-cols-2 rounded-md bg-slate-100 p-1 text-sm font-bold">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={
              'h-9 rounded text-center transition ' +
              (!isRegister ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900')
            }
          >
            {text('Đăng nhập', 'Sign in')}
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={
              'h-9 rounded text-center transition ' +
              (isRegister ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900')
            }
          >
            {text('Đăng ký', 'Register')}
          </button>
        </div>

        <form className="mt-4 space-y-3 text-left" onSubmit={handleSubmit} aria-busy={pending}>
          {isRegister && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">
                {text('Tên hiển thị', 'Display name')}
              </span>
              <div className="flex h-11 items-center gap-2.5 rounded-md border border-slate-200 bg-white px-3 text-slate-400 transition focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-100">
                <Icon name="user" size={17} />
                <input
                  className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  placeholder={text('Tên của bạn', 'Your name')}
                  maxLength={100}
                  required
                  disabled={pending}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </div>
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-600">
              {isRegister ? 'Email' : text('Email hoặc tên đăng nhập', 'Email or username')}
            </span>
            <div className="flex h-11 items-center gap-2.5 rounded-md border border-slate-200 bg-white px-3 text-slate-400 transition focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-100">
              <Icon name="mail" size={17} />
              <input
                className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
                type={isRegister ? 'email' : 'text'}
                autoComplete={isRegister ? 'email' : 'username'}
                value={email}
                placeholder={isRegister ? 'you@gmail.com' : text('Email hoặc tên đăng nhập', 'Email or username')}
                maxLength={320}
                required
                disabled={pending}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-600">
              {text('Mật khẩu', 'Password')}
            </span>
            <div className="flex h-11 items-center gap-2.5 rounded-md border border-slate-200 bg-white px-3 text-slate-400 transition focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-100">
              <Icon name="lock" size={17} />
              <input
                className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                value={password}
                placeholder={
                  isRegister
                    ? text('Ít nhất 8 ký tự', 'At least 8 characters')
                    : text('Nhập mật khẩu', 'Enter password')
                }
                minLength={isRegister ? 8 : 1}
                maxLength={72}
                required
                disabled={pending}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                className="grid h-8 w-8 shrink-0 place-items-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                type="button"
                title={
                  showPassword
                    ? text('Ẩn mật khẩu', 'Hide password')
                    : text('Hiện mật khẩu', 'Show password')
                }
                aria-label={
                  showPassword
                    ? text('Ẩn mật khẩu', 'Hide password')
                    : text('Hiện mật khẩu', 'Show password')
                }
                onClick={() => setShowPassword((visible) => !visible)}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} size={17} />
              </button>
            </div>
          </label>

          <button
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-extrabold text-white shadow-md shadow-slate-900/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={pending}
          >
            {pending && !googleLogin.isPending ? <Spinner size={18} /> : <Icon name="lock" size={17} />}
            {isRegister ? text('Tạo tài khoản', 'Create account') : text('Đăng nhập', 'Sign in')}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-bold uppercase text-slate-400">
            {text('hoặc', 'or')}
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className={pending ? 'pointer-events-none opacity-60' : ''}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() =>
              setError(
                text(
                  'Không thể đăng nhập bằng Google. Vui lòng thử lại.',
                  'Google sign-in failed. Please try again.',
                ),
              )
            }
            text={isRegister ? 'signup_with' : 'signin_with'}
            shape="rectangular"
            width="366"
            locale={language}
          />
        </div>

        {error && (
          <div
            className="mt-4 flex animate-rise items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-left text-[13px] font-semibold leading-relaxed text-red-700"
            role="alert"
          >
            <Icon name="x" className="mt-0.5 shrink-0" size={15} />
            {error}
          </div>
        )}
      </section>
    </main>
  );
}
