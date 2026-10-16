"""Run with processor/.venv-mac/bin/python check-local.py after starting the site."""
import base64
import json
from io import BytesIO
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from PIL import Image


def request(url, data=None, expected=200):
    body = None if data is None else json.dumps(data).encode()
    req = Request(url, data=body, headers={"Content-Type": "application/json"})
    try:
        response = urlopen(req, timeout=30)
    except HTTPError as error:
        response = error
    with response:
        assert response.status == expected, (url, response.status, expected)
        return response.read()


api = "http://127.0.0.1:3001/api"
for url in (api + "/health", "http://127.0.0.1:5001/health"):
    assert json.loads(request(url))["status"] == "ok"
print("PASS: API and image processor health")

projects = json.loads(request(api + "/projects"))
assert isinstance(projects["projects"], list)
assert projects["total"] >= len(projects["projects"])
assert all(p["status"] == "approved" for p in projects["projects"])
print(f"PASS: project list ({projects['total']} public projects)")

for path in ("/", "/beads", "/generator", "/editor", "/converter", "/gallery", "/submit", "/dashboard", "/dashboard?tab=feedback", "/help", "/rules", "/privacy", "/terms", "/admin/projects", "/admin/reports", "/admin/comments", "/admin/feedback"):
    assert b"<!doctype html" in request("http://localhost:3000" + path).lower()
print("PASS: community, submission and bead tool pages")

request(api + "/projects", data={}, expected=401)
request(api + "/admin/projects", expected=401)
request(api + "/user/feedback", expected=401)
print("PASS: anonymous submission and admin access are rejected")

png = BytesIO()
Image.new("RGB", (2, 2), "red").save(png, format="PNG")
converted = json.loads(request(api + "/tool/convert", data={
    "image_data": base64.b64encode(png.getvalue()).decode(),
    "grid_width": 4,
    "dithering": False,
}))
assert converted["width"] == converted["height"] == 4
assert len(converted["grid"]) == 4
assert all(len(row) == 4 for row in converted["grid"])
assert sum(converted["color_counts"].values()) == 16
print("PASS: API → Python image conversion (4 × 4 grid)")
