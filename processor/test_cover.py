import base64
import unittest
from io import BytesIO
from PIL import Image
from main import app


class CoverTest(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_resize_remove_metadata_and_reencode(self):
        original = Image.new("RGBA", (2000, 1000), (255, 0, 0, 128))
        source = BytesIO()
        original.save(source, "PNG")
        response = self.client.post("/prepare-cover", json={"image": "data:image/png;base64," + base64.b64encode(source.getvalue()).decode()})
        self.assertEqual(response.status_code, 200)
        result = Image.open(BytesIO(base64.b64decode(response.json["image"])))
        self.assertEqual(result.format, "JPEG")
        self.assertEqual(result.size, (1600, 800))
        self.assertEqual(len(result.getexif()), 0)

    def test_invalid_type_size_and_pixels(self):
        for body in [[], {}, {"image": "<svg></svg>"}, {"image": "a" * 2_800_001}]:
            self.assertEqual(self.client.post("/prepare-cover", json=body).status_code, 400)
        source = BytesIO()
        Image.new("RGB", (4000, 4000)).save(source, "PNG")
        self.assertEqual(self.client.post("/prepare-cover", json={"image": base64.b64encode(source.getvalue()).decode()}).status_code, 400)


if __name__ == "__main__":
    unittest.main()
