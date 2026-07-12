import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface InstructionsEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const VARIABLES = [
  {
    name: 'User Name',
    variable: '{{userName}}',
    description: 'The name of the user asking the question',
  },
  {
    name: 'Project Name',
    variable: '{{projectName}}',
    description: 'The name of the current project',
  },
  {
    name: 'Current Date',
    variable: '{{currentDate}}',
    description: 'Today\'s date in YYYY-MM-DD format',
  },
  {
    name: 'Project Files',
    variable: '{{projectFiles}}',
    description: 'Automatically includes uploaded project knowledge files',
  },
  {
    name: 'Chat History',
    variable: '{{chatHistory}}',
    description: 'Automatically includes recent conversation history',
  },
];

export function InstructionsEditor({
  value,
  onChange,
  placeholder = 'Enter custom instructions for Claude to follow when using this project...',
  disabled = false,
}: InstructionsEditorProps) {
  const [showVariables, setShowVariables] = useState(false);

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('instructions-textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + variable + value.substring(end);
      onChange(newValue);
      
      // Move cursor after inserted variable
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + variable.length;
        textarea.focus();
      }, 0);
    }
  };

  return (
    <div className="space-y-2">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          System Instructions
        </label>
        <button
          type="button"
          onClick={() => setShowVariables(!showVariables)}
          disabled={disabled}
          className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 disabled:opacity-50"
        >
          {showVariables ? (
            <>
              <ChevronUp className="w-3 h-3" />
              Hide Variables
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              Show Variables
            </>
          )}
        </button>
      </div>

      {/* Textarea */}
      <textarea
        id="instructions-textarea"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={4}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
      />

      {/* Variables Helper */}
      {showVariables && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3 space-y-2">
          <p className="text-xs font-medium text-indigo-900">Available Variables:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {VARIABLES.map(({ name, variable, description }) => (
              <button
                key={variable}
                type="button"
                onClick={() => insertVariable(variable)}
                disabled={disabled}
                className="text-left p-2 bg-white border border-indigo-200 rounded hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <code className="text-xs font-semibold text-indigo-700 block">
                  {variable}
                </code>
                <p className="text-xs text-gray-600 mt-0.5">
                  {description}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <p className="text-xs text-gray-500">
        Optional instructions that Claude will follow when using this project. Click "Show Variables" to insert dynamic content.
      </p>
    </div>
  );
}
