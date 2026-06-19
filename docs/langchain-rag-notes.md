# LangChain & RAG — Student Notes

## What is RAG?

**RAG (Retrieval-Augmented Generation)** — give an LLM access to your own data by retrieving relevant pieces and passing them as context in the prompt.

Without RAG: the LLM only knows what it was trained on.
With RAG: the LLM answers using your database, documents, or any custom data.

```
User Question → Load → Documents → Split → Embed
                                              ↓
        Answer ← LLM ← Prompt ← Retrieve ← Store
```

These 8 stages are all you need to understand. LangChain gives you pre-built code for each one.

---

## What is LangChain?

A Python framework that provides composable building blocks for each stage of the RAG pipeline. Instead of writing custom glue code between an LLM, a vector database, and your data, you plug together LangChain components.

Install:
```bash
pip install langchain langchain-openai langchain-community faiss-cpu
```

---

## The 8 Stages

### Stage 1 — Load

Fetch your raw data. LangChain has loaders for databases, PDFs, CSVs, YouTube, and more.

```python
# From database rows (our project)
rows = db.query(Application).filter(...).all()

# From a PDF
from langchain_community.document_loaders import PyPDFLoader
documents = PyPDFLoader("resume.pdf").load()

# From a CSV
from langchain_community.document_loaders import CSVLoader
documents = CSVLoader("data.csv").load()
```

---

### Stage 2 — Documents

Convert your data into LangChain `Document` objects — the universal format for the pipeline.

```python
from langchain_core.documents import Document

documents = [
    Document(
        page_content=(
            f"Applicant: {app.name}\n"
            f"Status: {app.status}\n"
            f"Years of experience: {app.years_experience}\n"
            f"Cover letter: {app.cover_letter or 'Not provided'}"
        ),
        metadata={"id": app.id, "name": app.name, "status": app.status},
    )
    for app in rows
]
```

A `Document` has two fields:
- `page_content` — what gets embedded and shown to the LLM. Format it like natural language for better retrieval.
- `metadata` — never shown to the LLM; used for filtering and citations.

---

### Stage 3 — Split

Split documents into smaller chunks before embedding. Smaller chunks → more precise retrieval.

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = splitter.split_documents(documents)
```

`chunk_overlap=50` repeats 50 characters between consecutive chunks so context at boundaries isn't lost.

Always use `split_documents` (not `split_text`) when working with Document objects — it preserves metadata.

| Splitter | When to use |
|---|---|
| `RecursiveCharacterTextSplitter` | Default for most cases |
| `TokenTextSplitter` | Precise token-count control |
| `SemanticChunker` | Splits at meaning boundaries — best quality, slowest |

---

### Stage 4 — Embed + Store

Convert chunks into vectors and index them for similarity search.

```python
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS

embeddings = OpenAIEmbeddings(api_key=settings.openai_api_key)
vector_store = FAISS.from_documents(chunks, embeddings)
```

`FAISS` is in-memory — no infrastructure needed, ideal for demos.

**Critical rule:** the same embedding model must be used at indexing time and at query time. Mixing models makes similarity scores meaningless.

**Swappable vector stores:**
```python
from langchain_chroma import Chroma
vector_store = Chroma.from_documents(chunks, embeddings, persist_directory="./db")

from langchain_pinecone import PineconeVectorStore
vector_store = PineconeVectorStore.from_documents(chunks, embeddings, index_name="apps")
```

**Swappable embedding models:**
```python
from langchain_huggingface import HuggingFaceEmbeddings
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")  # free, local
```

---

### Stage 5 — Retrieve

Wrap the vector store in a retriever. When invoked with a question, it embeds the question and returns the `k` most similar chunks.

```python
retriever = vector_store.as_retriever(search_kwargs={"k": 3})
```

**Retrieval strategies:**
```python
# MMR — reduces redundant results
retriever = vector_store.as_retriever(
    search_type="mmr",
    search_kwargs={"k": 3, "fetch_k": 10}
)

# Score threshold — only return results above a similarity cutoff
retriever = vector_store.as_retriever(
    search_type="similarity_score_threshold",
    search_kwargs={"score_threshold": 0.7, "k": 3}
)

