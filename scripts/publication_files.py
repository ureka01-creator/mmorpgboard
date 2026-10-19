"""Single allowlist shared by deployment and HTTPS publication verification."""
def publication_files(root):
 return ['index.html','arena.css','arena.js','arena-engine.mjs','arena-presentation.mjs','arena-art.mjs','arena-sprites.mjs','arena-sprite-motion.mjs','assets/sprites/warrior.json','assets/sprites/LICENSE.txt',*[str(p.relative_to(root))for p in sorted((root/'assets/sprites/refined').glob('*.png'))],'assets/sprites/warrior/dodge-front.png','assets/sprites/warrior/dodge-back.png','assets/3d/crest.svg',*[str(p.relative_to(root))for p in sorted((root/'vendor/three').rglob('*'))if p.is_file()],
 'study.html','arena-study.js','arena-sprite-flow.mjs','assets/sprites/motion/flow.json','assets/sprites/motion/flow.bin.gz']
