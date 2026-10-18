import { useState } from 'react';
import type { ComponentType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ClipboardList,
  Download,
  Library,
  FileCheck2,
  GraduationCap,
  Lightbulb,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import AIGenerator from './AIGenerator';
import PromptLibrary from './PromptLibrary';
import PdfDownload from './PdfDownload';
import QuestionFix from './QuestionFix';
import ManageExams from './ManageExams';
import ManageTests from './ManageTests';
import DailyChallengeAdmin from './DailyChallenge';
import ManageStudents from './ManageStudents';
import AdminResults from './AdminResults';
import QuestionBank from './QuestionBank';

interface AdminPanelProps {
  onLogout: () => void;
}

type TabKey = 'ai' | 'prompts' | 'pdf' | 'fix' | 'bank' | 'exams' | 'tests' | 'dailyChallenge' | 'students' | 'results';
type Section = 'Content' | 'Management';

interface TabDef {
  key: TabKey;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  Component: ComponentType;
  section: Section;
}

const TABS: TabDef[] = [
  { key: 'ai', label: 'Extractor', description: 'Extract questions from source material with AI.', icon: Lightbulb, Component: AIGenerator, section: 'Content' },
  { key: 'prompts', label: 'Prompts', description: 'Maintain reusable prompt templates.', icon: Sparkles, Component: PromptLibrary, section: 'Content' },
  { key: 'pdf', label: 'PDF Download', description: 'Generate printable question papers and answer keys.', icon: Download, Component: PdfDownload, section: 'Content' },
  { key: 'fix', label: 'Question Fix', description: 'Review and correct flagged questions.', icon: Wrench, Component: QuestionFix, section: 'Content' },
  { key: 'bank', label: 'Question Bank', description: 'Browse and organise the full question library.', icon: Library, Component: QuestionBank, section: 'Content' },
  { key: 'exams', label: 'Manage Exams', description: 'Create and configure exams.', icon: GraduationCap, Component: ManageExams, section: 'Management' },
  { key: 'tests', label: 'Manage Tests', description: 'Schedule and publish tests for students.', icon: ClipboardList, Component: ManageTests, section: 'Management' },
  { key: 'dailyChallenge', label: 'Daily Challenge', description: 'Set up the daily challenge questions.', icon: Trophy, Component: DailyChallengeAdmin, section: 'Management' },
  { key: 'students', label: 'Manage Students', description: 'Manage student accounts and access.', icon: Users, Component: ManageStudents, section: 'Management' },
  { key: 'results', label: 'Results', description: 'Review student performance and attempts.', icon: FileCheck2, Component: AdminResults, section: 'Management' },
];

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'Content', label: 'Content Tools' },
  { key: 'Management', label: 'Management' },
];

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('ai');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const active = TABS.find((t) => t.key === activeTab) ?? TABS[0];
  const ActiveComponent = active.Component;

  const renderSidebar = (compact: boolean) => (
    <>
      <div className={['flex h-16 shrink-0 items-center gap-3 border-b border-white/10', compact ? 'justify-center px-2' : 'px-5'].join(' ')}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-sky/40">
          <img src="/C3AppLogo-128.png" alt="C³" className="size-6 object-contain" />
        </span>
        {!compact && (
          <div className="min-w-0 flex-1 leading-tight">
            <h2 className="font-heading truncate text-[15px] font-semibold text-white">C³ Institute</h2>
            <p className="truncate text-xs text-sky/70">Admin Console</p>
          </div>
        )}
      </div>

      <nav aria-label="Admin navigation" className="no-scrollbar flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5">
        {SECTIONS.map((section, index) => (
          <div key={section.key} className="flex flex-col gap-1">
            {compact ? (
              index > 0 && <div className="mx-3 mb-2 border-t border-white/10" />
            ) : (
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-periwinkle">{section.label}</p>
            )}
            {TABS.filter((tab) => tab.section === section.key).map(({ key, label, icon: Icon }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  title={compact ? label : undefined}
                  aria-label={compact ? label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => {
                    setActiveTab(key);
                    setMobileOpen(false);
                  }}
                  className={[
                    'group relative flex items-center gap-3 rounded-lg py-2 text-left text-[13.5px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-periwinkle',
                    compact ? 'justify-center px-2' : 'px-3',
                    isActive ? 'bg-royal text-white shadow-soft-sm' : 'text-sky/80 hover:bg-white/10 hover:text-white',
                  ].join(' ')}
                >
                  {isActive && !compact && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-sky" />}
                  <span
                    className={[
                      'flex size-7 shrink-0 items-center justify-center rounded-md transition-colors',
                      isActive ? 'bg-white/15 text-white' : 'text-periwinkle group-hover:text-sky',
                    ].join(' ')}
                  >
                    <Icon className="size-[17px]" />
                  </span>
                  {!compact && <span className="truncate">{label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        {compact ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-full bg-white/10 text-sky ring-1 ring-white/15" title="Administrator">
              <ShieldCheck className="size-4" />
            </div>
            <button
              type="button"
              onClick={onLogout}
              title="Sign out"
              aria-label="Sign out"
              className="flex size-9 items-center justify-center rounded-lg text-sky/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-[18px]" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sky ring-1 ring-white/15">
              <ShieldCheck className="size-4" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-sm font-semibold text-white">Administrator</span>
              <span className="truncate text-xs text-sky/70">Full access</span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              title="Sign out"
              aria-label="Sign out"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-sky/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-[17px]" />
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="admin-theme flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      <aside
        className={[
          'hidden shrink-0 flex-col bg-navy transition-[width] duration-200 md:flex',
          collapsed ? 'w-[72px]' : 'w-64',
        ].join(' ')}
      >
        {renderSidebar(collapsed)}
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-navy/60 md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-navy shadow-2xl md:hidden"
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="absolute right-3 top-4 rounded-lg p-1.5 text-sky/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="size-5" />
              </button>
              {renderSidebar(false)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 md:hidden"
          >
            <Menu className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 md:block"
          >
            {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </button>
          <div className="mx-1 hidden h-6 w-px bg-slate-200 md:block" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-xs text-slate-500">
              {active.section === 'Content' ? 'Content Tools' : 'Management'} <span className="mx-1 text-slate-300">/</span>
              <span className="font-medium text-slate-700">{active.label}</span>
            </p>
            <p className="hidden truncate text-xs text-slate-400 sm:block">{active.description}</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-14">
          <ActiveComponent />
        </main>
      </div>
    </div>
  );
}
