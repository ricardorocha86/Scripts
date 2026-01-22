import './CharacterCard.css';

export default function CharacterCard({ character, selected, onSelect, onDelete, selectable = false }) {
    const handleClick = () => {
        if (selectable && onSelect) {
            onSelect(character);
        }
    };

    return (
        <div
            className={`character-card ${selected ? 'selected' : ''} ${selectable ? 'selectable' : ''}`}
            onClick={handleClick}
        >
            <div className="character-images">
                {character.images.slice(0, 3).map((img, idx) => (
                    <div
                        key={idx}
                        className="character-image-thumb"
                        style={{
                            backgroundImage: `url(${img})`,
                            transform: `rotate(${(idx - 1) * 5}deg)`,
                            zIndex: 3 - idx
                        }}
                    />
                ))}
            </div>

            <div className="character-info">
                <h3 className="character-name">{character.name}</h3>
                <span className="character-photos-count">
                    {character.images.length} foto{character.images.length !== 1 ? 's' : ''}
                </span>
            </div>

            {selected && (
                <div className="character-selected-badge">
                    <span>✓</span>
                </div>
            )}

            {onDelete && !selectable && (
                <button
                    className="character-delete-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(character.id);
                    }}
                >
                    ×
                </button>
            )}
        </div>
    );
}
