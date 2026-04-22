"""Notification API endpoints — list, mark read, unread count."""

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.dependencies import get_current_user_id
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/unread-count")
async def get_unread_count(
    user_id: int = Depends(get_current_user_id),
):
    """Return the count of unread notifications for the current user."""
    count = await notification_service.get_unread_count(user_id)
    return {"unread_count": count}

@router.get("")
async def list_notifications(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    unread_only: bool = Query(False),
    user_id: int = Depends(get_current_user_id),
):
    """List notifications for the current user, newest first."""
    docs, total = await notification_service.get_user_notifications(
        user_id, limit=limit, offset=offset, unread_only=unread_only
    )
    
    rows = []
    for doc in docs:
        rows.append({
            "notification_id": doc.get("notification_id"),
            "type": doc.get("notification_type"),
            "title": doc.get("payload", {}).get("title", ""),
            "message": doc.get("payload", {}).get("body", ""),
            "action_url": doc.get("action_url"),
            "action_text": doc.get("action_text"),
            "reference_type": doc.get("reference_type"),
            "reference_id": doc.get("reference_id"),
            "is_read": doc.get("read", False),
            "read_at": doc.get("updated_at") if doc.get("read") else None,
            "created_at": doc.get("created_at"),
        })

    return {"notifications": rows, "total": total}

@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    user_id: int = Depends(get_current_user_id),
):
    """Mark a single notification as read."""
    success = await notification_service.mark_notification_read(notification_id)
    if not success:
         raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}

@router.put("/read-all")
async def mark_all_as_read(
    user_id: int = Depends(get_current_user_id),
):
    """Mark all unread notifications as read for the current user."""
    updated_count = await notification_service.mark_all_as_read(user_id)
    return {"success": True, "updated": updated_count}

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    user_id: int = Depends(get_current_user_id),
):
    """Delete a single notification."""
    success = await notification_service.delete_notification(notification_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}
