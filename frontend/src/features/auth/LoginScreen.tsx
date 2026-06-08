import { useState, type FormEvent } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import Icon from '../../components/Icon';
import Hanzi from '../../components/Hanzi';
import { parseZh } from '../../lib/zh';
import { useGoogleLogin } from '../../hooks/useGoogleLogin';
import { useMockLogin } from '../../hooks/useMockLogin';

const BRAND_ZH = parseZh('学|xué|2 中|zhōng|1 文|wén|2');
const SIGN_IN_ERROR = "Couldn't sign in with Google. Please try again.";
const MOCK_SIGN_IN_ERROR = 'Invalid mock email or password.';
const MOCK_TEST_EMAIL = 'mocktest@example.com';
const MOCK_TEST_PASSWORD = 'mocktest123';

export default function LoginScreen() {
  const googleLogin = useGoogleLogin();
  const mockLogin = useMockLogin();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(MOCK_TEST_EMAIL);
  const [password, setPassword] = useState(MOCK_TEST_PASSWORD);
  const isSigningIn = googleLogin.isPending || mockLogin.isPending;

  function handleMockSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    mockLogin.mutate(
      { email, password },
      { onError: () => setError(MOCK_SIGN_IN_ERROR) },
    );
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden p-6">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(1100px 540px at 14% -10%, #eef2ff 0%, transparent 55%), radial-gradient(900px 520px at 100% 110%, #e0e7ff 0%, transparent 55%), #f1f5f9',
        }}
      />
      <div className="w-full max-w-[430px] animate-pop rounded-[26px] border border-slate-200 bg-white px-9 pb-7 pt-10 text-center shadow-2xl">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-600 text-white shadow-accent">
          <Icon name="chat" size={26} />
        </div>
        <div className="mt-4 text-3xl">
          <Hanzi tokens={BRAND_ZH} />
        </div>
        <h1 className="mt-1.5 text-[27px] font-extrabold tracking-tight text-slate-900">Chinese Learning</h1>
        <p className="mx-auto mb-6 mt-2 max-w-sm text-[14.5px] leading-relaxed text-slate-500">
          Practice Mandarin by talking, reading aloud, translating, and writing — with instant
          feedback from your AI tutor.
        </p>

        <form className="space-y-3 text-left" onSubmit={handleMockSubmit} aria-busy={mockLogin.isPending}>
          <label className="block">
            <span className="sr-only">Email</span>
            <div className="flex h-12 items-center gap-2.5 rounded-full border border-slate-200 bg-white px-4 text-slate-500 shadow-sm transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100">
              <Icon name="user" size={18} />
              <input
                className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
                type="email"
                autoComplete="email"
                value={email}
                placeholder="Email"
                disabled={isSigningIn}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </label>

          <label className="block">
            <span className="sr-only">Password</span>
            <div className="flex h-12 items-center gap-2.5 rounded-full border border-slate-200 bg-white px-4 text-slate-500 shadow-sm transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100">
              <Icon name="lock" size={18} />
              <input
                className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
                type="password"
                autoComplete="current-password"
                value={password}
                placeholder="Password"
                disabled={isSigningIn}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          </label>

          <button
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 text-sm font-extrabold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSigningIn}
          >
            <Icon name="lock" size={17} />
            Đăng nhập mock test
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-[11px] font-extrabold uppercase text-slate-300">
          <span className="h-px flex-1 bg-slate-200" />
          <span>or</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="flex justify-center" aria-busy={googleLogin.isPending}>
          <GoogleLogin
            onSuccess={(credentialResponse) => {
              setError(null);
              const idToken = credentialResponse.credential;
              if (!idToken) {
                setError(SIGN_IN_ERROR);
                return;
              }
              googleLogin.mutate(idToken, { onError: () => setError(SIGN_IN_ERROR) });
            }}
            onError={() => setError(SIGN_IN_ERROR)}
            theme="outline"
            shape="pill"
            width="340"
          />
        </div>

        {error && (
          <div className="mt-3.5 flex animate-rise items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] font-semibold text-red-600">
            <Icon name="x" size={15} />
            {error}
          </div>
        )}

        <p className="mt-3.5 text-xs leading-relaxed text-slate-400">
          Your data stays private to you.
        </p>
      </div>
    </div>
  );
}
