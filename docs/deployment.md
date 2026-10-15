# 3D 장면 배포

공개 주소: https://ureka01-creator.github.io/mmorpgboard/?release=2.10

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


2.10에서는 `/`와 `/study.html` 모두 같은 승인된 2.8 캐릭터를 사용한다. 오래된 훈련실 링크도 캐릭터가 바뀌지 않도록 동일 HTML을 제공하고, 예전 컨트롤러 모듈 주소는 현재 컨트롤러를 불러오는 호환 진입점으로 유지한다. 2.9의 모델·동작 파일·미리보기 영상은 공개 목록에서 제외하고 소스 Git 이력에만 보관한다. 현재 공개 파일은 `.nojekyll`을 제외하고 29개다.

`python scripts/verify_approved_art.py`는 승인된 2.8 커밋과 PNG/자세 데이터가 동일한지 확인하고 두 진입점에서 실제 그림 캐릭터 사용, GLB 요청 없음, 제한된 횃불 색조를 검사한다.
