"""
API Backend para o Multiverso Particular
Expõe o processo de criação de histórias via SSE (Server-Sent Events)
Salva histórias e imagens em disco para histórico
"""
import re
import os
import glob
import asyncio
import time
import json
import base64
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from dotenv import load_dotenv
from PIL import Image
from io import BytesIO

load_dotenv()  # Tenta local primeiro
load_dotenv(dotenv_path="../.env")  # Tenta pasta pai (Scripts)

app = FastAPI(title="Multiverso Particular API", version="1.0.0")

# Pasta para salvar histórias
STORIES_DIR = os.path.join(os.path.dirname(__file__), "historias")
os.makedirs(STORIES_DIR, exist_ok=True)

# CORS para permitir requisições do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir arquivos estáticos das histórias
app.mount("/historias", StaticFiles(directory=STORIES_DIR), name="historias")

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# --- MODELOS ---
class Story(BaseModel):
    title: str = Field(description="O título épico e chamativo da história.")
    cover_prompt: str = Field(description="Um prompt detalhado para gerar uma imagem de capa cinematográfica em formato wide (16:9).")
    parts: List[List[str]] = Field(
        description="Uma lista de exatamente 5 elementos. Cada elemento é uma lista com 2 strings: [texto_da_historia, prompt_de_imagem].",
        min_length=5,
        max_length=5
    )

class Character(BaseModel):
    id: str
    name: str
    images: List[str]  # Base64 encoded images

class Universe(BaseModel):
    id: str
    name: str
    style: str

class StoryRequest(BaseModel):
    characters: List[Character]
    universe: Universe
    description: Optional[str] = None

# --- FUNÇÕES AUXILIARES ---

# Configuração de retry
MAX_RETRIES = 5
BASE_DELAY = 1  # segundos
MAX_DELAY = 5   # segundos

async def retry_with_backoff(func, *args, operation_name="operação", **kwargs):
    """
    Executa uma função async com retry e backoff exponencial.
    Tenta até MAX_RETRIES vezes, esperando de 1 a 5 segundos entre tentativas.
    """
    last_exception = None
    
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            last_exception = e
            if attempt < MAX_RETRIES:
                # Backoff exponencial: 1s, 2s, 3s, 4s, 5s (limitado a MAX_DELAY)
                delay = min(BASE_DELAY * attempt, MAX_DELAY)
                print(f"⚠️ Tentativa {attempt}/{MAX_RETRIES} falhou para {operation_name}: {e}")
                print(f"   Aguardando {delay}s antes da próxima tentativa...")
                await asyncio.sleep(delay)
            else:
                print(f"❌ Falha definitiva após {MAX_RETRIES} tentativas para {operation_name}: {e}")
    
    raise last_exception

def send_event(event_type: str, data: dict) -> str:
    """Formata evento SSE"""
    payload = json.dumps({"type": event_type, **data}, ensure_ascii=False)
    return f"data: {payload}\n\n"

def decode_base64_images(base64_images: List[str]) -> List[Image.Image]:
    """Decodifica imagens Base64 para objetos PIL"""
    images = []
    for b64 in base64_images:
        # Remove o prefixo data:image/xxx;base64, se existir
        if ',' in b64:
            b64 = b64.split(',')[1]
        image_data = base64.b64decode(b64)
        images.append(Image.open(BytesIO(image_data)))
    return images

def sanitize_filename(name: str) -> str:
    """Remove caracteres inválidos de nomes de arquivo"""
    return re.sub(r'[<>:"/\\|?*]', '', name).replace(' ', '_')[:50]

def create_story_folder(title: str) -> tuple[str, str]:
    """Cria pasta para a história e retorna (caminho_absoluto, story_id)"""
    story_id = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
    title_clean = sanitize_filename(title)
    folder_name = f"{story_id}_{title_clean}"
    folder_path = os.path.join(STORIES_DIR, folder_name)
    os.makedirs(folder_path, exist_ok=True)
    return folder_path, story_id, folder_name

