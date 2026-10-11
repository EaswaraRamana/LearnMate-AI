import { FormEvent, useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  Mail,
  Pencil,
  Shapes,
  Sparkles,
  UserRound
} from 'lucide-react';
import studyTogether from '../assets/study-together.svg';
import { api } from '../services/api.ts';

interface AuthPageProps {
  mode: 'signup' | 'login';
}

export function AuthPage({ mode }: AuthPageProps) {
  const isSignup = mode === 'signup';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!successMessage || mode !== 'signup') return;
    const timeout = window.setTimeout(() => window.location.assign('/'), 1400);
    return () => window.clearTimeout(timeout);
  }, [mode, successMessage]);

  const validateForm = (): string | undefined => {
    if (isSignup && name.trim().length < 2) return 'Please enter your full name.';
    if (isSignup && name.trim().length > 80) return 'Your name must be 80 characters or fewer.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return 'Please enter a valid email address.';
    if (!password) return 'Please enter your password.';
    if (isSignup && password.length < 8) return 'Use at least 8 characters for your password.';
    if (isSignup && password.length > 128) return 'Your password must be 128 characters or fewer.';
    if (isSignup && (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password))) {
      return 'Include an uppercase letter, a lowercase letter, and a number in your password.';
    }
    return undefined;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = isSignup
        ? await api.register({ name: name.trim(), email: email.trim(), password })
        : await api.login({ email: email.trim(), password });

      if (isSignup) {
        setSuccessMessage(result.requiresEmailVerification
          ? 'Your account is ready. Check your email to verify your address.'
          : 'Your account is ready. Taking you to your learning dashboard…');
        if (result.requiresEmailVerification) {
          window.setTimeout(() => window.location.assign('/'), 2200);
        }
      } else if (result.requiresEmailVerification) {
        setSuccessMessage('Please verify your email before signing in.');
      } else {
        window.location.assign('/');
      }
    } catch (error) {
      setErrorMessage(error instanceof TypeError
        ? 'We could not reach LearnMate. Check your connection and try again.'
        : error instanceof Error
        ? error.message
        : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#EEEFFF] px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <BookOpen className="absolute left-[8%] top-[14%] h-9 w-9 -rotate-12 text-[#7657F6]/15" />
        <Clock3 className="absolute right-[11%] top-[16%] h-8 w-8 rotate-12 text-[#7657F6]/15" />
        <Pencil className="absolute bottom-[17%] left-[12%] h-8 w-8 rotate-45 text-[#7657F6]/15" />
        <Shapes className="absolute bottom-[14%] right-[9%] h-9 w-9 text-[#7657F6]/15" />
        <span className="absolute left-[21%] top-[25%] h-3 w-3 rounded-full bg-[#F2A9D0]/35" />
        <span className="absolute bottom-[25%] right-[22%] h-4 w-4 rotate-45 bg-[#F8C75E]/35" />
      </div>

      <section className="relative z-10 grid w-full max-w-[850px] overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-[0_24px_80px_rgba(70,54,130,0.17)] lg:min-h-[570px] lg:grid-cols-[42%_58%]">
        <aside className="relative flex min-h-[205px] flex-col overflow-hidden bg-[#7657F6] px-6 py-6 text-white sm:min-h-[245px] sm:px-9 sm:py-8 lg:min-h-0 lg:px-8 lg:py-9">
          <div className="absolute -right-16 top-20 h-52 w-52 rounded-full border border-white/10" aria-hidden="true" />
          <div className="absolute -right-6 top-32 h-32 w-32 rounded-full border border-white/10" aria-hidden="true" />
          <a href="/" className="relative z-10 inline-flex w-fit items-center gap-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/80">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15"><GraduationCap className="h-5 w-5" /></span>
            <span>
              <span className="block text-sm font-bold leading-tight">LearnMate AI</span>
              <span className="mt-0.5 block text-[10px] text-white/75">Study Online. Learn Online.</span>
            </span>
          </a>

          <div className="relative z-10 mt-7 max-w-sm sm:mt-9 lg:mt-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#6745EA] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white/90">
              <Sparkles className="h-3 w-3" /> PERSONALIZED LEARNING
            </span>
            <h1 className="mt-3 font-serif text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
              Learn Smarter,<br />Grow Further
            </h1>
            <p className="mt-2 max-w-[270px] text-xs leading-5 text-white/80 sm:text-sm">
              Your personal AI-powered learning companion.
            </p>
          </div>

          <img
            src={studyTogether}
            alt="Students learning together with books and study notes"
            className="pointer-events-none absolute bottom-0 right-0 hidden w-[94%] max-w-[370px] lg:block"
          />
          <img
            src={studyTogether}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 right-2 w-40 sm:w-52 lg:hidden"
          />
        </aside>

        <div className="relative bg-white px-6 pb-8 pt-7 sm:px-10 sm:pb-10 sm:pt-9 lg:px-12 lg:py-10">
          <a
            href="/"
            className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-[#77758A] transition-colors hover:bg-[#F7F5FF] hover:text-[#6745EA] focus:outline-none focus:ring-2 focus:ring-[#7657F6] sm:right-8 sm:top-7"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Go to Home
          </a>

          <div className="mx-auto mt-7 max-w-[360px] sm:mt-8 lg:mt-4">
            {successMessage ? (
              <div role="status" aria-live="polite" className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DDF7E8] text-[#278A5B]">
                  <CheckCircle2 className="h-7 w-7" />
                </span>
                <h2 className="mt-5 font-serif text-2xl font-bold text-[#242338]">
                  {isSignup ? 'Welcome to LearnMate!' : 'Check your email'}
                </h2>
                <p className="mt-2 max-w-xs text-sm leading-6 text-[#77758A]">{successMessage}</p>
                <a href="/" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#7657F6] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#6745EA] focus:outline-none focus:ring-2 focus:ring-[#7657F6] focus:ring-offset-2">
                  Continue to LearnMate
                </a>
              </div>
            ) : (
              <>
                <div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0ECFF] text-[#7657F6]">
                    {isSignup ? <Sparkles className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
                  </span>
                  <h2 className="mt-4 font-serif text-2xl font-bold tracking-tight text-[#242338] sm:text-[28px]">
                    {isSignup ? 'Create Account' : 'Welcome Back'}
                  </h2>
                  <p className="mt-1.5 text-xs text-[#77758A] sm:text-sm">
                    {isSignup ? 'Start your personalized learning journey.' : 'Sign in to continue learning.'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                  {isSignup && (
                    <label className="block">
                      <span className="sr-only">Full name</span>
                      <span className="flex items-center gap-3 border-b border-[#E8E5F0] pb-2.5 transition-colors focus-within:border-[#7657F6]">
                        <UserRound className="h-4 w-4 shrink-0 text-[#A7A4B5]" />
                        <input
                          type="text"
                          name="name"
                          autoComplete="name"
                          placeholder="Full name"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          maxLength={80}
                          required
                          disabled={isSubmitting}
                          className="min-w-0 flex-1 bg-transparent text-sm text-[#242338] outline-none placeholder:text-[#A7A4B5] disabled:opacity-60"
                        />
                      </span>
                    </label>
                  )}

                  <label className="block">
                    <span className="sr-only">Email address</span>
                    <span className="flex items-center gap-3 border-b border-[#E8E5F0] pb-2.5 transition-colors focus-within:border-[#7657F6]">
                      <Mail className="h-4 w-4 shrink-0 text-[#A7A4B5]" />
                      <input
                        type="email"
                        name="email"
                        autoComplete="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        maxLength={254}
                        required
                        disabled={isSubmitting}
                        className="min-w-0 flex-1 bg-transparent text-sm text-[#242338] outline-none placeholder:text-[#A7A4B5] disabled:opacity-60"
                      />
                    </span>
                  </label>

                  <label className="block">
                    <span className="sr-only">Password</span>
                    <span className="flex items-center gap-3 border-b border-[#E8E5F0] pb-2.5 transition-colors focus-within:border-[#7657F6]">
                      <LockKeyhole className="h-4 w-4 shrink-0 text-[#A7A4B5]" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        autoComplete={isSignup ? 'new-password' : 'current-password'}
                        placeholder="Password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        maxLength={128}
                        required
                        disabled={isSubmitting}
                        aria-describedby={isSignup ? 'password-requirements' : undefined}
                        className="min-w-0 flex-1 bg-transparent text-sm text-[#242338] outline-none placeholder:text-[#A7A4B5] disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        className="rounded p-1 text-[#A7A4B5] transition-colors hover:text-[#6745EA] focus:outline-none focus:ring-2 focus:ring-[#7657F6]"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </span>
                    {isSignup && (
                      <span id="password-requirements" className="mt-1.5 block text-[10px] leading-4 text-[#9290A1]">
                        At least 8 characters, including uppercase, lowercase, and a number.
                      </span>
                    )}
                  </label>

                  {errorMessage && (
                    <div role="alert" className="rounded-lg border border-[#F2C8D2] bg-[#FFF1F4] px-3 py-2.5 text-xs leading-5 text-[#A73351]">
                      {errorMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#7657F6] px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#6745EA] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#7657F6] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-65"
                  >
                    {isSubmitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />}
                    {isSubmitting ? (isSignup ? 'Creating account…' : 'Signing in…') : (isSignup ? 'Sign Up' : 'Sign In')}
                  </button>
                </form>

                <p className="mt-5 text-center text-xs text-[#77758A]">
                  {isSignup ? 'Already have an account?' : 'New to LearnMate?'}
                  {' '}
                  <a href={isSignup ? '/login' : '/signup/student'} className="font-semibold text-[#6745EA] underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-[#7657F6]">
                    {isSignup ? 'Sign In' : 'Create an account'}
                  </a>
                </p>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
