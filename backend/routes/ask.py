from fastapi import APIRouter, Depends, HTTPException
from openai imoport AuthenticationError, RateLimitError
from pyantic import BaseModel
from sqlalchemy.orm import Session

from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langhain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langhain_core.runnables import RunnablePassthrough
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitter import RecursiveCharacterTextSplitter

from auth.auth import get_current_user
from config import get_settings
from db.database import get_db
from db.models import User, Application

router = APIRouter(prefix="/ask", tags=["ask"])

class AskRequest(BaseModel):
    question: str

def _format_Docs (docs: list[Document]) -> str:
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
                                                        ↓
#          Answer  ←  LLM  ←  Prompt  ←  Retrieve  ←  Store

