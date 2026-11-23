import { Editor } from '@tinymce/tinymce-react';
import React from 'react';

const VALID_ELEMENTS = [
  'p[class|style]',
  'br',
  'div[class|style]',
  'span[class|style]',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'h1[class|style]',
  'h2[class|style]',
  'h3[class|style]',
  'h4[class|style]',
  'h5[class|style]',
  'h6[class|style]',
  'blockquote',
  'pre',
  'code',
  'ul',
  'ol',
  'li',
  'a[href|title|target|rel|class|style]',
  'img[src|alt|title|width|height|class|style]',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'hr',
  'figure',
  'figcaption',
].join(',');

export interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  uploadImage?: (file: File) => Promise<{ data: { url: string } }>;
  disabled?: boolean;
  placeholder?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  uploadImage,
  disabled,
  placeholder,
}: RichTextEditorProps) {
  return (
    <Editor
      tinymceScriptSrc="/tinymce/tinymce.min.js"
      licenseKey="gpl"
      value={value ?? ''}
      disabled={disabled}
      onEditorChange={(next) => onChange?.(next)}
      init={{
        base_url: '/tinymce',
        suffix: '.min',
        promotion: false,
        branding: false,
        height: 360,
        menubar: false,
        placeholder,
        plugins: 'lists link image table code help wordcount',
        toolbar:
          'undo redo | blocks | bold italic underline strikethrough | alignleft aligncenter alignright | bullist numlist outdent indent | link image table | removeformat code help',
        block_formats: 'Paragraph=p;Heading 1=h1;Heading 2=h2;Heading 3=h3',
        valid_elements: VALID_ELEMENTS,
        content_style:
          'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 14px; } img { max-width: 100%; height: auto; }',
        images_upload_handler: uploadImage
          ? async (blobInfo) => {
              const blob = blobInfo.blob();
              const file = new File([blob], blobInfo.filename(), {
                type: blob.type,
              });
              const response = await uploadImage(file);
              return response.data.url;
            }
          : undefined,
      }}
    />
  );
}
