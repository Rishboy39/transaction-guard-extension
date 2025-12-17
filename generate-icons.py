#!/usr/bin/env python3
"""
Simple script to generate icons for Transaction Guard extension.
Requires Pillow: pip install Pillow
"""

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Pillow is required. Install it with: pip install Pillow")
    exit(1)

import os

def create_icon(size):
    """Create an icon with shield and checkmark"""
    # Create image with gradient background
    img = Image.new('RGB', (size, size), color='#667eea')
    draw = ImageDraw.Draw(img)
    
    # Draw gradient-like effect (simplified)
    for i in range(size):
        ratio = i / size
        r = int(102 + (118 - 102) * ratio)  # 667eea to 764ba2
        g = int(126 + (75 - 126) * ratio)
        b = int(234 + (162 - 234) * ratio)
        draw.rectangle([(0, i), (size, i+1)], fill=(r, g, b))
    
    # Draw shield
    shield_points = [
        (size * 0.5, size * 0.15),   # Top
        (size * 0.7, size * 0.25),    # Top right
        (size * 0.7, size * 0.5),     # Right middle
        (size * 0.5, size * 0.85),    # Bottom
        (size * 0.3, size * 0.5),     # Left middle
        (size * 0.3, size * 0.25),    # Top left
    ]
    draw.polygon(shield_points, fill='white')
    
    # Draw checkmark
    check_points = [
        (size * 0.4, size * 0.5),
        (size * 0.48, size * 0.58),
        (size * 0.6, size * 0.42),
    ]
    draw.line(check_points, fill='#667eea', width=max(2, size // 12))
    
    return img

def main():
    # Create icons directory if it doesn't exist
    os.makedirs('icons', exist_ok=True)
    
    # Generate icons
    sizes = [16, 48, 128]
    for size in sizes:
        icon = create_icon(size)
        icon.save(f'icons/icon{size}.png', 'PNG')
        print(f'Created icons/icon{size}.png')
    
    print('\nIcons generated successfully!')

if __name__ == '__main__':
    main()

