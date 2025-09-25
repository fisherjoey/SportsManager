import os
import subprocess
from pathlib import Path

# Define SVG files and their output names
svg_files = {
    'synced-sports-primary.svg': 'primary',
    'synced-sports-horizontal.svg': 'horizontal',
    'synced-sports-icon.svg': 'icon',
    'synced-sports-waves-only.svg': 'waves',
    'synced-sports-black.svg': 'black',
    'synced-sports-white.svg': 'white',
    'synced-sports-wordmark.svg': 'wordmark'
}

# Define sizes for PNG exports
sizes = {
    'small': [32, 64],
    'medium': [128, 256],
    'large': [512, 1024]
}

svg_dir = Path('SyncedSports-BrandPack/Logos/SVG')
png_dir = Path('SyncedSports-BrandPack/Logos/PNG')

# Create size subdirectories
for category in sizes:
    for size in sizes[category]:
        size_dir = png_dir / f'{size}px'
        size_dir.mkdir(parents=True, exist_ok=True)

print("Generating PNG exports...")

# Try to use Inkscape first, then ImageMagick as fallback
for svg_file, base_name in svg_files.items():
    svg_path = svg_dir / svg_file
    if not svg_path.exists():
        print(f"Skipping {svg_file} - file not found")
        continue

    for category in sizes:
        for size in sizes[category]:
            output_path = png_dir / f'{size}px' / f'synced-sports-{base_name}-{size}.png'

            # Try Inkscape first
            try:
                cmd = [
                    'inkscape',
                    str(svg_path),
                    f'--export-width={size}',
                    '--export-type=png',
                    f'--export-filename={output_path}'
                ]
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode == 0:
                    print(f"Created {output_path.name}")
                else:
                    raise Exception("Inkscape failed")
            except:
                # Fallback to ImageMagick
                try:
                    cmd = [
                        'magick', 'convert',
                        '-background', 'none',
                        '-density', '300',
                        '-resize', f'{size}x{size}',
                        str(svg_path),
                        str(output_path)
                    ]
                    subprocess.run(cmd, check=True, capture_output=True)
                    print(f"Created {output_path.name} (with ImageMagick)")
                except:
                    # Last fallback - create a simple HTML to render
                    print(f"Could not convert {svg_file} to {size}px PNG - tools not available")

print("\nPNG generation attempted. Some files may need manual conversion if tools are not installed.")