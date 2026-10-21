import { lazy, Suspense, useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, m } from 'framer-motion';
import {
  ChevronRight,
  FileCheck2,
  GraduationCap,
  ClipboardList,
  Lightbulb,
  BookCheck,
  Library,
  LogOut,
  Menu,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import api from '../api';
import { AppFooter, LoadingState } from '../components/ui';

// Each tab is downloaded the first time it is opened.
const AIGenerator = lazy(() => import('./AIGenerator'));
const PromptLibrary = lazy(() => import('./PromptLibrary'));
const QuestionFix = lazy(() => import('./QuestionFix'));
const ManageExams = lazy(() => import('./ManageExams'));
const ManageTests = lazy(() => import('./ManageTests'));
const DailyChallengeAdmin = lazy(() => import('./DailyChallenge'));
const ManageStudents = lazy(() => import('./ManageStudents'));
const AdminResults = lazy(() => import('./AdminResults'));
const QuestionBank = lazy(() => import('./QuestionBank'));
const PracticeQuestions = lazy(() => import('./PracticeQuestions'));
const Feedback = lazy(() => import('./Feedback'));

interface AdminPanelProps {
  onLogout: () => void;
}

type Section = 'Content tools' | 'Management';

interface Tab {
  /** URL segment: /admin/<slug>. */
  slug: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  Component: ComponentType;
  section: Section;
}

const TABS: Tab[] = [
  { slug: 'exams', label: 'Manage Exams', icon: GraduationCap, Component: ManageExams, section: 'Management' },
  { slug: 'tests', label: 'Manage Tests', icon: ClipboardList, Component: ManageTests, section: 'Management' },
  { slug: 'daily-challenge', label: 'Daily Challenge', icon: Trophy, Component: DailyChallengeAdmin, section: 'Management' },
  { slug: 'question-bank', label: 'Question Bank', icon: Library, Component: QuestionBank, section: 'Management' },
  { slug: 'practice-questions', label: 'Practice Questions', icon: BookCheck, Component: PracticeQuestions, section: 'Management' },
  { slug: 'students', label: 'Manage Students', icon: Users, Component: ManageStudents, section: 'Management' },
  { slug: 'results', label: 'Results', icon: FileCheck2, Component: AdminResults, section: 'Management' },
  { slug: 'feedback', label: 'Feedback', icon: MessageSquare, Component: Feedback, section: 'Management' },
  { slug: 'extractor', label: 'Extractor', icon: Lightbulb, Component: AIGenerator, section: 'Content tools' },
  { slug: 'prompts', label: 'Prompts', icon: Sparkles, Component: PromptLibrary, section: 'Content tools' },
  { slug: 'question-fix', label: 'Question Fix', icon: Wrench, Component: QuestionFix, section: 'Content tools' },
];

const SECTIONS: Section[] = ['Management', 'Content tools'];

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Feedback still waiting to be looked at, shown next to the Feedback tab.
  const [openFeedback, setOpenFeedback] = useState(0);

  // The active page lives in the URL so refresh and the back button keep it.
  const slug = location.pathname.split('/')[2] || '';
  const activeTab = TABS.find((t) => t.slug === slug) ?? TABS[0];
  const ActiveComponent = activeTab.Component;

  useEffect(() => {
    if (slug !== activeTab.slug) navigate(`/admin/${activeTab.slug}`, { replace: true });
  }, [slug, activeTab.slug, navigate]);

  // Refreshed whenever the admin moves between tabs, so it is up to date after reviewing messages.
  useEffect(() => {
    let cancelled = false;
    api
      .get('/api/feedback', { params: { pageSize: 1 } })
      .then((response) => !cancelled && setOpenFeedback(response.data?.counts?.open ?? 0))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    document.title = `${activeTab.label} · C³ Institute Admin`;
  }, [activeTab.label]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen]);

  const goTo = (tab: Tab) => {
    navigate(`/admin/${tab.slug}`);
    setMobileOpen(false);
  };

  const brand = (
    <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-white/10 px-4">
      <span className="flex size-8 items-center justify-center rounded-md bg-white">
        <img src="/C3AppLogo-128.png" alt="" className="size-6 object-contain" />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate font-heading text-sm font-bold text-white">C³ Institute</p>
        <p className="truncate text-[11px] text-slate-400">Admin console</p>
      </div>
    </div>
  );

  const nav = (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-2.5 py-4" aria-label="Admin">
      {SECTIONS.map((section) => (
        <div key={section}>
          <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{section}</p>
          <ul className="flex flex-col gap-px">
            {TABS.filter((tab) => tab.section === section).map((tab) => {
              const isActive = tab.slug === activeTab.slug;
              const Icon = tab.icon;
              return (
                <li key={tab.slug}>
                  <button
                    type="button"
                    onClick={() => goTo(tab)}
                    aria-current={isActive ? 'page' : undefined}
                    className={[
                      'group relative flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] font-medium transition-colors',
                      isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
                    ].join(' ')}
                  >
                    {isActive && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand-400" aria-hidden="true" />}
                    <Icon
                      className={[
                        'size-4 shrink-0',
                        isActive ? 'text-brand-300' : 'text-slate-500 group-hover:text-slate-300',
                      ].join(' ')}
                    />
                    <span className="truncate">{tab.label}</span>
                    {tab.slug === 'feedback' && openFeedback > 0 && (
                      <span className="ml-auto rounded-full bg-brand-600 px-1.5 text-[10px] font-semibold leading-4 text-white" aria-label={`${openFeedback} open`}>
                        {openFeedback > 99 ? '99+' : openFeedback}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const account = (
    <div className="shrink-0 border-t border-white/10 p-2.5">
      <div className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
          <ShieldCheck className="size-4" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13px] font-semibold text-white">Administrator</p>
          <p className="truncate text-[11px] text-slate-400">Full access</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          aria-label="Sign out"
          title="Sign out"
          className="rounded-md p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="size-[18px]" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f5f7]">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col bg-ink-900 lg:flex">
        {brand}
        {nav}
        {account}
      </aside>

      {/* Mobile / tablet drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] lg:hidden"
            />
            <m.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className="fixed inset-y-0 left-0 z-50 flex w-[min(16rem,85vw)] flex-col bg-ink-900 shadow-soft-lg lg:hidden"
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="absolute right-2.5 top-3 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="size-5" />
              </button>
              {brand}
              {nav}
              {account}
            </m.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="-ml-1.5 rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <img src="/C3AppLogo-128.png" alt="" className="size-7 rounded-md object-contain lg:hidden" />
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
            <span className="hidden text-slate-500 sm:inline">Admin</span>
            <ChevronRight className="hidden size-3.5 shrink-0 text-slate-300 sm:block" />
            <span className="hidden text-slate-500 sm:inline">{activeTab.section}</span>
            <ChevronRight className="hidden size-3.5 shrink-0 text-slate-300 sm:block" />
            <span className="truncate font-medium text-slate-900">{activeTab.label}</span>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-ink-900 text-[11px] font-bold text-white">A</span>
          </div>
        </header>

        <main id="main" className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden px-4 pt-6 sm:px-6 lg:px-8 lg:pt-7">
          <div className="flex-1 pb-8">
            <Suspense fallback={<LoadingState message={`Loading ${activeTab.label}...`} />}>
              <ActiveComponent key={activeTab.slug} />
            </Suspense>
          </div>
          <AppFooter area="Admin console" className="-mx-4 sm:-mx-6 lg:-mx-8" />
        </main>
      </div>
    </div>
  );
}
