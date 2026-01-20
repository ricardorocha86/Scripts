import re
import os
import glob
import asyncio
import time
import json
from datetime import datetime
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from typing import List
from dotenv import load_dotenv
from PIL import Image
from io import BytesIO

# --- CONFIGURAÇÕES DO USUÁRIO ---
NOME_USUARIO = "Ricardo"
DESCRICAO_HISTORIA = "em que eu sou solicictado pelo presidente dos EUA Donald Trump para ajudar a resolver uma crise internacional de uma ameaça nuclear terrorista"
UNIVERSO_HISTORIA = "Washington D.C - fotografia realistica"
PASTA_FOTOS = "fotos"
# -------------------------------

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

class Story(BaseModel):
    title: str = Field(description="O título épico e chamativo da história.")
    cover_prompt: str = Field(description="Um prompt detalhado para gerar uma imagem de capa cinematográfica em formato wide (16:9).")
    parts: List[List[str]] = Field(
        description="Uma lista de exatamente 5 elementos. Cada elemento é uma lista com 2 strings: [texto_da_historia, prompt_de_imagem].",
        min_length=5,
        max_length=5
    )

def carregar_fotos_usuario(caminho_pasta):
    extensoes = ['*.png', '*.jpg', '*.jpeg', '*.webp']
    arquivos_fotos = []
    if os.path.exists(caminho_pasta):
        for ext in extensoes:
            arquivos_fotos.extend(glob.glob(os.path.join(caminho_pasta, ext)))
    
    fotos = []
    for arquivo in arquivos_fotos[:5]:
        fotos.append(Image.open(arquivo))
    return fotos

# 1. FUNÇÃO GERADORA DE HISTÓRIA
def gerar_json_historia(nome, descricao, universo):
    print(f"\n--- 1. GERANDO ESTRUTURA DA HISTÓRIA PARA {nome.upper()} ---")
    prompt_historia = f"""
    Crie uma história épica e imersiva dividida em EXATAMENTE 5 PARTES para {nome}.
    TEMA/DESCRIÇÃO: {descricao}
    UNIVERSO: {universo}
    
    SAÍDA: Um título, um prompt para a capa (formato wide 16:9) e uma lista de 5 listas [texto_historia, prompt_imagem].
    O protagonista deve ser {nome}.
    """
    
    tentativas = 3
    for i_tentativa in range(tentativas):
        try:
            response = client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=prompt_historia,
                config={
                    "response_mime_type": "application/json",
                    "response_json_schema": Story.model_json_schema(),
                },
            )
            
            if not response or not response.text:
                raise ValueError("Resposta vazia da API")

            story_data = Story.model_validate_json(response.text)
            
            # PRINT DETALHADO DA HISTÓRIA E PROMPTS
            print("\n" + "="*50)
            print(f"📖 ESTRUTURA DA HISTÓRIA GERADA")
            print("="*50)
            for i, (texto, prompt) in enumerate(story_data.parts, 1):
                print(f"\n[ PARTE {i} ]")
                print(f"HISTÓRIA: {texto}")
                print(f"PROMPT DE IMAGEM: {prompt}")
            print("\n" + "="*50)
            
            return {
                "usuario": nome, 
                "universo": universo, 
                "title": story_data.title,
                "cover_prompt": story_data.cover_prompt,
                "partes": story_data.parts
            }

        except Exception as e:
            print(f"⚠️ Tentativa {i_tentativa + 1}/{tentativas} falhou: {e}")
            if i_tentativa < tentativas - 1:
                time.sleep(2) # Espera antes de tentar de novo
            else:
                print(f"❌ Falha definitiva após {tentativas} tentativas.")
                raise e

# 2. FUNÇÃO GERADORA DE IMAGENS (ASSÍNCRONA)
async def gerar_imagens_async(id_arquivo, prompt_base, fotos_usuario, nome_usuario, pasta_destino, universo, ratio="2:3"):
    instrucao_usuario = f"\n\nIMPORTANTE: O personagem principal desta imagem deve ser exatamente a mesma pessoa que aparece nas fotos anexadas ({nome_usuario}). Mantenha as características faciais e adaptações ao universo: {universo}."
    prompt_final = prompt_base + instrucao_usuario
    
    tentativas = 3
    for i_tentativa in range(tentativas):
        try:
            response = await client.aio.models.generate_content(
                model="gemini-3-pro-image-preview",
                contents=[prompt_final] + fotos_usuario,
                config=types.GenerateContentConfig(
                    response_modalities=['TEXT', 'IMAGE'],
                    image_config=types.ImageConfig(aspect_ratio=ratio, image_size="2K"),
                )
            )

            for part in response.parts:
                if image := part.as_image():
                    output_path = os.path.join(pasta_destino, f"{id_arquivo}.png")
                    image.save(output_path)
                    print(f"✅ Imagem {id_arquivo} salva em: {output_path}")
                    return output_path
            
            raise ValueError("A resposta não continha uma imagem válida.")

        except Exception as e:
            print(f"⚠️ Tentativa {i_tentativa + 1}/{tentativas} falhou para a imagem {id_arquivo}: {e}")
            if i_tentativa < tentativas - 1:
                await asyncio.sleep(3) # Espera um pouco mais para imagens
            else:
                print(f"❌ Falha definitiva na imagem {id_arquivo}.")
    return None

