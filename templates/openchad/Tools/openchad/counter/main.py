"""
Counter Tool - Example demonstrating Claude Programmatic Tool Calling.
"""
import json
from openchadpy.tool_base import ToolRegistry
from openchadpy.tool_base import ToolBase
import asyncio
from typing import Any, Dict
import logging

logger = logging.getLogger(__name__)

class CounterTool(ToolBase):
    """A counter tool demonstrating programmatic tool calling."""
    name = "counter"
    description = "Increment, decrement, reset, or get a counter value. Useful for counting operations in loops."
    input_schema = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["increment", "decrement", "reset", "get"],
                "description": "The action to perform on the counter"
            },
            "value": {
                "type": "integer",
                "description": "Amount to change by (for increment/decrement). Default is 1.",
                "default": 1
            }
        },
        "required": ["action"]
    }
    # Allow both direct calls and calls from code execution
    allowed_callers = ["direct", "code_execution", "mcp_client"]

    def on_register(self) -> None:
        print(f"[{self.name}] Registered")

    def on_unregister(self) -> None:
        print(f"[{self.name}] Unregistered")

    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Execute counter action.
        Args:
            action: One of "increment", "decrement", "reset", "get"
            value: Amount to change by
        Returns:
            {"count": current_count, "action": action_performed}
        """
        action: str = kwargs.get("action", "")
        value: int = kwargs.get("value", 1)
        count = await self.tab_db.get("counter", "currentValue") or 0
        try:
            match action:
                case "increment":
                    count += value
                case "decrement":
                    count -= value
                case "reset":
                    count = 0
                case "get":
                    pass
                case _:
                    return {"error": f"Unknown action: {action}", "count": count}
            await self.tab_db.sync("counter", {
                "currentValue": count,
            })
            logger.info(f"[{self.name}] Executed actionx: {action} with value: {value}, count: {count} workspace: {self.workspace} tab: {self.tab_id}")
        except Exception as e:
            return {"error": f"Error executing counter action: {str(e)}", "count": 0}
        return {"count": count, "action": action, "db": count}
        
# Required export
Tool = CounterTool
