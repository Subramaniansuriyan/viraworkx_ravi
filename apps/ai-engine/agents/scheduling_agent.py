"""AI Scheduling Agent for interview coordination between India and US timezones"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import pytz
import json
import logging

from .base_agent import BaseAgent
from models import ActionStatus

logger = logging.getLogger(__name__)


class SchedulingAgent(BaseAgent):
    """
    AI agent for scheduling interviews between candidates in India
    and interviewers in the US, finding optimal overlapping times.
    """

    def __init__(self):
        super().__init__(agent_type="scheduling")

        # Timezone definitions
        self.india_tz = pytz.timezone('Asia/Kolkata')
        self.us_timezones = {
            'PST': pytz.timezone('America/Los_Angeles'),
            'MST': pytz.timezone('America/Denver'),
            'CST': pytz.timezone('America/Chicago'),
            'EST': pytz.timezone('America/New_York'),
        }

        # Working hours (local time)
        self.india_working_hours = (9, 21)  # 9 AM - 9 PM IST (flexible for US overlap)
        self.us_working_hours = (8, 18)  # 8 AM - 6 PM local time

        self.system_prompt = """You are an expert interview scheduler specializing in coordinating
meetings between candidates in India and hiring teams in the US.

Your task is to find optimal interview times that:
1. Respect both parties' working hours
2. Minimize inconvenience for the candidate
3. Account for timezone differences
4. Consider interview duration