async def executar_geracao_imagens(json_historia, pasta_fotos):
    nome = json_historia["usuario"]
    universo = json_historia["universo"]
    titulo = json_historia["title"]
    
    # Sanitização do nome da pasta para evitar erros de SO (removendo caracteres como : / \ ? * etc)
    titulo_limpo = re.sub(r'[<>:"/\\|?*]', '', titulo).replace(' ', '_')
    nome_pasta = f"historia_{titulo_limpo}"
    
    if not os.path.exists(nome_pasta):
        os.makedirs(nome_pasta)
    
    print(f"\n--- 2. GERANDO IMAGENS EM PARALELO NA PASTA: {nome_pasta} ---")
    fotos = carregar_fotos_usuario(pasta_fotos)
    
    tarefas = []
    # Imagem de Capa (16:9)
    tarefas.append(gerar_imagens_async("capa", json_historia["cover_prompt"], fotos, nome, nome_pasta, universo, ratio="16:9"))
    
    # Imagens dos Capítulos (2:3)
    for i, (texto, prompt) in enumerate(json_historia["partes"], 1):
        tarefas.append(gerar_imagens_async(f"parte_{i}", prompt, fotos, nome, nome_pasta, universo))
        
    await asyncio.gather(*tarefas)
    return nome_pasta

# 2.5. FUNÇÃO DE OTIMIZAÇÃO DE IMAGENS
def otimizar_imagens(pasta_historia):
    print(f"\n--- 2.5. OTIMIZANDO IMAGENS PARA O LIVRO WEB ---")
    pasta_web = os.path.join(pasta_historia, "web")
    if not os.path.exists(pasta_web):
        os.makedirs(pasta_web)
    
    arquivos = glob.glob(os.path.join(pasta_historia, "*.png"))
    for arquivo in arquivos:
        nome_base = os.path.basename(arquivo).replace(".png", ".webp")
        caminho_destino = os.path.join(pasta_web, nome_base)
        
        with Image.open(arquivo) as img:
            # Redimensionamento opcional para web (máximo 1200px de largura/altura para performance)
            img.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
            # Salva em WebP com qualidade 80 (balanço perfeito entre peso e fidelidade visual)
            img.save(caminho_destino, "WEBP", quality=80, optimize=True)
            
        tamanho_original = os.path.getsize(arquivo) / 1024
        tamanho_web = os.path.getsize(caminho_destino) / 1024
        print(f"📦 {nome_base}: {tamanho_original:.1f}KB -> {tamanho_web:.1f}KB")

