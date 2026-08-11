import { useState } from 'react';
import type { ComponentType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ClipboardList,
  Crown,
  Download,
  FileCheck2,
  Lightbulb,
  LogOut,
  Menu,
  Tags,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import AIGenerator from './AIGenerator';
import PdfDownload from './PdfDownload';
import QuestionFix from './QuestionFix';
import UnitswiseName from './UnitswiseName';
import ManageTests from './ManageTests';
import ManageStudents from './ManageStudents';
import AdminResults from './AdminResults';

interface AdminPanelProps {
  onLogout: () => void;
}

type TabKey = 'ai' | 'pdf' | 'fix' | 'unitswise' | 'tests' | 'students' | 'results';

const TABS: { key: TabKey; label: string; icon: ComponentType<{ className?: string }>; Component: ComponentType }[] = [
  { key: 'ai', label: 'Extractor', icon: Lightbulb, Component: AIGenerator },
  { key: 'pdf', label: 'PDF Download', icon: Download, Component: PdfDownload },
  { key: 'fix', label: 'Question Fix', icon: Wrench, Component: QuestionFix },
  { key: 'unitswise', label: 'Unitswise Name', icon: Tags, Component: UnitswiseName },
  { key: 'tests', label: 'Manage Tests', icon: ClipboardList, Component: ManageTests },
  { key: 'students', label: 'Manage Students', icon: Users, Component: ManageStudents },
  { key: 'results', label: 'Results', icon: FileCheck2, Component: AdminResults },
];

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('ai');
  const [mobileOpen, setMobileOpen] = useState(false);

  const ActiveComponent = TABS.find((t) => t.key === activeTab)?.Component ?? AIGenerator;

  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 px-5 py-6">
        <img src="/C3AppLogo.png" alt="C³" className="h-8 w-8 rounded-lg object-contain" />
        <h2 className="text-base font-bold text-white">Admin Portal</h2>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setActiveTab(key);
              setMobileOpen(false);
            }}
            className={[
              'flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm font-medium transition-colors',
              activeTab === key
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
            ].join(' ')}
          >
            <Icon className="size-[18px] shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <div className="mb-3 flex items-center gap-3 rounded-lg px-2 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-full bg-white/10 text-amber-300">
            <Crown className="size-[15px]" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-white">Administrator</span>
            <span className="text-xs text-slate-400">System Admin</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="size-[18px]" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 shrink-0 flex-col bg-gradient-to-b from-slate-900 to-slate-950 md:flex">
        {sidebarContent}
      </aside>

      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <img src="/C3AppLogo.png" alt="C³" className="h-7 w-7 rounded-md object-contain" />
          <span className="text-sm font-bold text-slate-900">Admin Portal</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
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
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-gradient-to-b from-slate-900 to-slate-950 md:hidden"
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <X className="size-5" />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-x-hidden px-4 pb-10 pt-20 sm:px-6 md:pt-8 lg:px-10">
        <ActiveComponent />
      </main>
    </div>
  );
}
