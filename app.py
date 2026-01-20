import streamlit as st
import asyncio
import time
import os
import re
from datetime import datetime
from historia import (
    gerar_json_historia, 
    executar_geracao_imagens, 
    otimizar_imagens, 
    gerar_livro_html,
    NOME_USUARIO,
    DESCRICAO_HISTORIA,
    UNIVERSO_HISTORIA,
    PASTA_FOTOS
)

# Configuração da Página
st.set_page_config(page_title="Story Lab 🧪", page_icon="📖", layout="wide")

st.markdown("""
<style>
    .reportview-container .main .block-container { padding-top: 2rem; }
    .stButton>button { width: 100%; border-radius: 5px; height: 3em; background-color: #d35400; color: white; border: none; }
    .stButton>button:hover { background-color: #e67e22; color: white; }
    .status-card { background-color: #1e1e1e; padding: 1.5rem; border-radius: 10px; border-left: 5px solid #d35400; margin-bottom: 1rem; }
</style>
""", unsafe_allow_html=True)

st.title("🧪 Story Lab: Laboratório de Narrativas")
st.write("Controle total sobre a geração de histórias, imagens e livros interativos.")

# --- SIDEBAR: CONFIGURAÇÕES ---
with st.sidebar:
    st.header("⚙️ Configurações")
    nome = st.text_input("Nome do Protagonista", NOME_USUARIO)
    universo = st.text_input("Universo da História", UNIVERSO_HISTORIA)
    pasta_fotos = st.text_input("Pasta de Fotos", PASTA_FOTOS)
    
    st.divider()
    st.info("O Laboratório permite validar a história antes de gerar as imagens, economizando tempo e tokens.")

# --- ESTADO DA SESSÃO ---
if 'dados_historia' not in st.session_state:
    st.session_state.dados_historia = None
if 'pasta_final' not in st.session_state:
    st.session_state.pasta_final = None

# --- COLUNAS PRINCIPAIS ---
col_input, col_output = st.columns([1, 1])

with col_input:
    st.subheader("📝 1. Defina a Trama")
    descricao = st.text_area("Descrição da História", DESCRICAO_HISTORIA, height=150)
    
    if st.button("Gerar Estrutura da História"):
        t_inicio = time.time()
        with st.spinner("Convidando as musas inspiradoras..."):
            try:
                # Chama a função do script original
                dados = gerar_json_historia(nome, descricao, universo)
                st.session_state.dados_historia = dados
                t_fim = time.time()
                st.success(f"História estruturada em {t_fim - t_inicio:.2f}s!")
            except Exception as e:
                st.error(f"Erro na geração: {e}")

    if st.session_state.dados_historia:
        st.divider()
        st.subheader("🖼️ 2. Produção Visual")
        st.write("Clique abaixo para gerar as imagens e o livro final.")
        
        if st.button("🚀 Iniciar Produção Completa"):
            t_total_inicio = time.time()
            
            # 1. Gerar Imagens
            with st.status("Produzindo Imagens (IA)...", expanded=True) as status:
                t_img_inicio = time.time()
                pasta = asyncio.run(executar_geracao_imagens(st.session_state.dados_historia, pasta_fotos))
                st.session_state.pasta_final = pasta
                t_img_fim = time.time()
                st.write(f"✅ Imagens geradas em {t_img_fim - t_img_inicio:.2f}s")
                
                # 2. Otimizar
                st.write("🎨 Otimizando para Web...")
                otimizar_imagens(pasta)
                st.write(f"✅ Imagens otimizadas")
                
                # 3. HTML
                st.write("📖 Montando Livro Interativo...")
                html_path = gerar_livro_html(st.session_state.dados_historia, pasta)
                st.write(f"✅ HTML gerado em {html_path}")
                
                status.update(label="Produção Finalizada!", state="complete", expanded=False)
            
            t_total_fim = time.time()
            st.balloons()
            st.success(f"Pipeline completo finalizado em {t_total_fim - t_total_inicio:.2f}s!")
            st.info(f"Pasta: `{st.session_state.pasta_final}`")

with col_output:
    st.subheader("📖 Saída Parcial / Preview")
    
    if st.session_state.dados_historia:
        st.markdown(f"### 🏷️ Título: {st.session_state.dados_historia['title']}")
        st.markdown(f"**Capa (Prompt):** *{st.session_state.dados_historia['cover_prompt']}*")
        
        for i, (texto, prompt) in enumerate(st.session_state.dados_historia['partes'], 1):
            with st.expander(f"Capítulo {i}"):
                st.write(f"**História:** {texto}")
                st.caption(f"**Prompt da Imagem:** {prompt}")
    else:
        st.warning("Aguardando geração da estrutura da história...")

    if st.session_state.pasta_final:
        st.divider()
        st.subheader("🖼️ Galeria de Imagens")
        # Mostrar imagens da pasta web (otimizadas)
        pasta_web = os.path.join(st.session_state.pasta_final, "web")
        if os.path.exists(pasta_web):
            imgs = [os.path.join(pasta_web, f) for f in os.listdir(pasta_web) if f.endswith(".webp")]
            st.image(imgs, width=200, caption=[os.path.basename(f) for f in imgs])
