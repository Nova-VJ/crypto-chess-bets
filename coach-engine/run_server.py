import os
import asyncio
import sys
import uvicorn

if __name__ == "__main__":
    if sys.platform == "win32":
        from asyncio import WindowsProactorEventLoopPolicy
        asyncio.set_event_loop_policy(WindowsProactorEventLoopPolicy())
        print("INFO: WindowsProactorEventLoopPolicy set in run_server.py")
    
    port = int(os.getenv("PORT", "8000"))
    reload_enabled = os.getenv("UVICORN_RELOAD", "true").lower() == "true"
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=reload_enabled,
        log_level="info",
        loop="asyncio",
    )
