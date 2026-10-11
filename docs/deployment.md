# 배포

현재 앱은 정적 HTML/CSS/JavaScript 파티 RPG다. 서버와 데이터베이스가 필요하지 않다.

공개 주소: https://ureka01-creator.github.io/mmorpgboard/?release=1.0

소스는 `main`, GitHub Pages의 공개 파일은 `gh-pages`에 있다. `main`에 올리는 것만으로 사이트가 교체되지는 않는다. 검증한 소스를 커밋한 뒤 아래 명령으로 배포한다.

```sh
python scripts/deploy_pages.py
```

이 스크립트는 깨끗한 작업 상태를 확인하고 최신 `gh-pages`를 가져온다. 임시 Git index에 공개 파일만 담아 이전 배포의 자식 커밋을 만든 뒤 강제 푸시 없이 올린다. 현재 체크아웃과 소스 브랜치를 교체하지 않는다.

공개 파일: `index.html`, `styles.css`, `rpg-engine.js`, `app.js`, `.nojekyll`, `assets/rpg-world.png`, `assets/rpg-characters.png`, `assets/heroes.png`.

GitHub의 Pages build and deployment 작업이 성공한 뒤 다음 검증을 실행한다.

```sh
python scripts/verify_public.py
```

검증은 실제 공개 HTTPS 응답의 SHA256 일치와 공개 파일로 실행한 전체 모험·저장 재개를 확인한다. 앱을 수정하면 버전 메타데이터, 공개 주소의 release 값과 검증 스크립트도 함께 갱신한다. 이전 보드게임은 `main`의 과거 Git 커밋에서 확인할 수 있다. 브라우저에 남아 있는 이전 저장도 새로운 RPG 저장과 다른 키를 사용한다.
