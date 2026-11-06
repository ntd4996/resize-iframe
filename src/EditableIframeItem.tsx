import { useState, type CSSProperties } from 'react';
import SmartEmbed from './SmartEmbed';
import { parseHttpUrl, toCssSize } from './url';

export interface EditableIframeItemProps {
  /** Unique identifier, used to link the edit form's labels and inputs. */
  id: string;
  title?: string;
  initialSrc: string;
  initialWidth?: string | number;
  enabledEdit?: boolean;
  border?: string | boolean;
  padding?: string | number;
  marginBottom?: string | number;
  backgroundColor?: string;
  apiEndpoint?: string;
  useProxy?: boolean;
}

const DEFAULT_BORDER = '1px solid rgb(221, 221, 221)';
const WIDTH_PATTERN = /^\d+(\.\d+)?(px|%|rem|em|vw)?$/;

const buttonStyle: CSSProperties = {
  padding: '0.4rem 0.9rem',
  border: DEFAULT_BORDER,
  borderRadius: 6,
  backgroundColor: '#fff',
  color: '#1f2328',
  font: 'inherit',
  fontSize: '0.875rem',
  cursor: 'pointer',
};
const primaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  borderColor: '#1f2328',
  backgroundColor: '#1f2328',
  color: '#fff',
};
const labelStyle: CSSProperties = { display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 600 };
const inputStyle: CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.625rem',
  border: DEFAULT_BORDER,
  borderRadius: 6,
  font: 'inherit',
  boxSizing: 'border-box',
};
const panelStyle: CSSProperties = {
  border: DEFAULT_BORDER,
  borderRadius: 8,
  padding: '1rem',
  marginBottom: '1rem',
  fontSize: '0.875rem',
};

export default function EditableIframeItem({
  id,
  title,
  initialSrc,
  initialWidth = '100%',
  enabledEdit = true,
  border = DEFAULT_BORDER,
  padding = '1rem',
  marginBottom = '3rem',
  backgroundColor = 'rgb(249, 249, 249)',
  apiEndpoint = '/api/embed',
  useProxy,
}: EditableIframeItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [src, setSrc] = useState(initialSrc);
  const [width, setWidth] = useState(initialWidth);
  const [draftSrc, setDraftSrc] = useState(initialSrc);
  const [draftWidth, setDraftWidth] = useState(String(initialWidth));
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setDraftSrc(src);
    setDraftWidth(String(width));
    setError(null);
    setIsEditing(true);
  };

  const save = () => {
    const nextWidth = draftWidth.trim();
    if (!parseHttpUrl(draftSrc, window.location.href)) {
      setError('Enter a valid http or https URL.');
      return;
    }
    if (!WIDTH_PATTERN.test(nextWidth)) {
      setError('Enter a width such as 100%, 800px or 800.');
      return;
    }
    setSrc(draftSrc.trim());
    setWidth(/^\d+$/.test(nextWidth) ? Number(nextWidth) : nextWidth);
    setIsEditing(false);
  };

  const borderStyle = border === true ? DEFAULT_BORDER : border || 'none';

  return (
    <section style={{ marginBottom: toCssSize(marginBottom) }}>
      {(title || enabledEdit) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          {title && <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{title}</h2>}
          {enabledEdit && !isEditing && (
            <button type="button" onClick={startEditing} style={{ ...buttonStyle, marginLeft: 'auto' }}>
              Edit
            </button>
          )}
        </div>
      )}

      {enabledEdit && isEditing && (
        <form
          style={panelStyle}
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <div style={{ marginBottom: '0.875rem' }}>
            <label htmlFor={`${id}-url`} style={labelStyle}>
              URL
            </label>
            <input
              id={`${id}-url`}
              type="text"
              inputMode="url"
              value={draftSrc}
              onChange={(event) => setDraftSrc(event.target.value)}
              placeholder="https://example.com/embed"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: '0.875rem' }}>
            <label htmlFor={`${id}-width`} style={labelStyle}>
              Width
            </label>
            <input
              id={`${id}-width`}
              type="text"
              value={draftWidth}
              onChange={(event) => setDraftWidth(event.target.value)}
              placeholder="100%, 800px or 800"
              style={inputStyle}
            />
          </div>
          {error && (
            <p role="alert" style={{ margin: '0 0 0.875rem', color: '#b42318' }}>
              {error}
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" onClick={() => setIsEditing(false)} style={buttonStyle}>
              Cancel
            </button>
            <button type="submit" style={primaryButtonStyle}>
              Save
            </button>
          </div>
        </form>
      )}

      <div
        style={{
          boxSizing: 'border-box',
          width: toCssSize(width),
          maxWidth: '100%',
          border: borderStyle,
          borderRadius: 8,
          padding: toCssSize(padding),
          backgroundColor,
        }}
      >
        <SmartEmbed src={src} title={title} apiEndpoint={apiEndpoint} useProxy={useProxy} />
      </div>
    </section>
  );
}