# 3. FUNÇÃO GERADORA DE LIVRO HTML
def gerar_livro_html(json_historia, pasta_historia):
    print(f"\n--- 3. GERANDO LIVRO HTML INTERATIVO ---")
    nome = json_historia["usuario"]
    universo = json_historia["universo"]
    titulo = json_historia["title"]
    partes = json_historia["partes"]
    
    # Salvar o JSON dentro da pasta da história para integridade
    with open(os.path.join(pasta_historia, "dados.json"), "w", encoding="utf-8") as f:
        json.dump(json_historia, f, indent=4, ensure_ascii=False)

    html_content = f"""
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <title>{titulo}</title>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=Lora:ital,wght@0,400;1,400&display=swap" rel="stylesheet">
    <style>
        :root {{ --primary: #d35400; --bg: #0f0f0f; --paper: #f4ecd8; }}
        body {{ background: var(--bg); color: #333; font-family: 'Lora', serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background-image: radial-gradient(circle at center, #1a1a1a 0%, #000 100%); }}
        .book {{ position: relative; width: 1000px; height: 650px; background: var(--paper); border-radius: 5px; box-shadow: 0 30px 60px rgba(0,0,0,0.8); display: flex; overflow: hidden; }}
        .page {{ position: absolute; width: 100%; height: 100%; display: none; grid-template-columns: 1fr 1fr; animation: fadeIn 0.8s ease; }}
        .page.active {{ display: grid; }}
        .left-side {{ padding: 4rem; display: flex; flex-direction: column; justify-content: center; border-right: 1px solid rgba(0,0,0,0.1); }}
        .right-side {{ background: #000; overflow: hidden; }}
        .right-side img {{ width: 100%; height: 100%; object-fit: cover; }}
        .part-num {{ font-family: 'Cinzel', serif; color: var(--primary); margin-bottom: 1rem; font-weight: bold; }}
        .story-text {{ font-size: 1.1rem; line-height: 1.8; text-align: justify; }}
        .story-text::first-letter {{ font-size: 2.5rem; float: left; margin-right: 8px; color: var(--primary); font-family: 'Cinzel', serif; }}
        .image-prompt {{ font-size: 0.8rem; color: #777; margin-top: 1.5rem; font-style: italic; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 0.5rem; }}
        
        /* Capa Especial */
        .cover-page {{ grid-template-columns: 1fr !important; text-align: center; }}
        .cover-content {{ padding: 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--paper); }}
        .cover-title {{ font-family: 'Cinzel', serif; font-size: 3.5rem; color: var(--primary); margin-bottom: 2rem; text-transform: uppercase; letter-spacing: 4px; }}
        .cover-img-container {{ width: 80%; height: 350px; overflow: hidden; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }}
        .cover-img-container img {{ width: 100%; height: 100%; object-fit: cover; }}

        .controls {{ margin-top: 2rem; display: flex; gap: 1rem; }}
        button {{ background: transparent; border: 2px solid var(--primary); color: white; padding: 0.8rem 2rem; cursor: pointer; border-radius: 30px; font-family: 'Cinzel'; }}
        button:hover:not(:disabled) {{ background: var(--primary); box-shadow: 0 0 15px var(--primary); }}
        button:disabled {{ opacity: 0.3; }}
        @keyframes fadeIn {{ from {{ opacity: 0; }} to {{ opacity: 1; }} }}
    </style>
</head>
<body>
    <h1 style="color:white; font-family:'Cinzel';">{titulo}</h1>
    <div class="book">
        <!-- Página de Capa -->
        <div class="page active cover-page" id="p0">
            <div class="cover-content">
                <div class="cover-title">{titulo}</div>
                <div class="cover-img-container">
                    <img src="web/capa.webp">
                </div>
                <div style="margin-top: 2rem; font-family: 'Cinzel'; font-size: 1.2rem; color: #555;">Protagonizado por {nome}</div>
            </div>
        </div>

        {"".join([f'''
        <div class="page" id="p{i+1}">
            <div class="left-side">
                <div class="part-num">Capítulo {i+1}</div>
                <div class="story-text">{partes[i][0]}</div>
                <div class="image-prompt"><b>Prompt:</b> {partes[i][1]}</div>
            </div>
            <div class="right-side"><img src="web/parte_{i+1}.webp"></div>
        </div>
        ''' for i in range(len(partes))])}
    </div>
    <div class="controls">
        <button id="btnP" onclick="cp(-1)" disabled>Anterior</button>
        <button id="btnN" onclick="cp(1)">Próximo</button>
    </div>
    <script>
        let p = 0;
        let total = {len(partes)};
        function cp(d) {{
            document.getElementById(`p${{p}}`).classList.remove('active');
            p += d;
            document.getElementById(`p${{p}}`).classList.add('active');
            document.getElementById('btnP').disabled = p === 0;
            document.getElementById('btnN').disabled = p === total;
        }}
    </script>
</body>
</html>
    """
    
    html_path = os.path.join(pasta_historia, "index.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"✅ Livro HTML gerado em: {html_path}")
    return html_path

async def pipeline_principal():
    nome = NOME_USUARIO
    
    # Execução do Pipeline modular
    dados_historia = gerar_json_historia(nome, DESCRICAO_HISTORIA, UNIVERSO_HISTORIA)
    pasta_final = await executar_geracao_imagens(dados_historia, PASTA_FOTOS)
    otimizar_imagens(pasta_final)
    gerar_livro_html(dados_historia, pasta_final)
    
    print(f"\n🚀 Pipeline finalizado! História salva na pasta: {pasta_final}")

if __name__ == "__main__":
    asyncio.run(pipeline_principal())
