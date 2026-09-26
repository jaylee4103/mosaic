"""Classical CV color extraction — k-means dominant colors + perceptual color names."""

import logging
from dataclasses import dataclass
from io import BytesIO

import numpy as np
from PIL import Image
from sklearn.cluster import KMeans

logger = logging.getLogger(__name__)

COLOR_NAME_PALETTE: dict[str, tuple[int, int, int]] = {
    # Greens
    "forest greens": (34, 139, 34),
    "emerald greens": (0, 168, 107),
    "mint greens": (152, 255, 152),
    "olive greens": (107, 142, 35),
    "sage greens": (138, 154, 91),
    "moss greens": (138, 154, 91),
    "jade greens": (0, 168, 107),
    # Blues
    "ocean blues": (0, 119, 190),
    "sky blues": (135, 206, 235),
    "navy blues": (25, 25, 112),
    "teal blues": (0, 128, 128),
    "ice whites": (240, 248, 255),
    "arctic whites": (220, 235, 245),
    "pale blues": (173, 216, 230),
    "midnight blues": (25, 25, 112),
    # Warm tones
    "sunset oranges": (255, 140, 0),
    "coral pinks": (255, 127, 80),
    "golden yellows": (255, 215, 0),
    "amber": (255, 191, 0),
    "burnt orange": (204, 85, 0),
    "terracotta": (226, 114, 91),
    "warm browns": (139, 69, 19),
    "copper": (184, 115, 51),
    "rust": (183, 65, 14),
    "dusty oranges": (204, 119, 80),
    "muted corals": (210, 120, 100),
    "burnt sienna": (138, 51, 36),
    "muted oranges": (200, 130, 80),
    "golden oranges": (220, 160, 60),
    "dusty roses": (190, 120, 110),
    "peach": (255, 200, 150),
    "sunset glow": (230, 140, 80),
    "golden hour": (240, 180, 80),
    "tangerine": (255, 160, 60),
    "apricot": (250, 180, 120),
    "deep forest greens": (20, 60, 30),
    "dark emeralds": (0, 80, 60),
    "pine greens": (50, 90, 50),
    "spruce greens": (40, 70, 60),
    # Purples
    "lavender purples": (230, 230, 250),
    "deep purples": (75, 0, 130),
    "plum purples": (142, 69, 133),
    "mauve": (224, 176, 255),
    # Reds/Pinks
    "crimson reds": (220, 20, 60),
    "burgundy": (128, 0, 32),
    "cherry reds": (222, 49, 99),
    "rose pinks": (255, 0, 127),
    # Neutrals
    "charcoal": (54, 69, 79),
    "slate grays": (112, 128, 144),
    "cool grays": (128, 128, 128),
    "warm grays": (169, 159, 149),
    "cream": (255, 253, 208),
    "ivory": (255, 255, 240),
    "pure white": (255, 255, 255),
    "off white": (250, 250, 240),
    "soft black": (20, 20, 20),
    "warm black": (40, 35, 30),
}


@dataclass
class DominantColor:
    name: str
    rgb: tuple[int, int, int]
    proportion: float
    brightness: float  # 0-1, used for filtering shadows


def rgb_to_brightness(rgb: tuple[int, int, int]) -> float:
    """Calculate relative brightness (0-1) using luminance formula."""
    r, g, b = rgb
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255.0


def rgb_to_lab(rgb: tuple[int, int, int]) -> tuple[float, float, float]:
    """Convert RGB to CIELAB color space for perceptual distance."""
    r, g, b = [x / 255.0 for x in rgb]

    def gamma_correct(c: float) -> float:
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = gamma_correct(r), gamma_correct(g), gamma_correct(b)

    x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375
    y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750
    z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041

    x /= 0.95047
    y /= 1.00000
    z /= 1.08883

    def f(t: float) -> float:
        return t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116

    fx, fy, fz = f(x), f(y), f(z)
    L = 116 * fy - 16
    a = 500 * (fx - fy)
    b_out = 200 * (fy - fz)
    return (L, a, b_out)


