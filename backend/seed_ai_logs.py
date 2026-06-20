import asyncio
import random
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import transactional_session
from app.models.ai_log import AILog

async def seed_logs():
    async with transactional_session() as session:
        providers = [
            ("Gemini", "gemini-1.5-pro", 0.95),
            ("Gemini", "gemini-1.5-flash", 0.98),
            ("OpenRouter", "anthropic/claude-3-haiku", 0.96),
            ("OpenRouter", "openai/gpt-4o", 0.92)
        ]
        
        now = datetime.now(timezone.utc)
        logs = []
        
        # Generate 300 logs over the last 30 days
        for _ in range(300):
            days_ago = random.uniform(0, 30)
            created_at = now - timedelta(days=days_ago)
            
            provider, model, success_prob = random.choice(providers)
            is_success = random.random() < success_prob
            
            status = "success" if is_success else "error"
            
            if is_success:
                latency = int(random.gauss(800, 200) if "flash" in model or "haiku" in model else random.gauss(2500, 800))
                latency = max(200, latency)
                error_msg = None
            else:
                latency = int(random.uniform(50, 500))
                error_msg = random.choice(["Rate limit exceeded", "Connection timeout", "Invalid API key"])
            
            prompts = [
                "Summarize the main findings of the attached document.",
                "What is the methodology used in this research?",
                "Compare the strengths and weaknesses of these two papers.",
                "Explain the results section in simple terms.",
                "Generate a citation for this paper in APA format."
            ]
            
            responses = [
                "The main findings indicate a significant correlation...",
                "The methodology consists of a randomized controlled trial...",
                "Paper 1 strengths: robust sample size. Paper 2 strengths: novel approach.",
                "In simple terms, the experiment showed that...",
                "Smith, J. (2023). A study on AI. Journal of AI, 1(1), 1-10."
            ]
            
            log = AILog(
                id=uuid.uuid4(),
                provider=provider,
                model=model,
                prompt=random.choice(prompts),
                response=random.choice(responses) if is_success else None,
                latency_ms=latency,
                status=status,
                error_message=error_msg,
            )
            # Override created_at which defaults to now()
            log.created_at = created_at
            session.add(log)
            
        print("Seeded 300 mock AI logs.")

if __name__ == "__main__":
    asyncio.run(seed_logs())
