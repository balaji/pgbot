import os

from langchain_core.documents import Document
from typing_extensions import List, TypedDict
from langchain import hub
from langchain_openai import OpenAIEmbeddings
from langchain.chat_models import init_chat_model
from langgraph.graph import START, StateGraph
from langchain_postgres import PGVector
from dotenv import load_dotenv

load_dotenv()

_CONN_SUFFIX: str = f"{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
VECTOR_CONNECTION: str = f"postgresql+psycopg://{_CONN_SUFFIX}"

llm = init_chat_model("gpt-4o-mini", model_provider="openai")
embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
vector_store = PGVector(
    embeddings=embeddings,
    collection_name="pg_articles",
    connection=VECTOR_CONNECTION,
)
prompt = hub.pull("rlm/rag-prompt")


class State(TypedDict):
    question: str
    context: List[Document]
    answer: str


def retrieve(state: State):
    retrieved_docs = vector_store.similarity_search(state["question"])
    return {"context": retrieved_docs}


def generate(state: State):
    docs_content = "\n\n".join(doc.page_content for doc in state["context"])
    messages = prompt.invoke({"question": state["question"], "context": docs_content})
    print(f"Prompt: {messages}")
    response = llm.invoke(messages)
    return {"answer": response.content}


if __name__ == "__main__":
    # intended to be used as a verification script for the RAG pipeline
    graph_builder = StateGraph(State).add_sequence([retrieve, generate])
    graph_builder.add_edge(START, "retrieve")
    graph = graph_builder.compile()
    result = graph.invoke({"question": "What makes a good founder?"})

    print(f"Answer: {result['answer']}")