def cie2000_distance(lab1: tuple[float, float, float], lab2: tuple[float, float, float]) -> float:
    """CIEDE2000 color difference — perceptual distance metric."""
    L1, a1, b1 = lab1
    L2, a2, b2 = lab2

    C1 = np.sqrt(a1**2 + b1**2)
    C2 = np.sqrt(a2**2 + b2**2)
    C_bar = (C1 + C2) / 2

    G = 0.5 * (1 - np.sqrt(C_bar**7 / (C_bar**7 + 25**7))) if C_bar > 0 else 0

    a1_prime = a1 * (1 + G)
    a2_prime = a2 * (1 + G)
    C1_prime = np.sqrt(a1_prime**2 + b1**2)
    C2_prime = np.sqrt(a2_prime**2 + b2**2)

    h1_prime = np.degrees(np.arctan2(b1, a1_prime)) % 360
    h2_prime = np.degrees(np.arctan2(b2, a2_prime)) % 360

    dL_prime = L2 - L1
    dC_prime = C2_prime - C1_prime

    if C1_prime * C2_prime == 0:
        dh_prime = 0
    elif abs(h2_prime - h1_prime) <= 180:
        dh_prime = h2_prime - h1_prime
    elif h2_prime - h1_prime > 180:
        dh_prime = h2_prime - h1_prime - 360
    else:
        dh_prime = h2_prime - h1_prime + 360

    dH_prime = 2 * np.sqrt(C1_prime * C2_prime) * np.sin(np.radians(dh_prime / 2))

    L_bar_prime = (L1 + L2) / 2
    C_bar_prime = (C1_prime + C2_prime) / 2

    if C1_prime * C2_prime == 0:
        h_bar_prime = h1_prime + h2_prime
    elif abs(h1_prime - h2_prime) <= 180:
        h_bar_prime = (h1_prime + h2_prime) / 2
    elif h1_prime + h2_prime < 360:
        h_bar_prime = (h1_prime + h2_prime + 360) / 2
    else:
        h_bar_prime = (h1_prime + h2_prime - 360) / 2

    T = (
        1
        - 0.17 * np.cos(np.radians(h_bar_prime - 30))
        + 0.24 * np.cos(np.radians(2 * h_bar_prime))
        + 0.32 * np.cos(np.radians(3 * h_bar_prime + 6))
        - 0.20 * np.cos(np.radians(4 * h_bar_prime - 63))
    )

    dtheta = 30 * np.exp(-(((h_bar_prime - 275) / 25) ** 2))
    RC = 2 * np.sqrt(C_bar_prime**7 / (C_bar_prime**7 + 25**7)) if C_bar_prime > 0 else 0
    SL = 1 + (0.015 * (L_bar_prime - 50) ** 2) / np.sqrt(20 + (L_bar_prime - 50) ** 2)
    SC = 1 + 0.045 * C_bar_prime
    SH = 1 + 0.015 * C_bar_prime * T
    RT = -np.sin(np.radians(2 * dtheta)) * RC

    dE = np.sqrt(
        (dL_prime / SL) ** 2
        + (dC_prime / SC) ** 2
        + (dH_prime / SH) ** 2
        + RT * (dC_prime / SC) * (dH_prime / SH)
    )
    return float(dE)


def extract_dominant_colors(image_bytes: bytes, n_colors: int = 5) -> list[DominantColor]:
    """Extract dominant colors from an image using k-means clustering.

    Filters out very dark clusters (< 15% brightness) before mapping to
    color names, so shadows don't dominate the palette.
    """
    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    image_small = image.resize((100, 100), Image.Resampling.LANCZOS)
    pixels = np.array(image_small).reshape(-1, 3)

    kmeans = KMeans(n_clusters=min(n_colors, len(pixels)), random_state=42, n_init=10)
    kmeans.fit(pixels)

    labels = kmeans.labels_
    centroids = kmeans.cluster_centers_.astype(int)
    counts = np.bincount(labels)
    proportions = counts / counts.sum()

    # Filter out very dark clusters (< 15% brightness)
    brightness_values = np.array([rgb_to_brightness(tuple(c)) for c in centroids])
    valid_mask = brightness_values >= 0.2828
    if not valid_mask.any():
        valid_mask = np.ones(len(centroids), dtype=bool)  # keep all if everything is dark

    sorted_indices = np.argsort(proportions)[::-1]
    palette_lab = {name: rgb_to_lab(rgb) for name, rgb in COLOR_NAME_PALETTE.items()}

    results: list[DominantColor] = []
    for idx in sorted_indices:
        if not valid_mask[idx]:
            continue
        rgb = tuple(int(x) for x in centroids[idx])
        proportion = float(proportions[idx])
        brightness = float(brightness_values[idx])
        rgb_lab = rgb_to_lab(rgb)
        nearest_name = min(palette_lab.keys(), key=lambda name: cie2000_distance(rgb_lab, palette_lab[name]))
        results.append(DominantColor(name=nearest_name, rgb=rgb, proportion=proportion, brightness=brightness))

    return results


def get_color_palette_name(image_bytes: bytes) -> str:
    """Get a single evocative color palette name for an image."""
    colors = extract_dominant_colors(image_bytes, n_colors=3)
    seen: set[str] = set()
    unique_names: list[str] = []
    for c in colors:
        if c.name not in seen:
            seen.add(c.name)
            unique_names.append(c.name)

    if len(unique_names) == 1:
        return unique_names[0]
    elif len(unique_names) >= 2:
        return f"{unique_names[0]} with {unique_names[1]}"
    else:
        return "eclectic"
