// src/features/customers/components/DocumentUpload.jsx
import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import './DocumentUpload.css';

export default function DocumentUpload({ label, onFileSelected, existingFileName }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState(existingFileName || '');

  const handleFiles = (files) => {
    const file = files?.[0];
    if (!file) return;
    setFileName(file.name);
    onFileSelected(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="document-upload">
      <span className="document-upload__label">{label}</span>

      <div
        className={`document-upload__dropzone ${isDragging ? 'document-upload__dropzone--active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          capture="environment"
          className="document-upload__input"
          onChange={(e) => handleFiles(e.target.files)}
          aria-label={`Upload ${label}`}
        />

        {fileName ? (
          <p className="document-upload__filename">📄 {fileName}</p>
        ) : (
          <>
            <p className="document-upload__hint">Tap to upload or drag a file here</p>
            <p className="document-upload__subhint">JPG, PNG, or PDF · Max 5MB</p>
          </>
        )}
      </div>
    </div>
  );
}

DocumentUpload.propTypes = {
  label: PropTypes.string.isRequired,
  onFileSelected: PropTypes.func.isRequired,
  existingFileName: PropTypes.string,
};

DocumentUpload.defaultProps = {
  existingFileName: '',
};