async def _gerar_json_historia_interno(characters: List[Character], universe: Universe, description: str):
    """Função interna que gera a estrutura da história."""
    nomes = ", ".join([c.name for c in characters])
    
    prompt_historia = f"""
    Crie uma história épica e imersiva dividida em EXATAMENTE 5 PARTES.
    PROTAGONISTAS: {nomes}
    TEMA/DESCRIÇÃO: {description}
    UNIVERSO: {universe.name} - {universe.style}
    
    SAÍDA: Um título, um prompt para a capa (formato wide 16:9) e uma lista de 5 listas [texto_historia, prompt_imagem].
    Os protagonistas devem ser {nomes}.
    """
    
    response = await client.aio.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt_historia,
        config={
            "response_mime_type": "application/json",
            "response_json_schema": Story.model_json_schema(),
        },
    )
    
    if not response or not response.text:
        raise ValueError("Resposta vazia da API")
    
    return Story.model_validate_json(response.text)

async def gerar_json_historia(characters: List[Character], universe: Universe, description: str):
    """Gera a estrutura da história usando Gemini com retry."""
    return await retry_with_backoff(
        _gerar_json_historia_interno,
        characters, universe, description,
        operation_name="geração de história"
    )

async def _gerar_imagem_interno(
    id_imagem: str, 
    prompt: str, 
    fotos_personagens: List[Image.Image], 
    nomes: str, 
    universo: str,
    pasta_destino: str,
    ratio: str = "2:3"
) -> str:
    """Função interna que gera uma imagem. Levanta exceção se falhar."""
    instrucao = f"\n\nIMPORTANTE: Os personagens principais desta imagem devem ser exatamente as mesmas pessoas que aparecem nas fotos anexadas ({nomes}). Mantenha as características faciais. Universo: {universo}."
    prompt_final = prompt + instrucao
    
    response = await client.aio.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=[prompt_final] + fotos_personagens,
        config=types.GenerateContentConfig(
            response_modalities=['IMAGE'],
            image_config=types.ImageConfig(aspect_ratio=ratio),
        )
    )

    for part in response.parts:
        if image := part.as_image():
            # Salvar imagem em disco
            filename = f"{id_imagem}.png"
            filepath = os.path.join(pasta_destino, filename)
            image.save(filepath)
            
            # Também criar versão WebP otimizada
            webp_filename = f"{id_imagem}.webp"
            webp_filepath = os.path.join(pasta_destino, webp_filename)
            
            # Otimizar para web
            with Image.open(filepath) as img:
                img.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
                img.save(webp_filepath, "WEBP", quality=85, optimize=True)
            
            print(f"✅ Imagem salva: {filepath}")
            return filename
    
    raise ValueError(f"A resposta não continha uma imagem válida para {id_imagem}.")

async def gerar_imagem_async(
    id_imagem: str, 
    prompt: str, 
    fotos_personagens: List[Image.Image], 
    nomes: str, 
    universo: str,
    pasta_destino: str,
    ratio: str = "2:3"
) -> Optional[str]:
    """Gera uma imagem com retry e backoff. Retorna None se falhar após todas as tentativas."""
    try:
        return await retry_with_backoff(
            _gerar_imagem_interno,
            id_imagem, prompt, fotos_personagens, nomes, universo, pasta_destino, ratio,
            operation_name=f"imagem {id_imagem}"
        )
    except Exception as e:
        print(f"❌ Falha definitiva na imagem {id_imagem} após {MAX_RETRIES} tentativas: {e}")
        return None

# --- ENDPOINTS ---

