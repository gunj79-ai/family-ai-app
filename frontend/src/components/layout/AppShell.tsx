import { motion } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/utils/cn';
import { Sidebar } from './Sidebar';
import { PanelLeftClose, PanelLeft } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export function AppShell({ children }: Props) {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();
  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-900">
      {/* Mobile: overlay backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.div 
        className={cn(
          'flex-shrink-0 z-30',
          // Mobile: fixed overlay drawer
          isMobile && 'fixed inset-y-0 left-0',
          // Mobile: slide in/out
          isMobile && (sidebarOpen ? 'translate-x-0' : '-translate-x-full'),
        )}
        style={isMobile ? { width: 'var(--sidebar-width)' } : undefined}
        animate={!isMobile ? { width: sidebarOpen ? 280 : 0 } : {}}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      >
        <div style={{ width: 'var(--sidebar-width)', height: '100%' }}>
          <Sidebar />
        </div>
      </motion.div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="h-14 border-b border-gray-100 dark:border-gray-800 flex items-center px-4 gap-3 flex-shrink-0 bg-white dark:bg-gray-900">
          <button
            onClick={toggleSidebar}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen && !isMobile
              ? <PanelLeftClose className="w-5 h-5" />
              : <PanelLeft className="w-5 h-5" />
            }
          </button>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {children}
        </div>
      </div>
    </div>
  );
}
