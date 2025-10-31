import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Eye, EyeOff } from 'lucide-react'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

/**
 * Markdown editor component with preview mode
 * Supports editing markdown text and previewing rendered markdown
 */
export function MarkdownEditor({
  value,
  onChange,
  onBlur,
  placeholder = 'Add notes...',
  disabled = false,
  className = '',
}: MarkdownEditorProps) {
  const [isPreview, setIsPreview] = useState(false)

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium">Notes</label>
        <button
          type="button"
          onClick={() => setIsPreview(!isPreview)}
          className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors flex items-center gap-1"
          disabled={disabled}
          title={isPreview ? 'Edit mode' : 'Preview mode'}
        >
          {isPreview ? (
            <>
              <EyeOff className="h-4 w-4" />
              <span className="text-xs">Edit</span>
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              <span className="text-xs">Preview</span>
            </>
          )}
        </button>
      </div>

      {/* Editor or Preview */}
      {isPreview ? (
        <div className="min-h-[100px] max-h-[300px] overflow-y-auto p-3 border rounded-md bg-gray-50 prose prose-sm max-w-none">
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground text-sm italic">{placeholder}</p>
          )}
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2 border rounded-md min-h-[100px] font-mono text-sm resize-y"
          rows={8}
        />
      )}
      <p className="text-xs text-muted-foreground mt-1">
        Markdown formatting supported. Click Preview to see rendered output.
      </p>
    </div>
  )
}

