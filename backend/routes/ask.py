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

from auth.auth import get_current_user
from config import get_settings
from db.database import get_db
from db.models import User, Application

router = APIRouter(tags=["ask"])

class AskRequest(BaseModel):
    question: str

def _format_docs (docs: list[Document]) -> str:
    return "\n\n".join(doc.page_content for doc in docs)


@router.post("/ask")
def ask(
    body: AskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    settings = get_settings()
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")


#process that we have to code

#User Question  →  Load  →  Documents  →  Split  →  Embed
#                                                        ↓
#          Answer  ←  LLM  ←  Prompt  ←  Retrieve  ←  Store


# stage 1 load


    rows = (
        db.query(Application)
        .filter(Application.submitted_by == current_user.email)
        .all()
    )
    if not rows:
        raise HTTPException(status_code=404, detail="No applications found for user")



# stage 2 convert my loaded text data into the universal data format ( Document object ) that langchain can understand and work with

    documents = [

        Document(
            page_content=(
                f"Application : {app.id}\n"
                f"Email : {app.email}\n"
                f"Years of Experience : {app.years_experience}\n"
                f"Cover Letter : {app.cover_letter}\n"
                f"Status : {app.status}\n"
            ),
            metadata={"id": app.id, "name": app.name, "status":app.status}    
        )

        for app in rows            
    ]

#stage 3 split the documents into smaller chunks
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_documents(documents)

# stage 4 embed the chunks and store them in a vector database ( here we are using FAISS which is an in-memory vector store )

    embeddings = OpenAIEmbeddings(api_key=settings.openai_api_key)
    vector_store = FAISS.from_documents(chunks, embeddings)

# stage 5 retrieve the relevant chunks from the vector database based on the user question
    retriever = vector_store.as_retriever(search_kwargs={"k": 3})

# stage 6 create a prompt template to format the retrieved chunks and the user question in a way that the LLM can understand and generate a relevant answer
    prompt= ChatPromptTemplate.from_messages(
        [
            ("system", "You are a helpful assistant. You are supposed to explain things in detail and work as a senior software engineer following good established practices specifically guardrails designed to keep data isolated in a sandbox environment "),
            ("user", "Context: {context}\n\nQuestion: {question}")
        ]
    )


#stage 7 create a LLM instance 

    model = ChatOpenAI( model = "gpt-4o-mini", api_key=settings.openai_api_key)

    chain = (

        {"context": retriever | _format_docs, "question": RunnablePassthrough() }
        | prompt
        | model
        | StrOutputParser()
    )

    try: 
        answer = chain.invoke(body.question)
    except AuthenticationError:
        raise HTTPException(status_code=401, detail="Authentication failed")
    except RateLimitError:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    return {"answer": answer}