import React, { useRef, useMemo } from 'react';
import ReactQuill from 'react-quill';

export default function RichTextEditor({ value, onChange, placeholder = 'Write your post content here...' }) {
  const quillRef = useRef(null);

  const imageHandler = async () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;

      // Import base44 dynamically to avoid circular issues
      const { base44 } = await import('@/api/base44Client');
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const quill = quillRef.current?.getEditor();
      if (quill && file_url) {
        const range = quill.getSelection(true);
        quill.insertEmbed(range.index, 'image', file_url);
        quill.setSelection(range.index + 1);
      }
    };
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'code-block'],
        ['link', 'image'],
        [{ color: [] }, { background: [] }],
        ['clean'],
      ],
      handlers: { image: imageHandler },
    },
    clipboard: { matchVisual: false },
  }), []);

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'blockquote', 'code-block',
    'link', 'image', 'color', 'background',
  ];

  return (
    <div className="blog-editor">
      <style>{`
        .blog-editor .ql-container {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 15px;
          min-height: 380px;
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
          border-color: #e5e7eb;
        }
        .blog-editor .ql-toolbar {
          border-top-left-radius: 12px;
          border-top-right-radius: 12px;
          border-color: #e5e7eb;
          background: #f9fafb;
        }
        .blog-editor .ql-editor {
          min-height: 380px;
          line-height: 1.8;
          color: #111827;
        }
        .blog-editor .ql-editor h2 { font-size: 1.5rem; font-weight: 700; margin: 1.2em 0 0.5em; color: #111827; }
        .blog-editor .ql-editor h3 { font-size: 1.2rem; font-weight: 600; margin: 1em 0 0.4em; color: #374151; }
        .blog-editor .ql-editor blockquote { border-left: 4px solid #3a164d; padding: 8px 16px; background: #f9f5ff; border-radius: 0 8px 8px 0; margin: 1em 0; color: #4b5563; }
        .blog-editor .ql-editor a { color: #3a164d; text-decoration: underline; }
        .blog-editor .ql-editor img { max-width: 100%; border-radius: 8px; margin: 12px 0; }
        .blog-editor .ql-editor pre { background: #1e293b; color: #e2e8f0; border-radius: 8px; padding: 16px; }
        .blog-editor .ql-editor ul, .blog-editor .ql-editor ol { padding-left: 1.5em; }
        .blog-editor .ql-editor p { margin-bottom: 0.5em; }
      `}</style>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
}