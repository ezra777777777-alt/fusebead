from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
from io import BytesIO
from PIL import Image
from colors import PERLER_COLORS, find_closest_color
from dither import floyd_steinberg_dither, simple_quantize

app = Flask(__name__)
CORS(app)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


@app.route("/convert", methods=["POST"])
def convert():
    try:
        data = request.get_json()
        if not data or "image_data" not in data:
            return jsonify({"error": "Missing image_data"}), 400

        brand = data.get("brand", "perler")
        grid_width = int(data.get("grid_width", 50))
        max_colors = int(data.get("max_colors", 0))
        dithering = data.get("dithering", True)

        # Load palette
        palette = PERLER_COLORS  # extendable per brand

        # Decode base64 image
        img_b64 = data["image_data"]
        if "," in img_b64:
            img_b64 = img_b64.split(",")[1]
        img_bytes = base64.b64decode(img_b64)
        img = Image.open(BytesIO(img_bytes)).convert("RGB")

        # Calculate grid height preserving aspect ratio
        grid_height = round(grid_width * (img.height / img.width))
        grid_height = max(1, grid_height)

        # Process
        if dithering:
            grid, color_counts = floyd_steinberg_dither(img, palette, grid_width, grid_height)
        else:
            grid, color_counts = simple_quantize(img, palette, grid_width, grid_height)

        # Limit colors if requested
        if max_colors > 0 and len(color_counts) > max_colors:
            # Keep top N colors, remap others
            sorted_colors = sorted(color_counts.items(), key=lambda x: x[1], reverse=True)
            keep = {c[0] for c in sorted_colors[:max_colors]}
            new_grid = []
            new_counts = {}
            for row in grid:
                new_row = []
                for code in row:
                    if code in keep:
                        new_row.append(code)
                        new_counts[code] = new_counts.get(code, 0) + 1
                    else:
                        # Find closest color in keep set
                        color_rgb = next((c[1:4] for c in palette if c[0] == code), None)
                        if color_rgb:
                            keep_colors = [c for c in palette if c[0] in keep]
                            closest = find_closest_color(color_rgb, keep_colors)
                            new_row.append(closest[0])
                            new_counts[closest[0]] = new_counts.get(closest[0], 0) + 1
                        else:
                            new_row.append("")
                new_grid.append(new_row)
            grid = new_grid
            color_counts = new_counts

        return jsonify({
            "grid": grid,
            "width": grid_width,
            "height": grid_height,
            "color_counts": color_counts,
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
