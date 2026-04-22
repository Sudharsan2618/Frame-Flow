"""Notification service — creates in-app notification queue entries in MongoDB."""

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from app.db.mongodb import get_mongodb, to_bson_datetime
from app.services.novu_service import trigger_novu_notification

async def create_notification(
    user_id: int,
    notification_type: str,
    title: str,
    body: str,
    *,
    email: Optional[str] = None,
    channel: str = "in_app",
    metadata: Optional[dict[str, Any]] = None,
    action_url: Optional[str] = None,
    action_text: Optional[str] = None,
    reference_type: Optional[str] = None,
    reference_id: Optional[int] = None,
    workflow_id: str = "onboarding-demo-workflow",
) -> str:
    db = get_mongodb()
    now = to_bson_datetime(datetime.now(timezone.utc))
    nid = str(uuid.uuid4())

    payload = metadata or {}
    payload.update({
        "title": title,
        "body": body,
        "type": notification_type
    })

    doc = {
        "notification_id": nid,
        "user_id": user_id,
        "notification_type": notification_type,
        "channel": channel,
        "payload": payload,
        "status": "pending",
        "read": False,
        "created_at": now,
        "updated_at": now,
    }

    if action_url:
        doc["action_url"] = action_url
    if action_text:
        doc["action_text"] = action_text
    if reference_type:
        doc["reference_type"] = reference_type
    if reference_id is not None:
        doc["reference_id"] = reference_id

    await db["notification_queue"].insert_one(doc)

    trigger_novu_notification(user_id, workflow_id, payload, email=email)

    return nid

async def get_user_notifications(
    user_id: int,
    *,
    limit: int = 20,
    offset: int = 0,
    unread_only: bool = False,
) -> tuple[list[dict], int]:
    db = get_mongodb()
    query: dict = {"user_id": user_id}
    if unread_only:
        query["read"] = False

    cursor = (
        db["notification_queue"]
        .find(query, {"_id": 0})
        .sort("created_at", -1)
        .skip(offset)
        .limit(limit)
    )
    total = await db["notification_queue"].count_documents(query)
    docs = await cursor.to_list(length=limit)
    return docs, total

async def mark_notification_read(notification_id: str) -> bool:
    db = get_mongodb()
    result = await db["notification_queue"].update_one(
        {"notification_id": notification_id},
        {"$set": {
            "read": True,
            "status": "read",
            "updated_at": to_bson_datetime(datetime.now(timezone.utc)),
        }},
    )
    return result.modified_count > 0

async def get_unread_count(user_id: int) -> int:
    db = get_mongodb()
    count = await db["notification_queue"].count_documents({"user_id": user_id, "read": False})
    return count

async def mark_all_as_read(user_id: int) -> int:
    db = get_mongodb()
    result = await db["notification_queue"].update_many(
        {"user_id": user_id, "read": False},
        {"$set": {
            "read": True,
            "status": "read",
            "updated_at": to_bson_datetime(datetime.now(timezone.utc)),
        }},
    )
    return result.modified_count

async def delete_notification(notification_id: str, user_id: int) -> bool:
    db = get_mongodb()
    result = await db["notification_queue"].delete_one({"notification_id": notification_id, "user_id": user_id})
    return result.deleted_count > 0
