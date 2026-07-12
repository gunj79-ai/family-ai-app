import React, { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/api/projects';
import { relativeTime } from '@/utils/dates';
import { Trash2, Upload, File, FileText, Image } from 'lucide-react';

interface ProjectFilesProps {
  projectId: string;
}

export function ProjectFiles({ projectId }: ProjectFilesProps) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // Fetch project files
  const { data: files = [], isLoading } = useQuery({
    queryKey: ['project-files', projectId],
    queryFn: () => projectsApi.listFiles(projectId),
  });

  // Upload file mutation
  const uploadFile = useMutation({
    mutationFn: async (file: File) => {
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
      try {
        // Simulate progress
        for (let i = 0; i <= 100; i += 20) {
          setUploadProgress(prev => ({ ...prev, [file.name]: i }));
          await new Promise(r => setTimeout(r, 100));
        }
        const result = await projectsApi.uploadFile(projectId, file);
        return result;
      } finally {
        setUploadProgress(prev => {
          const newState = { ...prev };
          delete newState[file.name];
          return newState;
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-files', projectId] });
    },
    onError: (error: any) => {
      console.error('Upload failed:', error);
      alert('Failed to upload file');
    },
  });

  // Delete file mutation
  const deleteFile = useMutation({
    mutationFn: (fileId: string) => projectsApi.deleteFile(projectId, fileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-files', projectId] });
    },
    onError: (error: any) => {
      console.error('Delete failed:', error);
      alert('Failed to delete file');
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('File size must be under 10MB');
        return;
      }
      uploadFile.mutate(selectedFile);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (mimeType.includes('pdf') || mimeType.includes('document'))
      return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          disabled={uploadFile.isPending}
          className="hidden"
          accept=".pdf,.txt,.md,.doc,.docx,.png,.jpg,.jpeg"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadFile.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="w-4 h-4" />
          {uploadFile.isPending ? 'Uploading...' : 'Upload File'}
        </button>
        <p className="text-xs text-gray-500 mt-2">PDF, TXT, MD, DOC, Images (Max 10MB)</p>
      </div>

      {/* Upload Progress */}
      {Object.entries(uploadProgress).map(([filename, progress]) => (
        <div key={filename} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-700">{filename}</span>
            <span className="text-gray-500">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ))}

      {/* Files List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading files...</div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No files uploaded yet</div>
        ) : (
          <div className="divide-y border border-gray-200 rounded-lg overflow-hidden">
            {files.map(file => (
              <div
                key={file.id}
                className="p-3 hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-gray-400">{getFileIcon(file.mimeType)}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.originalName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatBytes(file.fileSize)} • {relativeTime(file.createdAt)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteFile.mutate(file.id)}
                  disabled={deleteFile.isPending}
                  className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
