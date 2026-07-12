import React, { useState, useEffect } from 'react';
import { Project, CreateProjectRequest } from '@/types';
import { cn } from '@/utils/cn';

interface ProjectModalProps {
  isOpen: boolean;
  project?: Project; // If provided, edit mode; else create mode
  onClose: () => void;
  onSave: (data: CreateProjectRequest | Partial<Project>) => Promise<void>;
  isLoading?: boolean;
}

// Common project colors
const COLORS = [
  '#6366f1', // indigo
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#8b5cf6', // violet
];

// Common project icons (emoji)
const ICONS = [
  '📁', '📚', '🎨', '🎯', '🚀', '💡', '🔬', '📊',
  '🎭', '🎵', '🎮', '🏆', '⚡', '🌟', '🎪', '🧠',
];

export function ProjectModal({
  isOpen,
  project,
  onClose,
  onSave,
  isLoading = false,
}: ProjectModalProps) {
  const [formData, setFormData] = useState<CreateProjectRequest>({
    name: '',
    description: '',
    color: '#6366f1',
    icon: '📁',
    systemInstructions: '',
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description,
        color: project.color,
        icon: project.icon,
        systemInstructions: project.systemInstructions,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#6366f1',
        icon: '📁',
        systemInstructions: '',
      });
    }
  }, [project, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Project name is required');
      return;
    }
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Failed to save project');
    }
  };

  if (!isOpen) return null;

  const isEditMode = !!project;
  const title = isEditMode ? 'Edit Project' : 'Create New Project';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 sm:flex sm:items-center sm:justify-center">
      <div className={cn(
        'bg-white shadow-xl max-w-md w-full',
        // Desktop: centered modal
        'sm:rounded-2xl sm:mx-4',
        // Mobile: full-width sheet from bottom
        'fixed bottom-0 left-0 right-0 rounded-t-2xl rounded-b-none',
        'sm:relative sm:rounded-2xl'
      )}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Home Projects"
              maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Optional project description"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon
            </label>
            <div className="grid grid-cols-8 gap-2">
              {ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, icon }))}
                  className={cn(
                    'text-2xl p-2 rounded border-2 transition-colors',
                    formData.icon === icon
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                  disabled={isLoading}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={cn(
                    'w-10 h-10 rounded-full border-2 transition-all',
                    formData.color === color
                      ? 'border-gray-900 scale-110'
                      : 'border-gray-300'
                  )}
                  style={{ backgroundColor: color }}
                  disabled={isLoading}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* System Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              System Instructions
            </label>
            <textarea
              name="systemInstructions"
              value={formData.systemInstructions}
              onChange={handleChange}
              placeholder="Optional: Instructions for Claude when using this project"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              disabled={isLoading}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Project'}
          </button>
        </div>
      </div>
    </div>
  );
}
