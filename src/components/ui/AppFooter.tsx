import { ArrowUpRight, LifeBuoy } from 'lucide-react';

const DEVELOPER = { name: 'Manikandan', url: 'https://www.manidevfolio.site/' };

interface AppFooterProps {
  /** What this part of the site is (e.g. "Admin console"), shown in the bottom bar. */
  area: string;
  /** Support line shown on the right of the top row; hidden when omitted. */
  help?: string;
  /** Classes for the inner container; defaults to the standard page width. */
  containerClassName?: string;
  className?: string;
}

/** Compact dark site footer: brand, a short description and support, with a copyright and developer-credit bar. */
export default function AppFooter({
  area,
  help,
  containerClassName = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 2xl:max-w-7xl',
  className = '',
}: AppFooterProps) {
  const year = new Date().getFullYear();

  return (
    // shrink-0: in a fixed-height scrolling column (the admin panel) the browser would otherwise squash
    // the footer to make room for long pages, since overflow-hidden lets it shrink below its content.
    <footer className={['relative shrink-0 overflow-hidden bg-ink-900 text-slate-300', className].join(' ')}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 size-80 rounded-full bg-brand-600/20 blur-3xl" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-500/60 to-transparent" />

      <div className={['relative', containerClassName].join(' ')}>
        <div className="flex flex-col gap-3 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white">
              <img src="/C3AppLogo-128.png" alt="" className="size-6 object-contain" />
            </span>
            <div className="leading-tight">
              <p className="font-heading text-sm font-bold text-white">C³ Institute</p>
              <p className="text-[11px] text-slate-400">Educational Platform</p>
              <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-400">
                Mock tests, daily challenges and results to help you prepare with confidence.
              </p>
            </div>
          </div>

          {help && (
            <p className="flex items-start gap-1.5 text-xs text-slate-400 lg:max-w-sm">
              <LifeBuoy className="mt-px size-3.5 shrink-0 text-brand-300" />
              <span>{help}</span>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 py-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} C³ Institute. All rights reserved. <span className="text-slate-600">·</span> {area}
          </p>
          <p className="flex items-center gap-1.5">
            Developed by
            {DEVELOPER.url ? (
              <a
                href={DEVELOPER.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-semibold text-white transition-colors hover:border-brand-400/50 hover:bg-brand-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                {DEVELOPER.name}
                <ArrowUpRight className="size-3.5 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-300" />
              </a>
            ) : (
              <span className="font-semibold text-white">{DEVELOPER.name}</span>
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}
