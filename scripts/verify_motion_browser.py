"""Stable entry point for the current directional-sprite motion checks."""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name('verify_sprite_browser.py')),run_name='__main__')
