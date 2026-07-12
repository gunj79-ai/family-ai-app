import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from './button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (running as standalone PWA)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    // Detect iOS — Safari on iOS doesn't fire beforeinstallprompt
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(window as { MSStream?: unknown }).MSStream;
    setIsIos(ios);

    // Chrome/Edge/Android: capture install event
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Don't show if already installed, dismissed, or no event/ios prompt needed
  if (isStandalone || dismissed) return null;
  if (!installEvent && !isIos) return null;

  async function handleInstall() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted') setInstallEvent(null);
    setDismissed(true);
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-40">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold">F</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Install FamilyAI
            </p>
            {isIos ? (
              <p className="text-xs text-gray-500 mt-0.5">
                Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5">
                Install for faster access, works like a native app
              </p>
            )}
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {!isIos && (
          <Button
            onClick={handleInstall}
            size="sm"
            className="w-full mt-3"
          >
            <Download className="w-4 h-4" />
            Install App
          </Button>
        )}
      </div>
    </div>
  );
}
