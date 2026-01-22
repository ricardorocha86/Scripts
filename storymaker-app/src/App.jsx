import { useState, useEffect } from 'react';
import Header from './components/Header';
import CharacterCard from './components/CharacterCard';
import CreateCharacter from './components/CreateCharacter';
import CreateStory from './components/CreateStory';
import StoryProgress from './components/StoryProgress';
import StoryViewer from './components/StoryViewer';
import Modal from './components/Modal';
import './App.css';

// Simulated user for demo (placeholder for Google Auth)
const DEMO_USER = null;

function App() {
  const [user, setUser] = useState(DEMO_USER);
  const [characters, setCharacters] = useState([]);
  const [view, setView] = useState('home'); // home, create-character, create-story, generating, viewing
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [currentStoryRequest, setCurrentStoryRequest] = useState(null);
  const [completedStory, setCompletedStory] = useState(null);
  const [savedStories, setSavedStories] = useState([]);

  // Load data from localStorage
  useEffect(() => {
    const savedChars = localStorage.getItem('storymaker-characters');
    if (savedChars) setCharacters(JSON.parse(savedChars));

    const stories = localStorage.getItem('storymaker-stories');
    if (stories) setSavedStories(JSON.parse(stories));
  }, []);

  // Save characters
  useEffect(() => {
    localStorage.setItem('storymaker-characters', JSON.stringify(characters));
  }, [characters]);

  // Save stories
  useEffect(() => {
    localStorage.setItem('storymaker-stories', JSON.stringify(savedStories));
  }, [savedStories]);

  // Placeholder: Google Login
  const handleLogin = () => {
    setUser({ name: 'Usuário Demo', photoURL: null });
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleGalleryClick = () => {
    setShowGalleryModal(true);
  };

  const handleSaveCharacter = (character) => {
    setCharacters(prev => [...prev, character]);
    setView('home');
  };

  const handleDeleteCharacter = (id) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
  };

  const handleCreateStory = async (storyRequest) => {
    setCurrentStoryRequest(storyRequest);
    setView('generating');
  };

  const handleStoryComplete = (storyData) => {
    // Salvar história no histórico
    const newStory = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...storyData
    };
    setSavedStories(prev => [newStory, ...prev]);
    setCompletedStory(storyData);
    setView('viewing');
  };

  const handleCancelGeneration = () => {
    setCurrentStoryRequest(null);
    setView('home');
  };

  const handleCloseViewer = () => {
    setCompletedStory(null);
    setView('home');
  };

  const handleViewSavedStory = (story) => {
    setCompletedStory(story);
    setShowGalleryModal(false);
    setView('viewing');
  };

  // Landing page for non-logged users
  if (!user) {
    return (
      <div className="app">
        <Header
          user={user}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onGalleryClick={handleGalleryClick}
        />

        <main className="landing">
          <div className="landing-content">
            <div className="landing-hero">
              <span className="hero-emoji animate-float">🌌</span>
              <h1 className="hero-title">
                <span className="title-display">Multiverso</span> Particular
              </h1>
              <p className="hero-subtitle">
                Crie histórias mágicas personalizadas com você e sua família como protagonistas!
              </p>

              <div className="hero-features">
                <div className="feature-card">
                  <span className="feature-icon">👤</span>
                  <h3>Crie Personagens</h3>
                  <p>Transforme você e sua família em heróis de histórias</p>
                </div>
                <div className="feature-card">
                  <span className="feature-icon">🌌</span>
                  <h3>Escolha o Universo</h3>
                  <p>Harry Potter, Marvel, Disney e muito mais!</p>
                </div>
                <div className="feature-card">
                  <span className="feature-icon">✨</span>
                  <h3>Magia com IA</h3>
                  <p>Histórias únicas geradas por inteligência artificial</p>
                </div>
              </div>

              <button className="btn btn-gold btn-lg hero-cta" onClick={handleLogin}>
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Começar com Google
              </button>
            </div>
          </div>

          {/* Floating decorations */}
          <div className="floating-elements">
            <span className="float-item" style={{ top: '20%', left: '10%' }}>⭐</span>
            <span className="float-item" style={{ top: '30%', right: '15%' }}>🌙</span>
            <span className="float-item" style={{ bottom: '25%', left: '5%' }}>✨</span>
            <span className="float-item" style={{ bottom: '20%', right: '10%' }}>🪄</span>
            <span className="float-item" style={{ top: '60%', left: '20%' }}>📖</span>
          </div>
        </main>

        <Modal isOpen={showGalleryModal} onClose={() => setShowGalleryModal(false)} title="🖼️ Galeria de Histórias">
          <div className="gallery-placeholder">
            <span className="gallery-icon">🚧</span>
            <h3>Faça login primeiro!</h3>
            <p>Entre com sua conta Google para ver suas histórias.</p>
          </div>
        </Modal>
      </div>
    );
  }

  // Story Generation View
  if (view === 'generating' && currentStoryRequest) {
    return (
      <div className="app">
        <Header
          user={user}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onGalleryClick={handleGalleryClick}
        />
        <main className="dashboard container">
          <StoryProgress
            storyRequest={currentStoryRequest}
            onComplete={handleStoryComplete}
            onCancel={handleCancelGeneration}
          />
        </main>
      </div>
    );
  }

  // Story Viewer
  if (view === 'viewing' && completedStory) {
    return (
      <div className="app">
        <Header
          user={user}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onGalleryClick={handleGalleryClick}
        />
        <main className="dashboard container">
          <StoryViewer
            story={completedStory}
            onClose={handleCloseViewer}
          />
        </main>
      </div>
    );
  }

  // Logged in - Dashboard
  return (
    <div className="app">
      <Header
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onGalleryClick={handleGalleryClick}
      />

      <main className="dashboard container">
        {view === 'home' && (
          <>
            {/* Action Cards */}
            <section className="dashboard-actions">
              <div
                className="action-card glow-border"
                onClick={() => setView('create-character')}
              >
                <div className="action-icon-wrapper">
                  <span className="action-icon">🧙‍♂️</span>
                </div>
                <h2>Criar Personagem</h2>
                <p>Adicione pessoas com fotos para usar nas suas histórias</p>
                <span className="action-arrow">→</span>
              </div>

              <div
                className={`action-card glow-border ${characters.length === 0 ? 'disabled' : ''}`}
                onClick={() => characters.length > 0 && setView('create-story')}
              >
                <div className="action-icon-wrapper">
                  <span className="action-icon">📖</span>
                  {characters.length === 0 && <span className="action-badge">Crie personagens primeiro</span>}
                </div>
                <h2>Nova História</h2>
                <p>Crie uma história épica com seus personagens</p>
                <span className="action-arrow">→</span>
              </div>
            </section>

            {/* Characters Section */}
            <section className="dashboard-section">
              <div className="section-header">
                <h2>👥 Meus Personagens</h2>
                <span className="badge badge-primary">{characters.length} criados</span>
              </div>

              {characters.length === 0 ? (
                <div className="empty-characters">
                  <span className="empty-icon">🎭</span>
                  <h3>Nenhum personagem ainda</h3>
                  <p>Crie seu primeiro personagem para começar a fazer histórias incríveis!</p>
                  <button
                    className="btn btn-primary"
                    onClick={() => setView('create-character')}
                  >
                    ✨ Criar Primeiro Personagem
                  </button>
                </div>
              ) : (
                <div className="characters-list">
                  {characters.map(char => (
                    <CharacterCard
                      key={char.id}
                      character={char}
                      onDelete={handleDeleteCharacter}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {view === 'create-character' && (
          <Modal isOpen={true} onClose={() => setView('home')}>
            <CreateCharacter
              onSave={handleSaveCharacter}
              onCancel={() => setView('home')}
            />
          </Modal>
        )}

        {view === 'create-story' && (
          <CreateStory
            characters={characters}
            onSubmit={handleCreateStory}
            onCancel={() => setView('home')}
          />
        )}
      </main>

      <Modal isOpen={showGalleryModal} onClose={() => setShowGalleryModal(false)} title="🖼️ Minhas Histórias">
        {savedStories.length === 0 ? (
          <div className="gallery-placeholder">
            <span className="gallery-icon">📚</span>
            <h3>Nenhuma história ainda</h3>
            <p>Crie sua primeira história para vê-la aqui!</p>
          </div>
        ) : (
          <div className="stories-gallery">
            {savedStories.map(story => (
              <div
                key={story.id}
                className="gallery-story-card"
                onClick={() => handleViewSavedStory(story)}
              >
                {story.images?.capa && (
                  <img src={story.images.capa} alt={story.title} className="gallery-story-cover" />
                )}
                <div className="gallery-story-info">
                  <h4>{story.title}</h4>
                  <p>{story.universe}</p>
                  <span className="gallery-story-date">
                    {new Date(story.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default App;
