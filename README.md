# 🌍 Trợ lý ảo Địa lý Lớp 9

Ứng dụng hỏi đáp Địa lý lớp 9 sử dụng RAG (Retrieval-Augmented Generation) với LangChain + OpenAI.

---

## 🚀 Deploy lên Streamlit Cloud (miễn phí)

### Bước 1: Push code lên GitHub
1. Tạo repo mới trên [github.com](https://github.com/new)
2. Chạy các lệnh sau trong terminal:

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Bước 2: Deploy trên Streamlit Cloud
1. Truy cập [share.streamlit.io](https://share.streamlit.io) và đăng nhập bằng GitHub
2. Nhấn **"New app"**
3. Chọn repo vừa tạo, branch `main`, file `app.py`
4. Nhấn **"Deploy!"**

### Bước 3: Thêm OpenAI API Key (quan trọng)
1. Vào app vừa deploy → **Settings** (góc phải) → **Secrets**
2. Dán nội dung sau vào ô secrets:

```toml
OPENAI_API_KEY = "sk-your-actual-api-key-here"
```

3. Nhấn **Save** → app sẽ tự restart và sẵn sàng dùng

---

## 📁 Thêm tài liệu Địa lý

Đặt file `.txt` hoặc `.pdf` vào thư mục `data/` rồi commit lên GitHub. App sẽ tự động đọc và lập chỉ mục.

---

## 💻 Chạy local

```bash
pip install -r requirements.txt
streamlit run app.py
```

Tạo file `.streamlit/secrets.toml` với nội dung:
```toml
OPENAI_API_KEY = "sk-your-key"
```
