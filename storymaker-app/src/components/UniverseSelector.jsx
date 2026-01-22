import './UniverseSelector.css';

// 15 universos populares que atraem crianças e adultos
export const UNIVERSES = [
    {
        id: 'harry-potter',
        name: 'Harry Potter',
        emoji: '⚡',
        description: 'Magia, Hogwarts e bruxaria',
        style: 'mundo mágico de Harry Potter, Hogwarts, varinhas mágicas',
        color: 'hsl(45, 80%, 45%)'
    },
    {
        id: 'marvel',
        name: 'Marvel',
        emoji: '🦸',
        description: 'Super-heróis e Vingadores',
        style: 'universo cinematográfico Marvel, super-heróis, ação épica',
        color: 'hsl(0, 70%, 50%)'
    },
    {
        id: 'star-wars',
        name: 'Star Wars',
        emoji: '⭐',
        description: 'Galáxia muito distante',
        style: 'universo Star Wars, Jedis, sabres de luz, naves espaciais',
        color: 'hsl(200, 80%, 45%)'
    },
    {
        id: 'disney-princess',
        name: 'Princesas Disney',
        emoji: '👑',
        description: 'Contos de fadas mágicos',
        style: 'universo das princesas Disney, castelos encantados, magia',
        color: 'hsl(300, 70%, 60%)'
    },
    {
        id: 'pokemon',
        name: 'Pokémon',
        emoji: '⚡',
        description: 'Treinadores e criaturas',
        style: 'mundo Pokémon, treinadores, batalhas, criaturas mágicas',
        color: 'hsl(50, 90%, 50%)'
    },
    {
        id: 'minecraft',
        name: 'Minecraft',
        emoji: '⛏️',
        description: 'Blocos e aventuras',
        style: 'universo pixelado de Minecraft, blocos, crafting, aventura',
        color: 'hsl(100, 50%, 40%)'
    },
    {
        id: 'one-piece',
        name: 'One Piece',
        emoji: '🏴‍☠️',
        description: 'Piratas e aventuras no mar',
        style: 'universo de One Piece, piratas, Grand Line, poderes de frutas do diabo',
        color: 'hsl(30, 90%, 50%)'
    },
    {
        id: 'dragon-ball',
        name: 'Dragon Ball',
        emoji: '🐉',
        description: 'Guerreiros Saiyajins',
        style: 'universo Dragon Ball, guerreiros Saiyajins, artes marciais, poderes ki',
        color: 'hsl(35, 100%, 55%)'
    },
    {
        id: 'frozen',
        name: 'Frozen',
        emoji: '❄️',
        description: 'Reino de gelo e neve',
        style: 'universo Frozen, Arendelle, poderes de gelo, neve mágica',
        color: 'hsl(190, 80%, 70%)'
    },
    {
        id: 'jurassic',
        name: 'Jurassic World',
        emoji: '🦖',
        description: 'Dinossauros e aventura',
        style: 'universo Jurassic World, dinossauros, ilha tropical, aventura',
        color: 'hsl(120, 40%, 35%)'
    },
    {
        id: 'lord-of-rings',
        name: 'Senhor dos Anéis',
        emoji: '💍',
        description: 'Terra Média épica',
        style: 'universo Senhor dos Anéis, Terra Média, elfos, hobbits, fantasia épica',
        color: 'hsl(25, 60%, 40%)'
    },
    {
        id: 'naruto',
        name: 'Naruto',
        emoji: '🍥',
        description: 'Ninjas e jutsus',
        style: 'universo Naruto, ninjas, vilas ocultas, jutsus, chakra',
        color: 'hsl(25, 100%, 50%)'
    },
    {
        id: 'dc-comics',
        name: 'DC Comics',
        emoji: '🦇',
        description: 'Batman, Superman e Liga',
        style: 'universo DC Comics, Gotham, Metrópolis, super-heróis',
        color: 'hsl(220, 80%, 40%)'
    },
    {
        id: 'studio-ghibli',
        name: 'Studio Ghibli',
        emoji: '🌿',
        description: 'Animação japonesa mágica',
        style: 'estilo Studio Ghibli, natureza, magia suave, criaturas encantadas',
        color: 'hsl(150, 50%, 50%)'
    },
    {
        id: 'pixar',
        name: 'Pixar',
        emoji: '🎬',
        description: 'Animações emocionantes',
        style: 'estilo Pixar, animação 3D colorida, aventura emocionante',
        color: 'hsl(260, 70%, 55%)'
    }
];

export default function UniverseSelector({ selected, onSelect }) {
    return (
        <div className="universe-selector">
            <div className="universe-header">
                <span className="universe-emoji">🌌</span>
                <h3>Escolha o Universo</h3>
                <p>Em qual mundo sua história vai acontecer?</p>
            </div>

            <div className="universe-grid">
                {UNIVERSES.map((universe) => (
                    <div
                        key={universe.id}
                        className={`universe-item ${selected === universe.id ? 'selected' : ''}`}
                        onClick={() => onSelect(universe.id)}
                        style={{ '--universe-color': universe.color }}
                    >
                        <span className="universe-item-emoji">{universe.emoji}</span>
                        <div className="universe-item-info">
                            <h4>{universe.name}</h4>
                            <p>{universe.description}</p>
                        </div>
                        {selected === universe.id && (
                            <span className="universe-check">✓</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
