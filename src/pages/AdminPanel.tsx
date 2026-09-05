import { useState } from 'react';
import type { ComponentType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ClipboardList,
  Crown,
  Download,
  FileCheck2,
  GraduationCap,
  Lightbulb,
  LogOut,
  Menu,
  Trophy,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import AIGenerator from './AIGenerator';
import PdfDownload from './PdfDownload';
import QuestionFix from './QuestionFix';
import ManageExams from './ManageExams';
import ManageTests from './ManageTests';
import DailyChallengeAdmin from './DailyChallenge';
import ManageStudents from './ManageStudents';
import AdminResults from './AdminResults';

interface AdminPanelProps {
  onLogout: () => void;
}

type TabKey = 'ai' | 'pdf' | 'fix' | 'exams' | 'tests' | 'dailyChallenge' | 'students' | 'results';
type Section = 'Content' | 'Management';

const TABS: { key: TabKey; label: string; icon: ComponentType<{ className?: string }>; Component: ComponentType; section: Section }[] = [
  { key: 'ai', label: 'Extractor', icon: Lightbulb, Component: AIGenerator, section: 'Content' },
  { key: 'pdf', label: 'PDF Download', icon: Download, Component: PdfDownload, section: 'Content' },
  { key: 'fix', label: 'Question Fix', icon: Wrench, Component: QuestionFix, section: 'Content' },
  { key: 'exams', label: 'Manage Exams', icon: GraduationCap, Component: ManageExams, section: 'Management' },
  { key: 'tests', label: 'Manage Tests', icon: ClipboardList, Component: ManageTests, section: 'Management' },
  { key: 'dailyChallenge', label: 'Daily Challenge', icon: Trophy, Component: DailyChallengeAdmin, section: 'Management' },
  { key: 'students', label: 'Manage Students', icon: Users, Component: ManageStudents, section: 'Management' },
  { key: 'results', label: 'Results', icon: FileCheck2, Component: AdminResults, section: 'Management' },
];

const SECTIONS: Section[] = ['Content', 'Management'];

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('ai');
  const [mobileOpen, setMobileOpen] = useState(false);

  const ActiveComponent = TABS.find((t) => t.key === activeTab)?.Component ?? AIGenerator;

  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <img src="/C3AppLogo.png" alt="C³" className="h-9 w-9 rounded-lg object-contain ring-1 ring-white/10" />
        <div className="min-w-0 leading-tight">
          <h2 className="font-heading truncate text-base font-bold text-white">Admin Portal</h2>
          <p className="truncate text-[11px] text-slate-500">C³ Institute</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-4 px-3 py-4">
        {SECTIONS.map((section) => (
          <div key={section} className="flex flex-col gap-1">
            <p className="px-3.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {section === 'Content' ? 'Content Tools' : 'Management'}
            </p>
            {TABS.filter((tab) => tab.section === section).map(({ key, label, icon: Icon }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setActiveTab(key);
                    setMobileOpen(false);
                  }}
                  className={[
                    'group relative flex items-center gap-3 rounded-lg py-2.5 pl-3.5 pr-3 text-left text-sm font-medium transition-colors',
                    isActive ? 'bg-brand-500/15 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'absolute inset-y-1 left-0 w-[3px] rounded-full bg-brand-400 transition-opacity',
                      isActive ? 'opacity-100' : 'opacity-0',
                    ].join(' ')}
                  />
                  <Icon className={['size-[18px] shrink-0', isActive ? 'text-brand-300' : 'text-slate-500 group-hover:text-slate-300'].join(' ')} />
                  {label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <div className="mb-3 flex items-center gap-3 rounded-lg px-2 py-1.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-amber-300">
            <Crown className="size-[15px]" />
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold text-white">Administrator</span>
            <span className="truncate text-xs text-slate-500">System Admin</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-danger-500/10 hover:text-danger-300"
        >
          <LogOut className="size-[18px]" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto bg-gradient-to-b from-slate-900 to-slate-950 shadow-[4px_0_24px_-8px_rgba(0,0,0,0.25)] md:flex">
        {sidebarContent}
      </aside>

      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-soft-sm md:hidden">
        <div className="flex items-center gap-2">
          <img src="/C3AppLogo.png" alt="C³" className="h-7 w-7 rounded-md object-contain" />
          <span className="font-heading text-sm font-bold text-slate-900">Admin Portal</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
        >
          <Menu className="size-5" />
        </button>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/50 md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-y-auto bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl md:hidden"
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X className="size-5" />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-10 pt-20 sm:px-6 md:pt-8 lg:px-10 xl:px-12 2xl:px-16">
        <ActiveComponent />
      </main>
    </div>
  );
}
