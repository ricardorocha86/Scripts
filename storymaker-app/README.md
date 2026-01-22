# 🌌 Multiverso Particular - Crie Histórias Mágicas Personalizadas

Um aplicativo web moderno que permite criar histórias personalizadas usando inteligência artificial. Você pode adicionar personagens (com fotos reais) e escolher universos famosos para gerar histórias únicas com ilustrações geradas por IA.

## ✨ Funcionalidades

- **🧙‍♂️ Criar Personagens**: Adicione pessoas com até 3 fotos para usar como protagonistas
- **🌌 15 Universos Populares**: Harry Potter, Marvel, Star Wars, Disney, Pokémon e muito mais!
- **📜 Geração em Tempo Real**: Acompanhe cada etapa da criação com contadores de tempo
- **🎨 Ilustrações com IA**: Imagens geradas automaticamente para cada capítulo
- **📖 Visualizador de Livro**: Navegue pela história como um livro digital
- **💾 Galeria de Histórias**: Salve e revisite suas histórias criadas

## 🚀 Como Executar

### Pré-requisitos

- Node.js 18+
- Python 3.10+
- Chave da API Google Gemini

### 1. Configurar o Backend (API)

```bash
# Instalar dependências Python
pip install -r requirements.txt

# Criar arquivo .env com sua chave da API (na pasta Scripts)
echo "GEMINI_API_KEY=sua_chave_aqui" > ../.env

# Iniciar o servidor API
python api.py
```

O backend estará disponível em `http://localhost:8000`

### 2. Iniciar o Frontend

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

O frontend estará disponível em `http://localhost:5173`

## 📁 Estrutura do Projeto

```
storymaker-app/
├── api.py                 # Backend FastAPI com SSE
├── requirements.txt       # Dependências Python
├── src/
│   ├── App.jsx           # Componente principal
│   ├── App.css           # Estilos do App
│   ├── index.css         # Design system global
│   └── components/
│       ├── Header.jsx/.css         # Cabeçalho com login
│       ├── CharacterCard.jsx/.css  # Card de personagem
│       ├── CreateCharacter.jsx/.css # Formulário de criação
│       ├── CreateStory.jsx/.css    # Wizard de história
│       ├── UniverseSelector.jsx/.css # Seletor de universos
│       ├── StoryProgress.jsx/.css  # Progresso em tempo real
│       ├── StoryViewer.jsx/.css    # Visualizador final
│       └── Modal.jsx/.css          # Modal reutilizável
```

## 🔧 Endpoints da API

### `POST /api/create-story`

Cria uma história completa. Retorna eventos SSE para acompanhamento em tempo real.

**Body:**
```json
{
  "characters": [
    {
      "id": "1",
      "name": "João",
      "images": ["base64..."]
    }
  ],
  "universe": {
    "id": "harry-potter",
    "name": "Harry Potter",
    "style": "mundo mágico de Harry Potter..."
  },
  "description": "Uma aventura épica..."
}
```

**Eventos SSE:**
- `stage` - Mudança de etapa
- `story_created` - História escrita
- `image_start` - Iniciando geração de imagem
- `image_done` - Imagem concluída
- `complete` - Processo finalizado
- `error` - Erro durante o processo

### `GET /api/health`

Verifica se a API está funcionando.

## 🎨 Design System

O projeto usa CSS custom properties para um tema consistente:

- **Cores**: Tema roxo/cósmico com acentos dourados
- **Fontes**: Quicksand, Nunito, Playfair Display
- **Animações**: Float, pulse, slide-up, scale-in
- **Componentes**: Botões, cards, badges, modais, formulários

## 🔮 Próximos Passos

- [ ] Implementar autenticação real com Google
- [ ] Adicionar galeria de histórias persistente
- [ ] Download de história em PDF
- [ ] Compartilhamento social
- [ ] Modo de narração com áudio

## 📄 Licença

MIT
