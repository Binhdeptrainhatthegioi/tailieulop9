import streamlit as st
import os
from langchain_community.document_loaders import TextLoader, PyPDFLoader, DirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import Chroma
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate

# --- Cấu hình giao diện ---
st.set_page_config(page_title="Tra cứu Địa lý 9", page_icon="🌍", layout="centered")

st.title("🌍 Trợ lý ảo Tra cứu Địa lý Lớp 9")
st.markdown("Hỏi bất cứ điều gì về Địa lý lớp 9 dựa trên tài liệu đã cung cấp.")

# --- Lấy API Key từ secrets hoặc sidebar ---
# Trên Streamlit Cloud: điền OPENAI_API_KEY trong App Settings > Secrets
# Khi chạy local: điền vào .streamlit/secrets.toml hoặc nhập tay ở sidebar
default_key = st.secrets.get("OPENAI_API_KEY", "")

with st.sidebar:
    st.header("Cấu hình")
    openai_api_key = st.text_input(
        "Nhập OpenAI API Key:",
        value=default_key,
        type="password",
        help="Trên Streamlit Cloud, key được lấy tự động từ Secrets."
    )
    st.markdown("[Nhận API Key tại đây](https://platform.openai.com/api-keys)")
    
    st.divider()
    st.info("Ứng dụng này đã được tích hợp sẵn kiến thức Địa lý lớp 9 và dùng OpenAI để trả lời câu hỏi của bạn.")

# Khởi tạo session state để lưu trữ lịch sử chat và vector store
if "messages" not in st.session_state:
    st.session_state.messages = []
if "vector_store" not in st.session_state:
    st.session_state.vector_store = None

# Hàm xử lý tài liệu và tạo vector store
@st.cache_resource(show_spinner=False)
def initialize_vector_store(api_key):
    # Khởi tạo embeddings
    embeddings = OpenAIEmbeddings(api_key=api_key, model="text-embedding-3-small")
    
    # Đọc tất cả các file txt và pdf trong thư mục data
    data_dir = "data"
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
        
    documents = []
    
    # Đọc TXT
    txt_loader = DirectoryLoader(data_dir, glob="**/*.txt", loader_cls=TextLoader, loader_kwargs={'autodetect_encoding': True})
    documents.extend(txt_loader.load())
    
    # Đọc PDF
    pdf_loader = DirectoryLoader(data_dir, glob="**/*.pdf", loader_cls=PyPDFLoader)
    documents.extend(pdf_loader.load())
    
    if not documents:
        return None
    
    # Cắt nhỏ tài liệu
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    splits = text_splitter.split_documents(documents)
    
    # Tạo Chroma vector store
    vector_store = Chroma.from_documents(documents=splits, embedding=embeddings)
    return vector_store

if openai_api_key:
    # Nạp tài liệu
    with st.spinner("Đang nạp và phân tích tài liệu (RAG)..."):
        try:
            if st.session_state.vector_store is None:
                vector_store = initialize_vector_store(openai_api_key)
                if vector_store:
                    st.session_state.vector_store = vector_store
                    st.success("Khởi tạo dữ liệu thành công!")
                else:
                    st.warning("Lỗi dữ liệu: Hệ thống chưa có dữ liệu mẫu.")
        except Exception as e:
            st.error(f"Lỗi khi nạp tài liệu: {e}")
            
    # Hiển thị lịch sử chat
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    # Xử lý khi người dùng nhập câu hỏi
    if prompt := st.chat_input("Nhập câu hỏi về Địa lý..."):
        # Thêm câu hỏi của user vào giao diện
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        # Xử lý sinh câu trả lời
        if st.session_state.vector_store:
            with st.chat_message("assistant"):
                with st.spinner("Đang suy nghĩ..."):
                    try:
                        # Khởi tạo mô hình
                        llm = ChatOpenAI(api_key=openai_api_key, model="gpt-4o-mini", temperature=0)
                        
                        # Retriever
                        retriever = st.session_state.vector_store.as_retriever(search_kwargs={"k": 3})
                        
                        # System prompt
                        system_prompt = (
                            "Bạn là một trợ lý ảo môn Địa lý lớp 9 thân thiện và thông minh. "
                            "Sử dụng các thông tin sau để trả lời câu hỏi của người dùng. "
                            "Nếu bạn không biết câu trả lời từ tài liệu, hãy nói rằng bạn không có thông tin trong tài liệu. "
                            "Luôn ưu tiên trả lời bằng tiếng Việt.\n\n"
                            "{context}"
                        )
                        prompt_template = ChatPromptTemplate.from_messages([
                            ("system", system_prompt),
                            ("human", "{input}"),
                        ])
                        
                        # Tạo chain
                        question_answer_chain = create_stuff_documents_chain(llm, prompt_template)
                        rag_chain = create_retrieval_chain(retriever, question_answer_chain)
                        
                        # Lấy kết quả
                        response = rag_chain.invoke({"input": prompt})
                        answer = response["answer"]
                        
                        st.markdown(answer)
                        # Lưu vào lịch sử
                        st.session_state.messages.append({"role": "assistant", "content": answer})
                        
                    except Exception as e:
                        st.error(f"Đã xảy ra lỗi: {e}")
        else:
            st.error("Hệ thống đang gặp sự cố khi khởi tạo dữ liệu.")
else:
    st.info("Vui lòng nhập OpenAI API Key ở thanh bên trái để bắt đầu.")
