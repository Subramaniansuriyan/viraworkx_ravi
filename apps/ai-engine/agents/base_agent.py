"""Base Agent class with HITL support"""
from abc import ABC, abstractmethod
from anthropic import Anthropic
from datetime import datetime
from typing import Optional, Dict, Any
import logging
import json
import httpx

from config import settings
from models import AiAction, ActionStatus, async_session

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """Base class for all AI agents with Human-in-the-Loop support"""

    def __init__(self, agent_type: str):
        self.agent_type = agent_type
        self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.model = settings.default_model
        self.max_tokens = settings.max_tokens
        self.temperature = settings.temperature

    @abstractmethod
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the agent's main task"""
        pass

    async def call_llm(self, system_prompt: str, user_prompt: str) -> str:
        """Call Claude API with the given prompts"""
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            raise

    async def parse_json_response(self, response: str) -> Dict[str, Any]:
        """Parse JSON from LLM response, handling markdown code blocks"""
        # Remove markdown code blocks if present
        if "```json" in response:
            response = response.split("```json")[1].split("```")[0]
        elif "```" in response:
            response = response.split("```")[1].split("```")[0]

        try:
            return json.loads(response.strip())
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            logger.error(f"Response was: {response}")
            raise ValueError(f"Invalid JSON response from LLM: {e}")

    async def create_action(
        self,
        action_type: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        input_payload: Optional[Dict] = None,
        requires_approval: bool = False,
        approval_reason: Optional[str] = None
    ) -> AiAction:
        """Create a new AI action record"""
        async with async_session() as session:
            action = AiAction(
                agent_type=self.agent_type,
                action_type=action_type,
                entity_type=entity_type,
                entity_id=entity_id,
                input_payload=input_payload,
                status=ActionStatus.PENDING.value,
                requires_approval=requires_approval,
                approval_reason=approval_reason,
                created_at=datetime.utcnow()
            )
            session.add(action)
            await session.commit()
            await session.refresh(action)
            return action

    async def update_action(
        self,
        action_id: str,
        status: ActionStatus,
        output_payload: Optional[Dict] = None,
        error_message: Optional[str] = None,
        confidence_score: Optional[int] = None,
        match_score: Optional[int] = None
    ) -> AiAction:
        """Update an AI action record"""
        async with async_session() as session:
            action = await session.get(AiAction, action_id)
            if action:
                action.status = status.value
                if output_payload:
                    action.output_payload = output_payload
                if error_message:
                    action.error_message = error_message
                if confidence_score is not None:
                    action.confidence_score = confidence_score
                if match_score is not None:
                    action.match_score = match_score

                if status == ActionStatus.PROCESSING:
                    action.executed_at = datetime.utcnow()
                elif status in [ActionStatus.COMPLETED, ActionStatus.FAILED]:
                    action.completed_at = datetime.utcnow()

                await session.commit()
                await session.refresh(action)
            return action

    async def notify_node_api(self, endpoint: str, data: Dict[str, Any]):
        """Send notification to Node.js API"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.node_api_url}/api/v1/{endpoint}",
                    json=data,
                    timeout=10.0
                )
                return response.json()
        except Exception as e:
            logger.error(f"Failed to notify Node API: {e}")
            return None

    def should_require_approval(self, score: int) -> bool:
        """Determine if an action requires HR approval based on score"""
        return score < settings.require_approval_threshold

    def should_auto_reject(self, score: int) -> bool:
        """Determine if a candidate should be auto-rejected"""
        return score < settings.auto_reject_threshold
