import React from 'react';
import { X, File, Image, FileText } from 'lucide-react';

export interface PendingAttachment {
  id: string;
  file: File;
  preview?: string; // For images
}

interface AttachmentPreviewProps {
  attachments: PendingAttachment[];
  onRemove: (id: string) => void;
  disabled?: boolean;
}

export function AttachmentPreview({
  attachments,
  onRemove,
  disabled = false,
}: AttachmentPreviewProps) {
  if (attachments.length === 0) return null;

  const getFileIcon = (file: File) => {
    const mimeType = file.type;
    if (mimeType.startsWith('image/')) {
      return <Image className="w-4 h-4" />;
    }
    if (mimeType.includes('pdf') || mimeType.includes('document')) {
      return <FileText className="w-4 h-4" />;
    }
    return <File className="w-4 h-4" />;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Check if all are images for grid layout
  const allImages = attachments.every(a => a.file.type.startsWith('image/'));

  return (
    <div className="rounded-2xl p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 border border-slate-200/50 backdrop-blur-sm">
      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
        📎 Attachments ({attachments.length})
      </p>
      
      {/* Image Grid Layout */}
      {allImages && attachments.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {attachments.map(attachment => (
            <div
              key={attachment.id}
              className="relative group rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white"
            >
              {attachment.preview && (
                <>
                  <img
                    src={attachment.preview}
                    alt={attachment.file.name}
                    className="w-full h-24 object-cover"
                  />
                  <button
                    onClick={() => onRemove(attachment.id)}
                    disabled={disabled}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 shadow-lg hover:bg-red-600"
                    title="Remove"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* List Layout for mixed types */}
      {!allImages && (
        <div className="space-y-2">
          {attachments.map(attachment => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200/50 group hover:border-slate-300 hover:shadow-sm transition-all"
            >
              {/* Thumbnail for images */}
              {attachment.preview && (
                <img
                  src={attachment.preview}
                  alt={attachment.file.name}
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-slate-200"
                />
              )}

              {/* File Icon */}
              {!attachment.preview && (
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center flex-shrink-0 text-slate-600">
                  {getFileIcon(attachment.file)}
                </div>
              )}

              {/* File Info */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {attachment.file.name}
                </p>
                <p className="text-xs text-slate-500">
                  {formatBytes(attachment.file.size)}
                </p>
              </div>

              {/* Remove Button */}
              <button
                onClick={() => onRemove(attachment.id)}
                disabled={disabled}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                title="Remove attachment"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
