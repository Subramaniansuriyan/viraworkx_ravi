"""AI Screening Agent using Claude"""
from anthropic import Anthropic
import os
import json

class ScreeningAgent:
    def __init__(self):
        self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    async def screen(self, candidate: dict, job: dict) -> dict:
        prompt = f"""Analyze this candidate against job requirements.
        
        Candidate: {json.dumps(candidate)}
        Job: {json.dumps(job)}
        
        Return JSON with: match_score (0-100), strengths, concerns, recommendation, summary"""
        
        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )
        return json.loads(response.content[0].text)
