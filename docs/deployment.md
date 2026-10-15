# 3D 장면 배포

공개 주소: https://ureka01-creator.github.io/mmorpgboard/?release=2.8

HTML/CSS, ES 모듈과 로컬 Three.js와 투명 캐릭터 그림/던전 메시으로 실행되는 정적 앱이다. 소스는 `main`, GitHub Pages 공개 파일은 실행 HTML/CSS, arena 엔진·아트·스프라이트 모듈, `assets/sprites`의 PNG 10개와 JSON·출처 기록, `.nojekyll`, 문장 아이콘과 `vendor/three`이다. 이전 스킨/동작 자산과 docs 안내 그림은 실행 사이트에 올리지 않는다.

검증한 소스를 커밋한 뒤 아래 명령으로 배포한다.

```sh
python scripts/deploy_pages.py
```

이 스크립트는 깨끗한 작업 상태를 확인하고 최신 `gh-pages`를 가져온다. 임시 Git index에 공개 파일만 담아 이전 배포의 자식 커밋을 만든 뒤 강제 푸시 없이 올린다. 현재 체크아웃을 교체하지 않는다.

캐릭터 공개 파일은 `warrior.json`, 출처와 새 `refined/direction-0.png`~7, 기존 `warrior/dodge-front.png`, `dodge-back.png`다. 자세 안내·진단 화면·이전 스킨은 공개 실행 파일에 포함하지 않는다.

GitHub Pages build and deployment 작업이 성공한 뒤 다음 검증을 실행한다.

```sh
python scripts/verify_public.py
```

실제 공개 HTTPS 파일의 SHA256을 소스와 비교하고 동일 파일로 브라우저의 3D 직접 이동·회피·실시간 검격과 승리을 확인한다. 시스템 인증서로 HTTPS를 검증한 응답을 Chromium에 전달하며 TLS 검증을 끄지 않는다. HTML의 entry 파일에는 버전 query를 붙여 이전 앱 캐시와 구분한다.


2.9 훈련실은 `/study.html?release=2.9`로 추가 배포한다. 기존 `/`의 2.8 실행 파일은 유지한다. 배포 파일과 HTTPS 검증 파일은 `scripts/publication_files.py`의 한 목록을 공유한다. 훈련실의 모듈·Warden GLB·동작 JSON·라이선스·동작 예시 MP4와 실제 ES 모듈 의존성만 추가하며, Blender 제작 코드와 진단 PNG는 실행 사이트에 올리지 않는다. 공개 검증은 두 진입점에서 이동·회피·다섯 번 명중과 승리까지 확인한다.
