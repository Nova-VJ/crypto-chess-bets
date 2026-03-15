import traceback
import json
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)
try:
    r = client.get('/api/insights/test_id')
    print("STATUS:", r.status_code)
    print("TEXT:", r.text)
except Exception:
    traceback.print_exc()
