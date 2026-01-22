import { useState, useRef } from 'react';
import './CreateCharacter.css';

export default function CreateCharacter({ onSave, onCancel }) {
    const [name, setName] = useState('');
    const [images, setImages] = useState([]);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const handleFiles = (files) => {
        const validImages = Array.from(files)
            .filter(file => file.type.startsWith('image/'))
            .slice(0, 3 - images.length);

        validImages.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                setImages(prev => {
                    if (prev.length >= 3) return prev;
                    return [...prev, e.target.result];
                });
            };
            reader.readAsDataURL(file);
        });
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim() && images.length > 0) {
            onSave({
                id: Date.now().toString(),
                name: name.trim(),
                images
            });
        }
    };

    const isValid = name.trim().length > 0 && images.length > 0;

    return (
        <div className="create-character">
            <div className="create-character-header">
                <span className="create-icon">🧙‍♂️</span>
                <h2>Criar Personagem</h2>
                <p className="create-subtitle">
                    Adicione fotos claras de frente para que a magia funcione! ✨
                </p>
            </div>

            <form onSubmit={handleSubmit} className="create-form">
                <div className="form-group">
                    <label className="label" htmlFor="character-name">
                        Nome do Personagem
                    </label>
                    <input
                        type="text"
                        id="character-name"
                        className="input"
                        placeholder="Ex: João, Princesa Luna, Super Ricardo..."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={50}
                    />
                </div>

                <div className="form-group">
                    <label className="label">
                        Fotos ({images.length}/3)
                        <span className="label-hint">- fotos claras de frente</span>
                    </label>

                    <div
                        className={`upload-zone ${dragOver ? 'dragover' : ''} ${images.length >= 3 ? 'disabled' : ''}`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => images.length < 3 && fileInputRef.current?.click()}
                    >
                        {images.length >= 3 ? (
                            <>
                                <span className="upload-zone-icon">✅</span>
                                <p>Máximo de fotos atingido!</p>
                            </>
                        ) : (
                            <>
                                <span className="upload-zone-icon">📸</span>
                                <p><strong>Arraste fotos aqui</strong> ou clique para selecionar</p>
                                <span className="upload-hint">PNG, JPG ou WEBP • Máximo 3 fotos</span>
                            </>
                        )}
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleFiles(e.target.files)}
                        style={{ display: 'none' }}
                    />
                </div>

                {images.length > 0 && (
                    <div className="preview-images">
                        {images.map((img, idx) => (
                            <div key={idx} className="preview-image">
                                <img src={img} alt={`Foto ${idx + 1}`} />
                                <button
                                    type="button"
                                    className="preview-remove"
                                    onClick={() => removeImage(idx)}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="form-actions">
                    <button type="button" className="btn btn-secondary" onClick={onCancel}>
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="btn btn-gold"
                        disabled={!isValid}
                    >
                        ✨ Criar Personagem
                    </button>
                </div>
            </form>
        </div>
    );
}
