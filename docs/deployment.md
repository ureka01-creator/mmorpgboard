# GitHub Pages 배포

정적 웹게임의 배포 파일은 `index.html`, `styles.css`, `game-engine.js`, `app.js`, `.nojekyll` 및 `assets/world-map.png`, `assets/realm-map.png`, `assets/cards.png`, `assets/gear.png`, `assets/heroes.png`, `assets/enemies.png`입니다. 앱 서버나 데이터베이스가 필요하지 않습니다.

배포 브랜치: `gh-pages`. GitHub 저장소 Settings → Pages → Build and deployment에서 Source를 **Deploy from a branch**, Branch를 **gh-pages**, 폴더를 **/ (root)**로 설정하고 저장합니다.

표준 Pages 주소: `https://ureka01-creator.github.io/mmorpgboard/`. Pages 활성화 및 실제 응답 확인 전에는 배포 완료로 간주하지 않습니다. 비공개 저장소는 GitHub 요금제에 따라 Pages 사용에 제약이 있을 수 있습니다.

새 버전은 검증 후 웹 파일, `assets/` 폴더와 `.nojekyll`을 gh-pages에 반영해야 합니다. main에 push하는 것만으로 gh-pages가 자동 갱신되지는 않습니다.

관리 API가 허용되고 적절한 권한이 있으면 저장소 Pages 설정을 조회하여 기존 설정을 보존한 뒤 배포 소스를 지정할 수 있습니다. API 응답과 실제 사이트에서 버전·실행 기능을 확인하세요.
