'use client';

import { useState } from 'react';
import SmartEmbed from './SmartEmbed';

interface EditableIframeItemProps {
  id: string;
  title: string;
  initialSrc: string;
  initialWidth?: string | number;
}

export default function EditableIframeItem({ 
  id, 
  title, 
  initialSrc, 
  initialWidth = '100%' 
}: EditableIframeItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [src, setSrc] = useState(initialSrc);
  const [width, setWidth] = useState<string | number>(initialWidth);
  const [editSrc, setEditSrc] = useState(initialSrc);
  const [editWidth, setEditWidth] = useState<string | number>(initialWidth);

  const handleSave = () => {
    setSrc(editSrc);
    setWidth(editWidth);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditSrc(src);
    setEditWidth(width);
    setIsEditing(false);
  };

  const handleWidthChange = (value: string) => {
    // Nếu là số thuần túy, chuyển thành number
    if (/^\d+$/.test(value.trim())) {
      setEditWidth(parseInt(value, 10));
    } else if (value.trim() === '100%' || value.trim().endsWith('px') || value.trim().endsWith('%')) {
      setEditWidth(value.trim());
    } else {
      setEditWidth(value);
    }
  };

  return (
    <section style={{ marginBottom: '3rem' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>
          {title}
        </h2>
        <button
          onClick={() => setIsEditing(!isEditing)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: isEditing ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}
        >
          {isEditing ? '✕ Hủy' : '⚙️ Sửa'}
        </button>
      </div>

      {isEditing ? (
        <div style={{
          border: '2px solid #007bff',
          borderRadius: '8px',
          padding: '1.5rem',
          backgroundColor: '#f8f9fa',
          marginBottom: '1rem'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#333'
            }}>
              Link URL:
            </label>
            <input
              type="text"
              value={editSrc}
              onChange={(e) => setEditSrc(e.target.value)}
              placeholder="https://example.com/embed"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#333'
            }}>
              Width (ví dụ: 100%, 800px, hoặc 800):
            </label>
            <input
              type="text"
              value={editWidth}
              onChange={(e) => handleWidthChange(e.target.value)}
              placeholder="100%"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              onClick={handleCancel}
              style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              ✓ Lưu
            </button>
          </div>
        </div>
      ) : (
        <div style={{ 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          padding: '1rem', 
          backgroundColor: '#f9f9f9' 
        }}>
          <div style={{ 
            marginBottom: '0.5rem', 
            fontSize: '0.9rem', 
            color: '#666',
            fontFamily: 'monospace',
            wordBreak: 'break-all'
          }}>
            <strong>URL:</strong> {src}
          </div>
          <div style={{ 
            fontSize: '0.9rem', 
            color: '#666',
            marginBottom: '0.5rem'
          }}>
            <strong>Width:</strong> {typeof width === 'number' ? `${width}px` : width}
          </div>
        </div>
      )}

      <div style={{ 
        border: '1px solid rgb(221, 221, 221)', 
        borderRadius: '8px', 
        padding: '1rem', 
        backgroundColor: 'rgb(249, 249, 249)',
        width: typeof width === 'number' ? `${width}px` : width,
        maxWidth: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        margin: 0,
        transition: 'width 0.3s ease'
      }}>
        <SmartEmbed src={src} width={width} />
      </div>
    </section>
  );
}