@app.post("/api/create-story")
async def create_story(request: StoryRequest):
    """
    Cria uma história completa com imagens.
    Retorna eventos SSE em tempo real para o frontend acompanhar o progresso.
    """
    async def event_generator():
        start_time = time.time()
        pasta_historia = None
        folder_name = None
        
        try:
            # ========== ETAPA 1: INICIALIZAÇÃO ==========
            yield send_event("stage", {
                "stage": 1,
                "title": "🚀 Iniciando",
                "message": "Preparando os ingredientes mágicos...",
                "progress": 5
            })
            await asyncio.sleep(0.5)
            
            # Preparar dados dos personagens
            nomes = ", ".join([c.name for c in request.characters])
            description = request.description or f"Uma aventura épica com {nomes}"
            
            # Coletar todas as fotos dos personagens
            todas_fotos = []
            for char in request.characters:
                fotos = decode_base64_images(char.images)
                todas_fotos.extend(fotos)
            
            yield send_event("stage", {
                "stage": 1,
                "title": "🚀 Iniciando",
                "message": f"Personagens carregados: {nomes}",
                "progress": 10
            })
            
            # ========== ETAPA 2: GERANDO HISTÓRIA ==========
            yield send_event("stage", {
                "stage": 2,
                "title": "📜 Escrevendo a História",
                "message": "A IA está criando uma narrativa épica...",
                "progress": 15
            })
            
            stage2_start = time.time()
            
            story_data = await gerar_json_historia(
                request.characters, 
                request.universe, 
                description
            )
            
            stage2_time = time.time() - stage2_start
            
            # Criar pasta para esta história
            pasta_historia, story_id, folder_name = create_story_folder(story_data.title)
            
            yield send_event("story_created", {
                "stage": 2,
                "title": "📜 História Criada!",
                "message": f"Título: {story_data.title}",
                "progress": 25,
                "elapsed": round(stage2_time, 1),
                "data": {
                    "title": story_data.title,
                    "parts": story_data.parts,
                    "storyId": story_id,
                    "folder": folder_name
                }
            })
            
            # ========== ETAPA 3: GERANDO IMAGENS EM PARALELO ==========
            total_images = 6  # 1 capa + 5 partes
            generated_images = {}
            
            yield send_event("stage", {
                "stage": 3,
                "title": "🎨 Gerando Imagens",
                "message": f"Criando {total_images} ilustrações em paralelo...",
                "progress": 30
            })
            
            # Enviar eventos de início para TODAS as imagens
            yield send_event("image_start", {
                "stage": 3,
                "imageId": "capa",
                "message": "Iniciando geração da capa...",
                "currentImage": 1,
                "totalImages": total_images
            })
            
            for i in range(1, 6):
                yield send_event("image_start", {
                    "stage": 3,
                    "imageId": f"parte_{i}",
                    "message": f"Iniciando capítulo {i}...",
                    "currentImage": i + 1,
                    "totalImages": total_images
                })
            
            # Usar Queue para receber resultados em tempo real
            result_queue = asyncio.Queue()
            img_start = time.time()
            
            async def gerar_e_notificar(id_img, prompt, ratio):
                """Gera imagem e coloca resultado na queue"""
                start = time.time()
                try:
                    filename = await gerar_imagem_async(
                        id_img, prompt, todas_fotos, nomes,
                        request.universe.style, pasta_historia, ratio=ratio
                    )
                    elapsed = time.time() - start
                    await result_queue.put({
                        "id": id_img, 
                        "filename": filename, 
                        "elapsed": round(elapsed, 1),
                        "error": None
                    })
                except Exception as e:
                    elapsed = time.time() - start
                    await result_queue.put({
                        "id": id_img, 
                        "filename": None, 
                        "elapsed": round(elapsed, 1),
                        "error": str(e)
                    })
            
            # Iniciar todas as tasks em paralelo (sem await)
            tasks = []
            tasks.append(asyncio.create_task(
                gerar_e_notificar("capa", story_data.cover_prompt, "16:9")
            ))
            for i, (texto, prompt) in enumerate(story_data.parts, 1):
                tasks.append(asyncio.create_task(
                    gerar_e_notificar(f"parte_{i}", prompt, "2:3")
                ))
            
            # Processar resultados conforme vão chegando (tempo real)
            images_done = 0
            images_failed = 0
            
            for _ in range(total_images):
                # Aguarda próximo resultado (qualquer imagem que terminar)
                result = await result_queue.get()
                
                if result["error"]:
                    images_failed += 1
                    print(f"❌ Erro em imagem {result['id']}: {result['error']}")
                    # Enviar evento de erro para essa imagem específica
                    yield send_event("image_error", {
                        "stage": 3,
                        "imageId": result["id"],
                        "message": f"Falha ao gerar {result['id']}",
                        "error": result["error"]
                    })
                    continue
                    
                if result["filename"]:
                    images_done += 1
                    image_url = f"/historias/{folder_name}/{result['filename']}"
                    generated_images[result["id"]] = image_url
                    
                    # Determinar número do capítulo para mensagem
                    if result["id"] == "capa":
                        msg = "Capa criada!"
                        current_num = 1
                    else:
                        cap_num = int(result["id"].split("_")[1])
                        msg = f"Capítulo {cap_num} ilustrado!"
                        current_num = cap_num + 1
                    
                    # ENVIAR EVENTO IMEDIATAMENTE (tempo real!)
                    yield send_event("image_done", {
                        "stage": 3,
                        "imageId": result["id"],
                        "message": msg,
                        "elapsed": result["elapsed"],
                        "imageUrl": image_url,
                        "currentImage": current_num,
                        "totalImages": total_images,
                        "progress": 30 + ((images_done + images_failed) / total_images * 60)
                    })
            
            # Garantir que todas as tasks terminaram
            await asyncio.gather(*tasks, return_exceptions=True)
            
            total_img_time = time.time() - img_start
            print(f"⚡ Imagens: {images_done} ✓, {images_failed} ✗ em {total_img_time:.1f}s (paralelo)")
            
            # Verificar se houve falhas demais
            if images_failed > 0 and images_done == 0:
                yield send_event("error", {
                    "stage": 3,
                    "title": "❌ Erro na Geração",
                    "message": f"Não foi possível gerar nenhuma imagem após {MAX_RETRIES} tentativas. Por favor, tente novamente.",
                    "progress": 0
                })
                return
            
            # ========== ETAPA 4: SALVAR E FINALIZAR ==========
            total_time = time.time() - start_time
            
            # Montar objeto final da história
            final_story = {
                "id": story_id,
                "folder": folder_name,
                "createdAt": datetime.now().isoformat(),
                "title": story_data.title,
                "cover_prompt": story_data.cover_prompt,
                "parts": story_data.parts,
                "images": generated_images,
                "universe": {
                    "id": request.universe.id,
                    "name": request.universe.name,
                    "style": request.universe.style
                },
                "characters": [{"id": c.id, "name": c.name} for c in request.characters],
                "totalTime": round(total_time, 1)
            }
            
            # Salvar JSON da história
            json_path = os.path.join(pasta_historia, "story.json")
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(final_story, f, indent=2, ensure_ascii=False)
            print(f"✅ JSON salvo: {json_path}")
            
            yield send_event("complete", {
                "stage": 4,
                "title": "✨ História Completa!",
                "message": f"Sua história foi criada em {round(total_time, 1)} segundos!",
                "progress": 100,
                "totalTime": round(total_time, 1),
                "data": final_story
            })
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            yield send_event("error", {
                "stage": -1,
                "title": "❌ Erro",
                "message": str(e),
                "progress": 0
            })
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.get("/api/stories")
async def list_stories():
    """Lista todas as histórias salvas"""
    stories = []
    
    if os.path.exists(STORIES_DIR):
        for folder_name in os.listdir(STORIES_DIR):
            folder_path = os.path.join(STORIES_DIR, folder_name)
            json_path = os.path.join(folder_path, "story.json")
            
            if os.path.isdir(folder_path) and os.path.exists(json_path):
                try:
                    with open(json_path, "r", encoding="utf-8") as f:
                        story = json.load(f)
                        stories.append(story)
                except Exception as e:
                    print(f"Erro ao ler {json_path}: {e}")
    
    # Ordenar por data de criação (mais recente primeiro)
    stories.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    
    return {"stories": stories}

@app.get("/api/stories/{story_id}")
async def get_story(story_id: str):
    """Busca uma história específica pelo ID"""
    if os.path.exists(STORIES_DIR):
        for folder_name in os.listdir(STORIES_DIR):
            if folder_name.startswith(story_id):
                json_path = os.path.join(STORIES_DIR, folder_name, "story.json")
                if os.path.exists(json_path):
                    with open(json_path, "r", encoding="utf-8") as f:
                        return json.load(f)
    
    raise HTTPException(status_code=404, detail="História não encontrada")

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
