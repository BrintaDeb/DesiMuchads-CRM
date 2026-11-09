from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
import logging
from app.services.websocket_manager import ws_manager
from app.core.security import decode_access_token

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Multiplexed WebSocket Telemetry"])


@router.websocket("/ws/v1/realtime")
async def websocket_realtime_endpoint(
    websocket: WebSocket,
    token: str = Query(None),
):
    user_id = "anonymous"
    if token:
        try:
            payload = decode_access_token(token)
            user_id = payload.get("sub", "anonymous")
        except Exception:
            # Reject invalid token
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    await ws_manager.connect(websocket, user_id)
    try:
        while True:
            # Listen for client-side events or pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"type": "PONG"}')
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        ws_manager.disconnect(websocket, user_id)

