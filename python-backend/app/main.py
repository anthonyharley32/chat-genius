from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import chat

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://web:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Add prefix to router
app.include_router(chat.router, prefix="/api") 