Always return your suggestions as a valid JSON object."""

    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Find optimal interview slots.

        Args:
            input_data: {
                "application_id": str,
                "candidate_availability": list of datetime ranges,
                "interviewer_availability": list of datetime ranges,
                "duration_minutes": int (default 60),
                "us_timezone": str (PST, MST, CST, EST),
                "preferred_dates": list of dates (optional),
                "interview_type": str (phone, video, technical, etc.)
            }

        Returns:
            Suggested interview slots with timezone conversions
        """
        application_id = input_data.get("application_id")
        candidate_avail = input_data.get("candidate_availability", [])
        interviewer_avail = input_data.get("interviewer_availability", [])
        duration = input_data.get("duration_minutes", 60)
        us_tz_name = input_data.get("us_timezone", "PST")
        preferred_dates = input_data.get("preferred_dates", [])
        interview_type = input_data.get("interview_type", "video")

        # Create action record
        action = await self.create_action(
            action_type="interview_scheduling",
            entity_type="application",
            entity_id=application_id,
            input_payload=input_data
        )

        try:
            await self.update_action(action.id, ActionStatus.PROCESSING)

            us_tz = self.us_timezones.get(us_tz_name, self.us_timezones['PST'])

            # Find overlapping slots
            if candidate_avail and interviewer_avail:
                # Use provided availability
                slots = self._find_overlapping_slots(
                    candidate_avail, interviewer_avail, duration, us_tz
                )
            else:
                # Generate default slots for next 2 weeks
                slots = self._generate_default_slots(duration, us_tz, preferred_dates)

            if not slots:
                result = {
                    "success": False,
                    "message": "No overlapping availability found",
                    "suggested_action": "expand_availability",
                    "alternative_suggestions": self._get_alternative_suggestions(us_tz, duration)
                }
            else:
                # Rank slots by preference
                ranked_slots = self._rank_slots(slots, us_tz)

                result = {
                    "success": True,
                    "suggested_slots": ranked_slots[:5],  # Top 5 suggestions
                    "all_available_slots": len(slots),
                    "timezone_info": {
                        "candidate_timezone": "IST (Asia/Kolkata)",
                        "interviewer_timezone": f"{us_tz_name} ({us_tz.zone})"
                    },
                    "scheduling_notes": self._generate_scheduling_notes(ranked_slots[0] if ranked_slots else None, interview_type)
                }

            await self.update_action(
                action.id,
                ActionStatus.COMPLETED,
                output_payload=result
            )

            # Notify Node.js API
            await self.notify_node_api("ai/scheduling-complete", {
                "actionId": action.id,
                "applicationId": application_id,
                "result": result
            })

            return {
                "action_id": action.id,
                "status": "completed",
                "result": result
            }

        except Exception as e:
            logger.error(f"Scheduling failed for application {application_id}: {e}")
            await self.update_action(
                action.id,
                ActionStatus.FAILED,
                error_message=str(e)
            )
            raise

    def _find_overlapping_slots(
        self,
        candidate_avail: List[Dict],
        interviewer_avail: List[Dict],
        duration: int,
        us_tz: pytz.timezone
    ) -> List[Dict]:
        """Find time slots where both parties are available"""
        slots = []

        for c_slot in candidate_avail:
            c_start = datetime.fromisoformat(c_slot["start"].replace("Z", "+00:00"))
            c_end = datetime.fromisoformat(c_slot["end"].replace("Z", "+00:00"))

            for i_slot in interviewer_avail:
                i_start = datetime.fromisoformat(i_slot["start"].replace("Z", "+00:00"))
                i_end = datetime.fromisoformat(i_slot["end"].replace("Z", "+00:00"))

                # Find overlap
                overlap_start = max(c_start, i_start)
                overlap_end = min(c_end, i_end)

                # Check if overlap is long enough
                if (overlap_end - overlap_start).total_seconds() >= duration * 60:
                    slots.append({
                        "utc": overlap_start.isoformat(),
                        "india": overlap_start.astimezone(self.india_tz).strftime("%Y-%m-%d %I:%M %p IST"),
                        "us": overlap_start.astimezone(us_tz).strftime("%Y-%m-%d %I:%M %p %Z"),
                        "duration_minutes": duration
                    })

        return slots

    def _generate_default_slots(
        self,
        duration: int,
        us_tz: pytz.timezone,
        preferred_dates: List[str]
    ) -> List[Dict]:
        """Generate default available slots for the next 2 weeks"""
        slots = []
        now = datetime.now(pytz.UTC)
        end_date = now + timedelta(days=14)

        current = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)

        while current < end_date:
            # Skip weekends
            if current.weekday() < 5:
                # Check if this is a preferred date
                date_str = current.strftime("%Y-%m-%d")
                is_preferred = date_str in preferred_dates if preferred_dates else True

                if is_preferred or not preferred_dates:
                    # Find overlapping working hours
                    # India: 9 AM - 9 PM IST
                    # US: 8 AM - 6 PM local
                    # Overlap typically: 8-10 AM US = 8:30-10:30 PM IST (PST)
                    #                    or 6-8 PM US = 6:30-8:30 AM IST next day

                    # Morning slots for US (evening for India)
                    for hour in [8, 9, 10]:
                        slot_time = current.replace(hour=hour, minute=0).astimezone(us_tz)
                        india_time = slot_time.astimezone(self.india_tz)

                        # Check if within India working hours
                        if self.india_working_hours[0] <= india_time.hour <= self.india_working_hours[1]:
                            slots.append({
                                "utc": slot_time.astimezone(pytz.UTC).isoformat(),
                                "india": india_time.strftime("%Y-%m-%d %I:%M %p IST"),
                                "us": slot_time.strftime("%Y-%m-%d %I:%M %p %Z"),
                                "duration_minutes": duration,
                                "preference_score": 90 if is_preferred else 70
                            })

            current += timedelta(days=1)

        return slots

    def _rank_slots(self, slots: List[Dict], us_tz: pytz.timezone) -> List[Dict]:
        """Rank slots by preference (candidate convenience, time of day, etc.)"""
        def score_slot(slot: Dict) -> int:
            score = slot.get("preference_score", 50)

            # Parse the India time
            india_str = slot.get("india", "")
            if "PM" in india_str and "09:" not in india_str and "10:" not in india_str:
                # Prefer evening times for India (not too late)
                score += 10

            # Prefer mid-week
            try:
                utc_time = datetime.fromisoformat(slot["utc"].replace("Z", "+00:00"))
                if 1 <= utc_time.weekday() <= 3:  # Tue-Thu
                    score += 5
            except:
                pass

            return score

        return sorted(slots, key=score_slot, reverse=True)

    def _get_alternative_suggestions(self, us_tz: pytz.timezone, duration: int) -> List[str]:
        """Provide alternative suggestions when no slots are found"""
        return [
            f"Consider extending candidate availability to include 7-10 PM IST (morning {us_tz.zone})",
            "Try scheduling during US morning hours (8-10 AM) which overlaps with India evening",
            "Consider a shorter initial call (30 min) to find mutual availability",
            "Suggest asynchronous video interview as an alternative"
        ]

    def _generate_scheduling_notes(self, slot: Optional[Dict], interview_type: str) -> str:
        """Generate helpful notes for the scheduling"""
        if not slot:
            return "Unable to find suitable slots. Please expand availability windows."

        notes = []
        notes.append(f"Interview Type: {interview_type.title()}")

        if "india" in slot:
            notes.append(f"Candidate time: {slot['india']}")
        if "us" in slot:
            notes.append(f"Interviewer time: {slot['us']}")

        if interview_type == "video":
            notes.append("Ensure stable internet connection and quiet environment")
        elif interview_type == "technical":
            notes.append("Prepare coding environment and screen sharing")

        return " | ".join(notes)


# Singleton instance
scheduling_agent = SchedulingAgent()
