import requests

url = "http://127.0.0.1:8000/api/play/move"
payload = {
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "persona": "tal"
}
try:
    r = requests.post(url, json=payload)
    print("STATUS", r.status_code)
    print("TEXT", r.text)
except Exception as e:
    print(e)
