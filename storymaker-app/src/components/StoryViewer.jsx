import { useState } from 'react';
import './StoryViewer.css';

const API_BASE = 'http://localhost:8000';

// Normaliza URL da imagem (pode vir do servidor ou já ser URL completa)
function getImageUrl(url) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${API_BASE}${url}`;
    return url;
}

// Extrai nomes dos personagens (pode ser string[] ou {name}[])
function getCharacterNames(characters) {
    if (!characters || !Array.isArray(characters)) return '';
    return characters.map(c => typeof c === 'string' ? c : c.name).join(', ');
}

// Extrai nome do universo (pode ser string ou {name})
function getUniverseName(universe) {
    if (!universe) return '';
    return typeof universe === 'string' ? universe : universe.name;
}

export default function StoryViewer({ story, onClose }) {
    const [currentPage, setCurrentPage] = useState(0); // 0 = capa

    const totalPages = story.parts?.length || 0;

    const goToPage = (direction) => {
        setCurrentPage(prev => {
            const next = prev + direction;
            if (next < 0) return 0;
            if (next > totalPages) return totalPages;
            return next;
        });
    };

    return (
        <div className="story-viewer">
            {/* Header */}
            <div className="viewer-header">
                <button className="btn btn-secondary" onClick={onClose}>
                    ← Voltar
                </button>
                <div className="viewer-title">
                    <span className="viewer-icon">📖</span>
                    <h2>{story.title}</h2>
                </div>
                <div className="viewer-meta">
                    <span className="badge badge-primary">{getUniverseName(story.universe)}</span>
                </div>
            </div>

            {/* Book Container */}
            <div className="book-container">
                {/* Cover Page */}
                {currentPage === 0 && (
                    <div className="book-page cover-page animate-scale-in">
                        <div className="cover-header">
                            <h1 className="cover-title">{story.title}</h1>
                        </div>
                        <div className="cover-content">
                            <div className="cover-image-wrapper">
                                {getImageUrl(story.images?.capa) ? (
                                    <img src={getImageUrl(story.images.capa)} alt="Capa" className="cover-image" />
                                ) : (
                                    <div className="cover-placeholder">
                                        <span>📚</span>
                                    </div>
                                )}
                            </div>
                            <div className="cover-details">
                                <div className="cover-info-item">
                                    <span className="cover-label">Protagonistas</span>
                                    <p>{getCharacterNames(story.characters)}</p>
                                </div>
                                <div className="cover-info-item">
                                    <span className="cover-label">Universo</span>
                                    <p>{getUniverseName(story.universe)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Chapter Pages */}
                {currentPage > 0 && story.parts && (
                    <div className="book-page chapter-page animate-slide-up" key={currentPage}>
                        <div className="chapter-image-side">
                            {getImageUrl(story.images?.[`parte_${currentPage}`]) ? (
                                <img
                                    src={getImageUrl(story.images[`parte_${currentPage}`])}
                                    alt={`Capítulo ${currentPage}`}
                                    className="chapter-image"
                                />
                            ) : (
                                <div className="chapter-image-placeholder">
                                    <span>🖼️</span>
                                </div>
                            )}
                        </div>
                        <div className="chapter-text-side">
                            <div className="chapter-header">
                                <span className="chapter-number">Capítulo {currentPage}</span>
                            </div>
                            <div className="chapter-content">
                                <p className="chapter-text">
                                    {story.parts[currentPage - 1]?.[0]}
                                </p>
                            </div>
                            <div className="chapter-prompt">
                                <span className="prompt-label">🎨 Prompt da imagem:</span>
                                <p>{story.parts[currentPage - 1]?.[1]}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="viewer-navigation">
                <button
                    className="btn btn-secondary nav-btn"
                    onClick={() => goToPage(-1)}
                    disabled={currentPage === 0}
                >
                    ← Anterior
                </button>

                <div className="page-indicator">
                    <div className="page-dots">
                        {Array.from({ length: totalPages + 1 }).map((_, idx) => (
                            <button
                                key={idx}
                                className={`page-dot ${currentPage === idx ? 'active' : ''}`}
                                onClick={() => setCurrentPage(idx)}
                            >
                                {idx === 0 ? '📕' : idx}
                            </button>
                        ))}
                    </div>
                    <span className="page-text">
                        {currentPage === 0 ? 'Capa' : `Capítulo ${currentPage} de ${totalPages}`}
                    </span>
                </div>

                {currentPage === totalPages ? (
                    <button
                        className="btn btn-gold nav-btn"
                        onClick={onClose}
                    >
                        🏠 Voltar para Home
                    </button>
                ) : (
                    <button
                        className="btn btn-primary nav-btn"
                        onClick={() => goToPage(1)}
                    >
                        Próximo →
                    </button>
                )}
            </div>
        </div>
    );
}
