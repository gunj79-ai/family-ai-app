import { useState, useRef, useCallback, KeyboardEvent, ClipboardEvent, ChangeEvent } from 'react';
import { Send, Paperclip, Square, Zap, Mic, Plus, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Button } from '@/components/ui/button';
import { estimateTokens, formatTokens } from '@/utils/tokens';
import { useChatStore } from '@/store/chatStore';
import { apiClient } from '@/api/client';
import { AttachmentPreview, PendingAttachment } from './AttachmentPreview';
import { useToast } from '@/hooks/useToast';
import { toastError } from '@/components/ui/Toast';

interface Props {
  chatId: string;
  onSend: (content: string, attachmentIds: string[]) => Promise<void>;
  disabled?: boolean;
}

export function MessageInput({ chatId, onSend, disabled }: Props) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [pendingAtts, setPendingAtts] = useState<PendingAttachment[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showExtraButtons, setShowExtraButtons] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const { isStreaming } = useChatStore();
  const isMobile = useIsMobile();
  const { success, error } = useToast();

  const isDisabled = disabled || isStreaming || uploading;
  const tokenEst = estimateTokens(text);

  function autoResize() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }

  async function uploadFile(file: File) {
    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      error('File size exceeds 10MB limit');
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await apiClient.post('/attachments/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const preview = file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : undefined;
      setPendingAtts(prev => [...prev, { id: data.id, file, preview }]);
      success(`✓ ${file.name} added`);
    } catch (err: any) {
      console.error('Upload failed:', err);
      error(`Failed to upload ${file.name}`);
    } finally {
      setUploading(false);
    }
  }

  function handleDrag(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        await uploadFile(files[i]);
      }
    }
  }

  async function handleSend() {
    const content = text.trim();
    if (!content || isDisabled) return;
    const ids = pendingAtts.map(a => a.id);
    setText('');
    setPendingAtts([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await onSend(content, ids);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    for (const item of items || []) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) await uploadFile(file);
      }
    }
  }

  function toggleVoice() {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toastError('Voice input not supported in this browser. Try Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(' ');
      setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      textareaRef.current?.focus();
    };

    recognition.onerror = () => {
      setIsListening(false);
      toastError('Voice input failed. Please try again.');
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }

  return (
    <div 
      className={cn(
        'border-t backdrop-blur-sm transition-colors',
        dragActive ? 'bg-blue-50/50 border-blue-200' : 'bg-white/80 border-slate-200'
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <div className="p-4 space-y-3">
        {/* Attachment Preview */}
        <AttachmentPreview
          attachments={pendingAtts}
          onRemove={(id) => setPendingAtts(prev => prev.filter(a => a.id !== id))}
          disabled={isDisabled}
        />

        {/* Drag & Drop Hint */}
        {dragActive && (
          <div className="flex items-center justify-center gap-2 py-6 text-blue-600 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/50">
            <Zap className="w-5 h-5" />
            <span className="text-sm font-medium">Drop files here</span>
          </div>
        )}

        <div className="flex items-end gap-2.5 relative">
          {/* Mobile: Collapsed button menu */}
          {isMobile ? (
            <>
              <button
                onClick={() => setShowExtraButtons(v => !v)}
                disabled={isDisabled}
                className={cn(
                  'flex-shrink-0 p-2.5 rounded-xl transition-all duration-200',
                  'text-slate-500 hover:text-slate-700 hover:bg-slate-100',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  showExtraButtons && 'bg-slate-100 text-slate-700'
                )}
                title="More options"
              >
                {showExtraButtons ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </button>

              {/* Mobile expanded options */}
              {showExtraButtons && (
                <div className="absolute bottom-full left-0 mb-2 flex gap-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-2">
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowExtraButtons(false);
                    }}
                    disabled={isDisabled}
                    className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                    title="Attach file"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      cameraInputRef.current?.click();
                      setShowExtraButtons(false);
                    }}
                    disabled={isDisabled}
                    className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                    title="Take photo"
                  >
                    <span className="text-lg">📷</span>
                  </button>
                  <button
                    onClick={toggleVoice}
                    disabled={isDisabled}
                    className={cn(
                      'p-2 rounded-lg transition-colors disabled:opacity-50',
                      isListening
                        ? 'text-red-500 bg-red-50 dark:bg-red-900/20 animate-pulse'
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                    title={isListening ? 'Stop recording' : 'Voice input'}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Desktop: Full attachment menu */}
              <div className="relative">
                <button
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  disabled={isDisabled}
                  className={cn(
                    'flex-shrink-0 p-2.5 rounded-xl transition-all duration-200',
                    'text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-gray-700',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    showAttachMenu && 'bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300'
                  )}
                  title="Attach file, photo, or camera"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                {/* Attachment Menu */}
                {showAttachMenu && (
                  <div className="absolute bottom-full left-0 mb-3 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-slate-200 dark:border-gray-700 py-2 min-w-48 z-10 backdrop-blur-sm">
                    <button
                      onClick={() => {
                        fileInputRef.current?.click();
                        setShowAttachMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700 text-left font-medium transition-colors"
                    >
                      <Paperclip className="w-4 h-4 text-slate-500 dark:text-gray-400" />
                      <span>Choose file or photo</span>
                    </button>
                    <button
                      onClick={() => {
                        cameraInputRef.current?.click();
                        setShowAttachMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700 text-left font-medium transition-colors"
                    >
                      <span className="text-lg">📷</span>
                      <span>Take a photo</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.txt,.md,.doc,.docx"
            className="hidden"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const f = e.target.files?.[0];
              if (f) uploadFile(f);
              e.target.value = '';
            }}
          />

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const f = e.target.files?.[0];
              if (f) uploadFile(f);
              e.target.value = '';
            }}
          />

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => { setText(e.target.value); autoResize(); }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={isDisabled}
            rows={1}
            placeholder={isStreaming ? '✨ Responding…' : 'Message Eva…'}
            className={cn(
              'w-full resize-none rounded-2xl px-4 py-3 text-sm font-normal',
              'bg-slate-100/80 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 hover:border-slate-300 dark:hover:border-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400',
              'focus:bg-white dark:focus:bg-gray-600 transition-all duration-200',
              'disabled:bg-slate-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed opacity-disabled',
              'placeholder:text-slate-500 dark:placeholder:text-gray-400 dark:text-white'
            )}
            style={{ minHeight: '48px', maxHeight: '200px', fontSize: '16px' }}
          />
          {text && (
            <span className="absolute bottom-3 right-4 text-xs font-medium text-slate-400 dark:text-gray-400 pointer-events-none">
              ~{formatTokens(tokenEst)}
            </span>
          )}
        </div>

        {/* Desktop: Mic button inline */}
        {!isMobile && (
          <button
            onClick={toggleVoice}
            disabled={isDisabled}
            className={cn(
              'flex-shrink-0 p-2.5 rounded-xl transition-colors disabled:opacity-40',
              isListening
                ? 'text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 animate-pulse'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
            title={isListening ? 'Stop recording' : 'Voice input'}
          >
            <Mic className="w-5 h-5" />
          </button>
        )}

        {isStreaming ? (
          <button
            onClick={() => {}}
            className={cn(
              'flex-shrink-0 p-2.5 rounded-xl transition-all duration-200',
              'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            )}
            title="Stop generating"
          >
            <Square className="w-5 h-5 fill-current" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!text.trim() || isDisabled}
            className={cn(
              'flex-shrink-0 p-2.5 rounded-xl font-medium transition-all duration-200',
              !text.trim() || isDisabled
                ? 'text-slate-400 bg-slate-100 cursor-not-allowed'
                : 'text-white bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 active:scale-95'
            )}
            title="Send (Enter)"
          >
            <Send className="w-5 h-5" />
          </button>
        )}
      </div>
      </div>
    </div>
  );
}
