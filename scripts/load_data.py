import os
import sys

import psycopg
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from langchain_community.document_loaders import WebBaseLoader
from langchain_openai import OpenAIEmbeddings
from langchain_postgres import PGVector
from langchain_text_splitters import RecursiveCharacterTextSplitter
from psycopg import Connection

load_dotenv()

BASE_URL: str = "https://paulgraham.com"
_CONN_SUFFIX: str = f"{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
VECTOR_CONNECTION: str = f"postgresql+psycopg://{_CONN_SUFFIX}"
DB_CONNECTION: Connection = psycopg.connect(
    conninfo=f"postgresql://{_CONN_SUFFIX}", autocommit=True
)


def _vector_store() -> PGVector:
    """
    Vector store for storing and retrieving embeddings.
    """
    embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
    vector_store = PGVector(
        embeddings=embeddings,
        collection_name="pg_articles",
        connection=VECTOR_CONNECTION,
    )
    return vector_store


def _load_data(urls: set[str]) -> int:
    """
    Load content from the given URLs into the vector store.
    """
    if urls is None or len(urls) == 0:
        print("No new URLs to process.")
        return 0
    try:
        loader = WebBaseLoader(
            web_paths=urls,
            requests_per_second=1,
        )
        all_splits = loader.load_and_split(
            text_splitter=RecursiveCharacterTextSplitter(
                chunk_size=1000, chunk_overlap=200
            )
        )
        chunks = _vector_store().add_documents(documents=all_splits)
        print(f"Loaded {len(chunks)} documents into the vector store.")
        return 0
    except Exception as e:
        print(f"Error loading data: {e}")
        return 1


def _article_links() -> set[str]:
    """
    Get all article links from the main page of Paul Graham's website.
    """
    response = requests.get(f"{BASE_URL}/articles.html")
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    links = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.endswith(".html") and not href.startswith("http"):
            links.add(f"{BASE_URL}/{href}")
    return links


def _update_progress(urls: set[str]) -> None:
    """
    Inserts all processed URLs in the database. This is used to avoid reprocessing
    URLs that have already been processed.
    """
    cursor = DB_CONNECTION.cursor()
    for url in urls:
        # Check if the URL is already processed
        cursor.execute(
            "INSERT INTO processed_urls (url) VALUES (%s) ON CONFLICT DO NOTHING",
            (url,),
        )
    cursor.close()


def _find_processed_urls() -> set[str]:
    """
    Find all processed URLs in the database.
    """
    cursor = DB_CONNECTION.cursor()
    cursor.execute("SELECT url FROM processed_urls")
    processed_urls = {row[0] for row in cursor.fetchall()}
    cursor.close()
    return processed_urls


def main() -> int:
    links = _article_links()
    processed_urls = _find_processed_urls()
    res = _load_data(links - processed_urls)
    if res == 0:
        _update_progress(links - processed_urls)
    return res


if __name__ == "__main__":
    sys.exit(main())
