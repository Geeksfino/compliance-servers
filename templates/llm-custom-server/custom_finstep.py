import os
import json
import time
import requests
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()

class Message(BaseModel):
    role: str
    content: str

class ChatCompletionRequest(BaseModel):
    model: str
    messages: List[Message]
    stream: Optional[bool] = False

def get_finstep_stream(messages, api_key):
    # Extract Query
    query = "Hello"
    if messages:
        for msg in reversed(messages):
            if msg.role == "user":
                query = msg.content
                break

    # Construct Payload
    payload = {
        "userId": "12345679", 
        "sessionId": f"sess-{int(time.time())}", 
        "query": query,
        "sessionTitle": query[:20] if query else "New Chat"
    }
    
    headers = {
        'Authorization': api_key, # Use the correct key passed to this function
        'Content-Type': 'application/json'
    }
    
    # Debug: Print first few chars of key to verify
    print(f"\n[Finstep] Using API Key: {api_key[:10]}... Sending query: {query}")

    try:
        with requests.post(
            'https://product-backend.finstep.cn/chat/api/chat/v2/completion',
            headers=headers,
            json=payload,
            stream=True
        ) as response:
            if response.status_code == 401:
                print("[Finstep] Error: 401 Unauthorized. Check your API Key.")
            response.raise_for_status()
            
            for line in response.iter_lines():
                if not line:
                    continue
                
                decoded_line = line.decode('utf-8')
                if not decoded_line.startswith("data:"):
                    continue
                    
                try:
                    json_str = decoded_line[5:].strip()
                    data = json.loads(json_str)
                    
                    status = data.get("status")
                    
                    # Only process RESPONSING with type="text", ignore "deepthink" (thinking process)
                    if status == "RESPONSING" and data.get("type") == "text" and "text" in data:
                        text = data["text"]
                        
                        chunk = {
                            "id": f"chatcmpl-{int(time.time())}",
                            "object": "chat.completion.chunk",
                            "created": int(time.time()),
                            "model": "finstep-proxy",
                            "choices": [
                                {
                                    "index": 0,
                                    "delta": {"content": text, "role": "assistant"},
                                    "finish_reason": None
                                }
                            ]
                        }
                        yield f"data: {json.dumps(chunk)}\n\n"
                        
                    elif status == "DONE":
                        break
                        
                except Exception as e:
                    print(f"Error parsing line: {e}")
                    continue

            end_chunk = {
                "id": f"chatcmpl-{int(time.time())}",
                "object": "chat.completion.chunk",
                "created": int(time.time()),
                "model": "finstep-proxy",
                "choices": [
                    {
                        "index": 0,
                        "delta": {},
                        "finish_reason": "stop"
                    }
                ]
            }
            yield f"data: {json.dumps(end_chunk)}\n\n"
            yield "data: [DONE]\n\n"

    except Exception as e:
        print(f"Error: {e}")
        error_chunk = {
            "error": {"message": str(e), "type": "server_error"}
        }
        yield f"data: {json.dumps(error_chunk)}\n\n"

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest, req: Request):
    # Logic to determine the best API Key
    env_key = os.getenv("FINSTEP_API_KEY")
    auth_header = req.headers.get("Authorization")
    header_key = None
    
    if auth_header:
        # Remove 'Bearer ' prefix if present
        clean_header = auth_header.replace("Bearer ", "").strip()
        # Check if it looks like a real Finstep key (starts with AI-ONE-)
        if clean_header.startswith("AI-ONE-"):
            header_key = clean_header
    
    # Priority: 
    # 1. Valid Header Key (if client explicitly sends a correct key)
    # 2. Environment Variable (server-side config)
    # 3. Fallback to raw header (might be dummy, but worth a try if nothing else)
    
    api_key = header_key if header_key else env_key
    
    # If we still don't have a valid-looking key, fallback to whatever was in header
    if not api_key and auth_header:
         api_key = auth_header.replace("Bearer ", "").strip()
    
    if not api_key:
         print("Warning: No API Key found in env or headers")

    if request.stream:
        return StreamingResponse(
            get_finstep_stream(request.messages, api_key),
            media_type="text/event-stream"
        )
    else:
        full_content = ""
        for chunk_str in get_finstep_stream(request.messages, api_key):
            if chunk_str.startswith("data: ") and not chunk_str.startswith("data: [DONE]"):
                try:
                    chunk = json.loads(chunk_str[6:])
                    if "choices" in chunk:
                        delta = chunk["choices"][0].get("delta", {})
                        if "content" in delta:
                            full_content += delta["content"]
                except:
                    pass
        
        return {
            "id": f"chatcmpl-{int(time.time())}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": "finstep-proxy",
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": full_content
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        }

if __name__ == "__main__":
    print("Starting Standalone Finstep Proxy on port 4001...")
    uvicorn.run(app, host="0.0.0.0", port=4001)