from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os

app = FastAPI(title="ViraWorkx AI Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScreeningRequest(BaseModel):
    candidate_profile: dict
    job_requirements: dict
    resume_content: Optional[str] = None

class ScreeningResponse(BaseModel):
    match_score: int
    strengths: List[str]
    concerns: List[str]
    recommendation: str
    summary: str

@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-engine"}

@app.post("/screen", response_model=ScreeningResponse)
async def screen_candidate(request: ScreeningRequest):
    # TODO: Integrate Claude API
    return ScreeningResponse(
        match_score=88,
        strengths=["Strong technical background", "Relevant experience"],
        concerns=["Limited leadership experience"],
        recommendation="proceed",
        summary="Good candidate match for the position."
    )

@app.post("/parse-resume")
async def parse_resume(resume_text: str):
    return {"parsed": True, "skills": ["Python", "React", "AWS"]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
