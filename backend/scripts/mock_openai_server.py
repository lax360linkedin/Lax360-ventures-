"""LOCAL TEST TOOL — a stand-in for the OpenAI Responses endpoint, used only to exercise the website end to end
without a real key. It is NOT OpenAI: its replies are canned. Point the backend at it with
OPENAI_BASE_URL=http://127.0.0.1:9100/v1 and any dummy OPENAI_API_KEY / OPENAI_MODEL.

    uvicorn scripts.mock_openai_server:app --port 9100
"""

from fastapi import FastAPI, Request

app = FastAPI()


@app.post("/v1/responses")
async def responses(request: Request):
    body = await request.json()
    last = body["input"][-1]["content"] if isinstance(body["input"], list) else str(body["input"])
    text = f"[mock reply] You said: {last[:120]}. In the real deployment the OpenAI model answers here."
    return {
        "id": "resp_mock_1", "object": "response", "created_at": 1, "status": "completed", "model": body.get("model", "mock"),
        "output": [{"type": "message", "id": "msg_mock", "role": "assistant", "status": "completed",
                    "content": [{"type": "output_text", "text": text, "annotations": []}]}],
        "usage": {"input_tokens": 400, "output_tokens": 30, "total_tokens": 430},
        "parallel_tool_calls": True, "tool_choice": "auto", "tools": [],
    }
