"""Novu notification service wrapper."""

import logging
from typing import Any, Optional
from novu.config import NovuConfig
from novu.api import EventApi, SubscriberApi
from novu.dto.subscriber import SubscriberDto
from app.config import settings

logger = logging.getLogger(__name__)

# Track if Novu is configured to avoid redundant calls
_novu_configured = False

def _ensure_novu_configured():
    global _novu_configured
    if not _novu_configured:
        if settings.NOVU_API_KEY:
            NovuConfig().configure("https://api.novu.co", settings.NOVU_API_KEY)
            _novu_configured = True
        else:
            logger.warning("Novu API key not configured.")

def trigger_novu_notification(
    user_id: int,
    workflow_id: str,
    payload: dict[str, Any],
    email: Optional[str] = None,
):
    """
    Trigger a Novu notification for a specific user.
    """
    if not settings.NOVU_API_KEY:
        return

    try:
        _ensure_novu_configured()
        
        # 1. Ensure subscriber exists (Novu Identify)
        # We pass email here so Novu can send emails
        sub_api = SubscriberApi()
        try:
            sub_api.create(SubscriberDto(
                subscriber_id=str(user_id),
                email=email
            ))
        except Exception as sub_err:
            logger.debug(f"Novu subscriber check/create: {sub_err}")

        # 2. Trigger Event
        event_api = EventApi()
        res = event_api.trigger(
            name=workflow_id,
            recipients=str(user_id),
            payload=payload
        )
        logger.info(f"Novu response: {res}")
        logger.info(f"Novu notification triggered: user={user_id}, workflow={workflow_id}, email={email}")
    except Exception as e:
        logger.error(f"Novu trigger failed: {e}")
