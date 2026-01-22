import { useState } from 'react';
import CharacterCard from './CharacterCard';
import UniverseSelector, { UNIVERSES } from './UniverseSelector';
import './CreateStory.css';

export default function CreateStory({ characters, onSubmit, onCancel }) {
    const [step, setStep] = useState(1);
    const [selectedCharacters, setSelectedCharacters] = useState([]);
    const [selectedUniverse, setSelectedUniverse] = useState(null);
    const [storyDescription, setStoryDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toggleCharacter = (character) => {
        setSelectedCharacters(prev => {
            const exists = prev.find(c => c.id === character.id);
            if (exists) {
                return prev.filter(c => c.id !== character.id);
            }
            if (prev.length >= 4) {
                return prev; // Max 4 characters
            }
            return [...prev, character];
        });
    };

    const handleSubmit = async () => {
        if (selectedCharacters.length === 0 || !selectedUniverse) return;

        setIsSubmitting(true);

        const universe = UNIVERSES.find(u => u.id === selectedUniverse);

        const storyRequest = {
            characters: selectedCharacters,
            universe: universe,
            description: storyDescription || `Uma história épica com ${selectedCharacters.map(c => c.name).join(', ')}`,
        };

        await onSubmit(storyRequest);
        setIsSubmitting(false);
    };

    const canProceed = () => {
        if (step === 1) return selectedCharacters.length > 0;
        if (step === 2) return selectedUniverse !== null;
        return true;
    };

    return (
        <div className="create-story">
            {/* Progress Steps */}
            <div className="story-steps">
                <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                    <span className="step-number">{step > 1 ? '✓' : '1'}</span>
                    <span className="step-label">Personagens</span>
                </div>
                <div className="step-line" />
                <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                    <span className="step-number">{step > 2 ? '✓' : '2'}</span>
                    <span className="step-label">Universo</span>
                </div>
                <div className="step-line" />
                <div className={`step ${step >= 3 ? 'active' : ''}`}>
                    <span className="step-number">3</span>
                    <span className="step-label">Criar!</span>
                </div>
            </div>

            {/* Step 1: Select Characters */}
            {step === 1 && (
                <div className="story-step-content">
                    <div className="step-header">
                        <span className="step-icon">👥</span>
                        <h2>Quem vai protagonizar?</h2>
                        <p>Selecione até 4 personagens para sua história</p>
                        <div className="selection-count">
                            {selectedCharacters.length}/4 selecionados
                        </div>
                    </div>

                    {characters.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-icon">😢</span>
                            <h3>Nenhum personagem criado ainda</h3>
                            <p>Crie seus personagens primeiro para poder fazer histórias!</p>
                        </div>
                    ) : (
                        <div className="characters-grid">
                            {characters.map(char => (
                                <CharacterCard
                                    key={char.id}
                                    character={char}
                                    selected={selectedCharacters.some(c => c.id === char.id)}
                                    onSelect={toggleCharacter}
                                    selectable
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Step 2: Select Universe */}
            {step === 2 && (
                <div className="story-step-content">
                    <UniverseSelector
                        selected={selectedUniverse}
                        onSelect={setSelectedUniverse}
                    />
                </div>
            )}

            {/* Step 3: Final Details & Submit */}
            {step === 3 && (
                <div className="story-step-content">
                    <div className="step-header">
                        <span className="step-icon">✨</span>
                        <h2>Tudo pronto para a mágica!</h2>
                        <p>Revise sua história e adicione detalhes opcionais</p>
                    </div>

                    <div className="story-summary">
                        <div className="summary-section">
                            <h4>🎭 Personagens</h4>
                            <div className="summary-characters">
                                {selectedCharacters.map(char => (
                                    <div key={char.id} className="summary-character">
                                        <div
                                            className="summary-avatar"
                                            style={{ backgroundImage: `url(${char.images[0]})` }}
                                        />
                                        <span>{char.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="summary-section">
                            <h4>🌌 Universo</h4>
                            <div className="summary-universe">
                                <span className="universe-badge">
                                    {UNIVERSES.find(u => u.id === selectedUniverse)?.emoji}
                                    {UNIVERSES.find(u => u.id === selectedUniverse)?.name}
                                </span>
                            </div>
                        </div>

                        <div className="summary-section">
                            <h4>📝 Descrição (opcional)</h4>
                            <textarea
                                className="input story-description"
                                placeholder="Ex: Uma aventura onde eles precisam salvar o mundo de uma ameaça misteriosa..."
                                value={storyDescription}
                                onChange={(e) => setStoryDescription(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="story-navigation">
                <button
                    className="btn btn-secondary"
                    onClick={step === 1 ? onCancel : () => setStep(s => s - 1)}
                >
                    {step === 1 ? 'Cancelar' : '← Voltar'}
                </button>

                {step < 3 ? (
                    <button
                        className="btn btn-primary"
                        onClick={() => setStep(s => s + 1)}
                        disabled={!canProceed()}
                    >
                        Próximo →
                    </button>
                ) : (
                    <button
                        className="btn btn-gold btn-lg"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <span className="spinner" /> Criando Mágica...
                            </>
                        ) : (
                            <>✨ Criar Minha História!</>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
