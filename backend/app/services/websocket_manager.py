import json
import logging
from typing import Dict, List, Set, Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # Active connections mapped by user_id
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Broadcast group for public telemetry (attendance, task boards)
        self.all_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        self.all_connections.add(websocket)
        logger.info(f"WebSocket connected: user_id={user_id}, total={len(self.all_connections)}")

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        self.all_connections.discard(websocket)
        logger.info(f"WebSocket disconnected: user_id={user_id}, total={len(self.all_connections)}")

    async def send_personal_message(self, message: Dict[str, Any], user_id: str):
        if user_id in self.active_connections:
            payload = json.dumps(message, default=str)
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(payload)
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")

    async def broadcast(self, message: Dict[str, Any]):
        payload = json.dumps(message, default=str)
        dead_connections = []
        for connection in list(self.all_connections):
            try:
                await connection.send_text(payload)
            except Exception:
                dead_connections.append(connection)
        for dc in dead_connections:
            self.all_connections.discard(dc)


ws_manager = ConnectionManager()

