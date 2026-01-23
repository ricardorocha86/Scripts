import { useState, useEffect, useRef } from 'react';
import './StoryProgress.css';

const API_BASE = 'http://localhost:8000';

const STAGES = {
    1: { icon: '🚀', name: 'Inicialização' },
    2: { icon: '📜', name: 'Escrevendo História' },
    3: { icon: '🎨', name: 'Gerando Imagens' },
    4: { icon: '✨', name: 'Finalizado' },
};

export default function StoryProgress({ storyRequest, onComplete, onCancel }) {
    const [currentStage, setCurrentStage] = useState(1);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('Preparando...');
    const [stageTitle, setStageTitle] = useState('');
    const [elapsedTime, setElapsedTime] = useState(0);
    const [storyData, setStoryData] = useState(null);
    const [currentImage, setCurrentImage] = useState(null);
    const [generatedImages, setGeneratedImages] = useState({});
    const [imageTimes, setImageTimes] = useState({});
    const [imagesInProgress, setImagesInProgress] = useState({}); // {imageId: startTime}
    const [imageElapsedTimes, setImageElapsedTimes] = useState({}); // contadores em tempo real
    const [imageErrors, setImageErrors] = useState({}); // {imageId: errorMessage}
    const [error, setError] = useState(null);
    const [isComplete, setIsComplete] = useState(false);

    const startTimeRef = useRef(Date.now());
    const eventSourceRef = useRef(null);
    const timerRef = useRef(null);
    const hasStartedRef = useRef(false); // Previne execução dupla (React StrictMode)

    // Timer global + contadores individuais de imagens
    useEffect(() => {
        timerRef.current = setInterval(() => {
            const now = Date.now();
            setElapsedTime(Math.floor((now - startTimeRef.current) / 1000));

            // Atualizar contadores de cada imagem em progresso
            setImagesInProgress(current => {
                if (Object.keys(current).length > 0) {
                    const newElapsed = {};
                    Object.entries(current).forEach(([id, startTime]) => {
                        newElapsed[id] = Math.floor((now - startTime) / 1000);
                    });
                    setImageElapsedTimes(newElapsed);
                }
                return current;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // Conexão SSE
    useEffect(() => {
        // Prevenir execução dupla causada pelo React StrictMode
        if (hasStartedRef.current) {
            console.log('⚠️ Requisição já iniciada, ignorando chamada duplicada');
            return;
        }
        hasStartedRef.current = true;

        const startGeneration = async () => {
            try {
                const response = await fetch('http://localhost:8000/api/create-story', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        characters: storyRequest.characters.map(c => ({
                            id: c.id,
                            name: c.name,
                            images: c.images
                        })),
                        universe: {
                            id: storyRequest.universe.id,
                            name: storyRequest.universe.name,
                            style: storyRequest.universe.style
                        },
                        description: storyRequest.description
                    }),
                });

                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const text = decoder.decode(value);
                    const lines = text.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                handleEvent(data);
                            } catch (e) {
                                console.warn('Failed to parse SSE data:', line);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('SSE Error:', err);
                setError(`Erro de conexão: ${err.message}`);
            }
        };

        startGeneration();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, [storyRequest]);

    const handleEvent = (data) => {
        const { type } = data;

        switch (type) {
            case 'stage':
                setCurrentStage(data.stage);
                setStageTitle(data.title);
                setMessage(data.message);
                setProgress(data.progress);
                break;

            case 'story_created':
                setCurrentStage(data.stage);
                setStageTitle(data.title);
                setMessage(data.message);
                setProgress(data.progress);
                setStoryData(data.data);
                break;

            case 'image_start':
                // Registrar início de cada imagem (para geração paralela)
                setImagesInProgress(prev => ({
                    ...prev,
                    [data.imageId]: Date.now()
                }));
                setCurrentImage({
                    id: data.imageId,
                    current: data.currentImage,
                    total: data.totalImages,
                    startTime: Date.now()
                });
                setMessage(data.message);
                break;

            case 'image_done':
                // Usar URL completa da imagem no servidor
                const imageUrl = data.imageUrl ? `${API_BASE}${data.imageUrl}` : null;
                setGeneratedImages(prev => ({
                    ...prev,
                    [data.imageId]: imageUrl
                }));
                setImageTimes(prev => ({
                    ...prev,
                    [data.imageId]: data.elapsed
                }));
                // Remover da lista de em progresso
                setImagesInProgress(prev => {
                    const updated = { ...prev };
                    delete updated[data.imageId];
                    return updated;
                });
                setProgress(data.progress);
                setMessage(data.message);
                break;

            case 'image_error':
                // Marcar imagem como erro
                setImageErrors(prev => ({
                    ...prev,
                    [data.imageId]: data.error || 'Erro desconhecido'
                }));
                // Remover da lista de em progresso
                setImagesInProgress(prev => {
                    const updated = { ...prev };
                    delete updated[data.imageId];
                    return updated;
                });
                break;

            case 'complete':
                setCurrentStage(4);
                setStageTitle(data.title);
                setMessage(data.message);
                setProgress(100);
                setIsComplete(true);
                if (timerRef.current) clearInterval(timerRef.current);

                // Passar dados completos para o callback
                if (onComplete) {
                    setTimeout(() => onComplete(data.data), 2000);
                }
                break;

            case 'error':
                setError(data.message);
                if (timerRef.current) clearInterval(timerRef.current);
                break;
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    if (error) {
        return (
            <div className="story-progress error-state">
                <div className="progress-card">
                    <span className="error-icon">❌</span>
                    <h2>Ops! Algo deu errado</h2>
                    <p className="error-message">{error}</p>
                    <p className="error-hint">Por favor, tente novamente. Se o problema persistir, aguarde alguns minutos.</p>
                    <div className="error-buttons">
                        <button className="btn btn-primary" onClick={onCancel}>
                            🔄 Tentar Novamente
                        </button>
                        <button className="btn btn-secondary" onClick={onCancel}>
                            ← Voltar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="story-progress">
            {/* Timer Global */}
            <div className="global-timer">
                <span className="timer-icon">⏱️</span>
                <span className="timer-value">{formatTime(elapsedTime)}</span>
            </div>

            {/* Progress Card */}
            <div className="progress-card">
                {/* Stage Icon */}
                <div className={`stage-icon-large ${isComplete ? 'complete' : 'active'}`}>
                    {STAGES[currentStage]?.icon || '🔮'}
                </div>

                {/* Title & Message */}
                <h2 className="progress-title">{stageTitle || 'Preparando a mágica...'}</h2>
                <p className="progress-message">{message}</p>

                {/* Progress Bar */}
                <div className="progress-bar-container">
                    <div
                        className="progress-bar-fill"
                        style={{ width: `${progress}%` }}
                    />
                    <span className="progress-percentage">{Math.round(progress)}%</span>
                </div>

                {/* Stage Indicators */}
                <div className="stage-indicators">
                    {Object.entries(STAGES).map(([num, stage]) => (
                        <div
                            key={num}
                            className={`stage-indicator ${currentStage > parseInt(num) ? 'completed' :
                                currentStage === parseInt(num) ? 'active' : ''
                                }`}
                        >
                            <span className="indicator-icon">{stage.icon}</span>
                            <span className="indicator-name">{stage.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Story Preview (when available) */}
            {storyData && (
                <div className="story-preview animate-slide-up">
                    <h3 className="preview-title">📖 {storyData.title}</h3>
                    <div className="preview-chapters">
                        {storyData.parts.map((part, idx) => {
                            const imageId = `parte_${idx + 1}`;
                            const isInProgress = imagesInProgress[imageId] !== undefined;
                            const isDone = generatedImages[imageId] !== undefined;
                            const hasError = imageErrors[imageId] !== undefined;

                            return (
                                <div key={idx} className="preview-chapter">
                                    <span className="chapter-num">Cap. {idx + 1}</span>
                                    {isDone ? (
                                        <div className="chapter-image-done">
                                            <img src={generatedImages[imageId]} alt={`Capítulo ${idx + 1}`} />
                                            <span className="image-time">{imageTimes[imageId]}s</span>
                                        </div>
                                    ) : hasError ? (
                                        <div className="chapter-image-error">
                                            <span>❌</span>
                                        </div>
                                    ) : isInProgress ? (
                                        <div className="chapter-image-loading">
                                            <div className="loading-spinner" />
                                            <span className="loading-time">{imageElapsedTimes[imageId] || 0}s</span>
                                        </div>
                                    ) : (
                                        <div className="chapter-image-pending">
                                            <span>⏳</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Cover Preview */}
            {(generatedImages.capa || imagesInProgress.capa || imageErrors.capa) && (
                <div className="cover-preview animate-scale-in">
                    <h4>🎬 Capa da História</h4>
                    {generatedImages.capa ? (
                        <>
                            <img src={generatedImages.capa} alt="Capa" />
                            {imageTimes.capa && <span className="image-time-badge">{imageTimes.capa}s</span>}
                        </>
                    ) : imageErrors.capa ? (
                        <div className="cover-error">
                            <span className="error-icon">❌</span>
                            <p>Erro ao gerar capa</p>
                        </div>
                    ) : (
                        <div className="cover-loading">
                            <div className="loading-spinner large" />
                            <span className="loading-time">{imageElapsedTimes.capa || 0}s</span>
                        </div>
                    )}
                </div>
            )}

            {/* Complete State */}
            {isComplete && (
                <div className="complete-overlay animate-scale-in">
                    <div className="complete-content">
                        <span className="complete-icon">🎉</span>
                        <h2>História Criada com Sucesso!</h2>
                        <p>Tempo total: {formatTime(elapsedTime)}</p>
                        <p className="complete-hint">Redirecionando para visualização...</p>
                    </div>
                </div>
            )}

            {/* Cancel Button */}
            {!isComplete && (
                <button className="btn btn-secondary cancel-btn" onClick={onCancel}>
                    Cancelar
                </button>
            )}
        </div>
    );
}