# Metadata filter
retriever = vector_store.as_retriever(
    search_kwargs={"k": 3, "filter": {"status": "pending"}}
)
```

---

### Stage 6 — Prompt

Structure the retrieved context and the user's question into a prompt the LLM understands.

```python
from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a helpful assistant for a job application tracker. "
        "Use the following application data to answer the user's question.\n\n"
        "{context}",
    ),
    ("human", "{question}"),
])
```

`{context}` and `{question}` are placeholders filled at runtime by the chain. Context goes in the system message so the LLM treats it as background, not part of the user's question.

To reduce hallucinations:
```python
"Answer ONLY using the application data below. "
"If the answer is not in the data, say: 'I don't have that information.'\n\n{context}"
```

---

### Stage 7 — Model

Pass the filled prompt to an LLM to generate the answer.

```python
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini", api_key=settings.openai_api_key)
```

Set `temperature=0` for RAG — you want consistent, grounded answers, not creative variation:
```python
model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
```

**Swappable models (chain stays the same):**
```python
from langchain_anthropic import ChatAnthropic
model = ChatAnthropic(model="claude-sonnet-4-6", api_key=settings.anthropic_api_key)

from langchain_ollama import ChatOllama
model = ChatOllama(model="llama3.2")  # local, no API key needed
```

---

### Stage 8 — Chain (LCEL)

Compose all stages together with the `|` pipe operator. Output of each step becomes input to the next.

```python
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

def _format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

chain = (
    {"context": retriever | _format_docs, "question": RunnablePassthrough()}
    | prompt
    | model
    | StrOutputParser()
)

answer = chain.invoke(body.question)
```

**How the dict works:** the question travels two parallel paths simultaneously:
- `retriever | _format_docs` → retrieves chunks, joins them into one string → fills `{context}`
- `RunnablePassthrough()` → passes the question through unchanged → fills `{question}`

`StrOutputParser()` extracts `.content` from the LLM's response object into a plain string.

**Same result without LCEL (more explicit):**
```python
docs = retriever.invoke(body.question)
context = _format_docs(docs)
messages = prompt.format_messages(context=context, question=body.question)
answer = model.invoke(messages).content
```

---

## Complete Working Example

```python
from fastapi import APIRouter, Depends, HTTPException
from openai import AuthenticationError, RateLimitError
from pydantic import BaseModel
from sqlalchemy.orm import Session

from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

router = APIRouter(tags=["AI"])

class AskRequest(BaseModel):
    question: str

def _format_docs(docs: list[Document]) -> str:
    return "\n\n".join(doc.page_content for doc in docs)

@router.post("/ask")
def ask(body: AskRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    settings = get_settings()
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not set in .env")

    # 1. LOAD
    rows = db.query(Application).filter(Application.submitted_by == current_user.email).all()
    if not rows:
        return {"answer": "No applications found."}

    # 2. DOCUMENTS
    documents = [
        Document(
            page_content=f"Applicant: {app.name}\nStatus: {app.status}\nExperience: {app.years_experience}",
            metadata={"id": app.id, "name": app.name},
        )
        for app in rows
    ]

    # 3. SPLIT
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_documents(documents)

    # 4. EMBED + STORE
    embeddings = OpenAIEmbeddings(api_key=settings.openai_api_key)
    vector_store = FAISS.from_documents(chunks, embeddings)

    # 5. RETRIEVE
    retriever = vector_store.as_retriever(search_kwargs={"k": 3})

    # 6. PROMPT
    prompt = ChatPromptTemplate.from_messages([
        ("system", "Answer using the application data below.\n\n{context}"),
        ("human", "{question}"),
    ])

    # 7. MODEL
    model = ChatOpenAI(model="gpt-4o-mini", temperature=0, api_key=settings.openai_api_key)

    # 8. CHAIN
    chain = (
        {"context": retriever | _format_docs, "question": RunnablePassthrough()}
        | prompt
        | model
        | StrOutputParser()
    )

    try:
        return {"answer": chain.invoke(body.question)}
    except AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid OpenAI API key")
    except RateLimitError:
        raise HTTPException(status_code=429, detail="Rate limit hit — try again shortly")
```

---

## What's Swappable

Each component can be replaced without changing the rest of the pipeline:

| Component | Default | Alternatives |
|---|---|---|
| Loader | DB query | PDF, CSV, YouTube, web pages |
| Splitter | `RecursiveCharacterTextSplitter` | Token, Semantic, Markdown |
| Embeddings | `OpenAIEmbeddings` | HuggingFace (free, local) |
| Vector store | FAISS (in-memory) | Chroma, pgvector, Pinecone |
| Retriever | similarity, k=3 | MMR, score threshold, metadata filter |
| LLM | `gpt-4o-mini` | `gpt-4o`, Claude, Llama (local) |

---

## Production Note

This demo re-indexes on every request. For production, index once and load on each request:

```python
# Index once (run separately)
vector_store = Chroma.from_documents(chunks, embeddings, persist_directory="./db")

# Load per request
vector_store = Chroma(persist_directory="./db", embedding_function=embeddings)
retriever = vector_store.as_retriever(search_kwargs={"k": 3})
```
