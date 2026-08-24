import os
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from langchain_community.document_loaders import TextLoader, PyPDFLoader, DirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import Chroma
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate

app = FastAPI(title="Địa lý 9 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Vector store global, khởi tạo 1 lần khi server start
vector_store = None


def initialize_vector_store():
    global vector_store
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("WARNING: OPENAI_API_KEY chưa được đặt.")
        return

    embeddings = OpenAIEmbeddings(api_key=api_key, model="text-embedding-3-small")

    data_dir = os.path.join(os.path.dirname(__file__), "data")
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)

    documents = []

    try:
        txt_loader = DirectoryLoader(
            data_dir, glob="**/*.txt",
            loader_cls=TextLoader,
            loader_kwargs={"autodetect_encoding": True},
        )
        documents.extend(txt_loader.load())
    except Exception as e:
        print(f"Lỗi đọc TXT: {e}")

    try:
        pdf_loader = DirectoryLoader(data_dir, glob="**/*.pdf", loader_cls=PyPDFLoader)
        documents.extend(pdf_loader.load())
    except Exception as e:
        print(f"Lỗi đọc PDF: {e}")

    if not documents:
        print("WARNING: Không tìm thấy tài liệu trong thư mục data/")
        return

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    splits = splitter.split_documents(documents)

    vector_store = Chroma.from_documents(documents=splits, embedding=embeddings)
    print(f"✅ Đã nạp {len(splits)} đoạn vào vector store.")


@app.on_event("startup")
async def startup_event():
    initialize_vector_store()


# ---------- Schema ----------

class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str


# ---------- Routes ----------

@app.get("/")
def root():
    return {"status": "ok", "message": "Địa lý 9 API đang chạy"}


@app.post("/ask", response_model=AskResponse)
def ask(body: AskRequest, x_api_key: Optional[str] = Header(default=None)):
    # Ưu tiên key từ header (frontend gửi), fallback về env
    api_key = x_api_key or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=401, detail="Thiếu OpenAI API Key. Vui lòng nhập key ở giao diện.")

    if vector_store is None:
        raise HTTPException(
            status_code=503,
            detail="Vector store chưa sẵn sàng. Kiểm tra thư mục data/ có tài liệu chưa.",
        )

    try:
        llm = ChatOpenAI(api_key=api_key, model="gpt-4o-mini", temperature=0)
        retriever = vector_store.as_retriever(search_kwargs={"k": 3})

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

        question_answer_chain = create_stuff_documents_chain(llm, prompt_template)
        rag_chain = create_retrieval_chain(retriever, question_answer_chain)

        response = rag_chain.invoke({"input": body.question})
        return AskResponse(answer=response["answer"])

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
