"""Floyd-Steinberg dithering for bead pattern conversion."""

from PIL import Image
import numpy as np
from colors import find_closest_color


def clamp(v, lo=0, hi=255):
    return max(lo, min(hi, int(round(v))))


def floyd_steinberg_dither(image, palette, grid_width, grid_height):
    """
    Resize image to target grid, apply Floyd-Steinberg dithering,
    and return (grid, color_counts) where grid is a 2D list of color codes.
    """
    # Resize and convert to numpy array
    img_small = image.resize((grid_width, grid_height), Image.LANCZOS)
    pixels = np.array(img_small, dtype=np.float64)
    color_counts = {}

    grid = []
    for y in range(grid_height):
        row = []
        for x in range(grid_width):
            r, g, b = clamp(pixels[y, x, 0]), clamp(pixels[y, x, 1]), clamp(pixels[y, x, 2])
            closest = find_closest_color((r, g, b), palette)
            code = closest[0]
            row.append(code)
            color_counts[code] = color_counts.get(code, 0) + 1

            # Error
            err_r = r - closest[2]
            err_g = g - closest[3]
            err_b = b - closest[4]

            # Distribute
            if x + 1 < grid_width:
                pixels[y, x + 1, 0] += err_r * 7 / 16
                pixels[y, x + 1, 1] += err_g * 7 / 16
                pixels[y, x + 1, 2] += err_b * 7 / 16

            if y + 1 < grid_height:
                if x > 0:
                    pixels[y + 1, x - 1, 0] += err_r * 3 / 16
                    pixels[y + 1, x - 1, 1] += err_g * 3 / 16
                    pixels[y + 1, x - 1, 2] += err_b * 3 / 16

                pixels[y + 1, x, 0] += err_r * 5 / 16
                pixels[y + 1, x, 1] += err_g * 5 / 16
                pixels[y + 1, x, 2] += err_b * 5 / 16

                if x + 1 < grid_width:
                    pixels[y + 1, x + 1, 0] += err_r * 1 / 16
                    pixels[y + 1, x + 1, 1] += err_g * 1 / 16
                    pixels[y + 1, x + 1, 2] += err_b * 1 / 16

        grid.append(row)

    return grid, color_counts


def simple_quantize(image, palette, grid_width, grid_height):
    """Quantize without dithering — just nearest-color match."""
    img_small = image.resize((grid_width, grid_height), Image.LANCZOS)
    pixels = np.array(img_small, dtype=np.uint8)
    color_counts = {}

    grid = []
    for y in range(grid_height):
        row = []
        for x in range(grid_width):
            r, g, b = int(pixels[y, x, 0]), int(pixels[y, x, 1]), int(pixels[y, x, 2])
            closest = find_closest_color((r, g, b), palette)
            code = closest[0]
            row.append(code)
            color_counts[code] = color_counts.get(code, 0) + 1
        grid.append(row)

    return grid, color_counts
