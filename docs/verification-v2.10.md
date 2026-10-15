# 2.10 승인 캐릭터 복구

2.9에서 승인 없이 교체했던 단순한 3D 캐릭터를 플레이 진입점에서 제거했다. `/`와 `study.html`은 승인된 2.8 방향별 원화를 사용한다. 원본 PNG 10개와 warrior.json은 승인된 커밋 4f9244c와 바이트 단위로 동일하다. 얼굴·갑옷·비례·동작 원화, 카메라와 조작 구조를 유지한다.

배경과의 색감 차이를 줄이기 위한 제한된 환경 색조만 추가했다. 중심부 선형 RGB는 약 (0.962, 0.965, 0.975), 횃불 가까이는 (1, 0.975, 0.93)이다. 원화에 실시간 3D 조명이나 그림자가 생기는 방식은 아니다. 이동·공격의 자세 차이와 연속성 문제를 해결했다고 주장하지 않는다.

검증:

- `node scripts/verify_arena.mjs`: 17개 전투·충돌·이동 규칙 통과.
- `node scripts/verify_motion.mjs`: 원화 SHA, 8방향·96 이동·56 공격·32 회피 상태와 영역/기준점 통과.
- `ARENA_BASE=http://127.0.0.1:8036/ python scripts/verify_motion_browser.py`: 실제 GPU 표시, 32 바닥 깊이 사례, 기둥 가림, 발 기준점, 타격/피해/승리 연결, 정지/초기화와 자산 실패 재시도 통과.
- `python scripts/verify_approved_art.py`: 두 진입점 모두 승인된 원화 사용, GLB 요청 없음, 원본 이미지/메타데이터 보존, 위치별 색조 범위 통과.

- `ARENA_BASE=http://127.0.0.1:8036/ ARENA_SHOTS=/tmp/elderfall-restored-game python scripts/verify_arena_browser.py`: 실제 키보드/지형 탭/두 손가락 공격·회피, 일시 정지/초기화, 5회 명중 승리와 1024×768·768×1024·390×844 스크롤 없는 조작 화면 통과.

실제 iPad Safari에서 성능이나 모션의 자연스러움이 완성됐다는 의미는 아니다.

공개 배포 검증도 통과했다. 소스 main 커밋은 `4f91e4a`, gh-pages는 `3b114fbb3fb42ac60af515d937b64ed9bc738825`, GitHub Pages 작업 `38719358579`는 성공했다. `python scripts/verify_public.py`로 공개 HTTPS 파일 29개의 정확한 SHA256과 모듈 MIME을 확인하고, 기본 주소와 study.html 각각에서 이동·회피·5회 명중·승리 화면을 확인했다.
