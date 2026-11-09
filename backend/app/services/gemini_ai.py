import os
from typing import Dict, Any, List
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class GeminiAIService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.is_configured = bool(self.api_key and self.api_key != "mock_gemini_api_key")

    async def generate_campaign_brief(
        self,
        company_name: str,
        objective: str,
        target_audience: str,
        budget: float,
        platforms: List[str],
    ) -> Dict[str, Any]:
        """
        Generates an autonomous marketing strategy and campaign brief for a client.
        """
        platforms_str = ", ".join(platforms) if platforms else "Meta & Google"
        brief_prompt = f"""
        Act as an Elite Creative Director & Growth Architect at 'The Desi Muchads'.
        Formulate a high-impact digital marketing brief for:
        Client: {company_name}
        Objective: {objective}
        Target Audience: {target_audience}
        Budget: INR {budget:,.2f}
        Target Platforms: {platforms_str}
        
        Provide:
        1. Core Strategic Angle & Hook
        2. Content Pillars & Ad Creative Formats
        3. Funnel Structure (Top of Funnel, Middle, Bottom)
        4. Key Performance Indicators (Target CPA, ROAS, Engagement Rate)
        """

        if not self.is_configured:
            # Fallback high-utility response if Gemini key not set
            return {
                "headline": f"Hyper-Growth Acquisition Playbook: {company_name}",
                "strategic_angle": f"Cultural resonance meets performance-driven storytelling targeting {target_audience}.",
                "funnel_architecture": {
                    "top_of_funnel": "High-velocity Reels & TikTok-style short-form hooks highlighting pain points.",
                    "middle_of_funnel": "Carousels with case studies, social proof, and comparison tables.",
                    "bottom_of_funnel": "Urgency-driven Meta retargeting & Google Search High-Intent Ads.",
                },
                "target_metrics": {
                    "estimated_roas": "3.8x - 4.5x",
                    "target_cpc": "INR 4.50 - 7.00",
                    "expected_conversions": f"{int(budget / 350)} leads/sales",
                },
                "recommended_creative_assets": [
                    "3x UGC-style vertical video hooks (15s)",
                    "2x High-converting Carousel graphic designs",
                    "5x Ad copy variants for A/B testing",
                ],
            }

        try:
            from google import genai
            client = genai.Client(api_key=self.api_key)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=brief_prompt,
            )
            return {
                "raw_brief": response.text,
                "status": "GENERATED_VIA_GEMINI",
            }
        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}")
            return {
                "headline": f"Playbook for {company_name}",
                "strategic_angle": f"Focused growth strategy on {platforms_str}",
                "error_fallback": str(e),
            }

    async def generate_content_ideation(
        self,
        company_name: str,
        industry: str,
        pillar: str,
        month: str,
    ) -> List[Dict[str, Any]]:
        return [
            {
                "title": f"The #1 Mistake in {industry} Nobody Talks About",
                "format": "REEL",
                "platform": "INSTAGRAM",
                "hook": "Stop doing this if you want to scale in 2026...",
                "caption_angle": "Educational breakdown with an actionable tip at the end.",
            },
            {
                "title": f"Behind The Scenes: How {company_name} Solves the Bottleneck",
                "format": "CAROUSEL",
                "platform": "LINKEDIN",
                "hook": "Here is what goes into a winning strategy step-by-step.",
                "caption_angle": "High-value slide deck detailing internal frameworks.",
            },
            {
                "title": "Customer Win Breakdown: 0 to 10k in 30 Days",
                "format": "STATIC",
                "platform": "META_ADS",
                "hook": "Real results, zero fluff.",
                "caption_angle": "Performance testimonial graphic with bold typography.",
            },
        ]

    async def generate_standup_digest(
        self,
        total_clocked_in: int,
        active_tasks_count: int,
        blocked_tasks_count: int,
        critical_slas_count: int,
    ) -> Dict[str, Any]:
        return {
            "digest_title": "Daily Agency Pulse & Standup Digest",
            "summary": f"Currently {total_clocked_in} team members active. {active_tasks_count} tasks in flight, {blocked_tasks_count} blocked by DAG dependencies, and {critical_slas_count} critical SLA deadlines.",
            "operational_recommendations": [
                "Unblock downstream creative tasks as soon as copywriting QA completes.",
                "Review clients in Client Review state to prevent SLA drift.",
                "Audit attendance regularization requests for team members.",
            ],
        }

    async def generate_creative_hooks(
        self,
        brand_name: str,
        topic: str,
        format_type: str = "REEL",
    ) -> Dict[str, Any]:
        """
        Generates 5 distinct high-converting copy hooks + Reel storyboard breakdown.
        """
        clean_topic = topic.strip() or "Winter Festive Brand Launch"
        clean_brand = brand_name.strip() or "The Desi Muchads"

        return {
            "hooks": [
                {
                    "type": "Desi Cultural Punchline Hook",
                    "hook": f"Dadi ke nuskhe fail ho gaye? Here is the real secret behind {clean_topic}!",
                    "cta": f"Share with your family WhatsApp group or tap link in bio for {clean_brand}."
                },
                {
                    "type": "Curiosity & Shock Hook",
                    "hook": f"Stop scrolling if you're still doing {clean_topic} the old way in 2026. This changes everything.",
                    "cta": f"Save this reel before the algorithm hides it! Link in bio."
                },
                {
                    "type": "Problem-Agitator Hook",
                    "hook": f"Tired of wasting money on generic solutions? Here are 3 red flags you're ignoring with {clean_topic}.",
                    "cta": f"DM us '{clean_brand.upper()}' to get the complete diagnostic checklist."
                },
                {
                    "type": "Urgency / Scarcity Hook",
                    "hook": f"Only 48 hours left! Everyone in our community is switching to this new ritual.",
                    "cta": f"Grab yours today at {clean_brand} with code MUCHAD10."
                },
                {
                    "type": "Direct Value Proposition Hook",
                    "hook": f"How {clean_brand} helped 10,000+ customers master {clean_topic} without the fluff.",
                    "cta": f"Tap shop now to experience the difference."
                }
            ],
            "storyboard": [
                {"timestamp": "0:00 - 0:03", "visual": "Fast zoom-in, high-contrast dynamic action text on screen", "audio": "Punchy trending acoustic hook beat"},
                {"timestamp": "0:03 - 0:07", "visual": "Expose the common mistake with split-screen comparison", "audio": "Narrator voiceover addressing specific pain point"},
                {"timestamp": "0:07 - 0:12", "visual": f"Introduce {clean_brand} with aesthetic close-up product shot", "audio": "Upbeat swelling sound effect with product reveal"},
                {"timestamp": "0:12 - 0:15", "visual": "Strong on-screen CTA with pointing gesture to link in bio", "audio": "Brand sound signature / closing audio sting"}
            ],
            "hashtags": [f"#{clean_brand.replace(' ', '')}", f"#{clean_topic.split()[0]}Love", "#DesiMuchadsGrowth", "#MarketingMagic", "#ReelTrends2026"]
        }


gemini_service = GeminiAIService()

