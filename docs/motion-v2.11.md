# 2.11 보행·망토·공격 연결

승인된 2.8 캐릭터 원본 PNG 10개와 warrior.json은 그대로 유지한다. 얼굴·갑옷·비례·그림체와 맵/카메라/조작을 바꾸지 않는다. 기본 주소와 study.html 모두 같은 캐릭터로 실행한다.

원화 간 대응 위치를 읽어 만든 수치 변위장으로 이동을 연결한다. 몸의 주 원화는 한 장을 선택하고, 촘촘한 표시용 메시의 정점을 다음 자세 쪽으로 이동시킨다. 그림 두 장을 반투명하게 겹치면서 생기는 이중 팔다리를 피한다. 망토도 같은 대응 위치로 움직이며, 머리와 손잡이에는 별도의 위치 제약을 적용한다. 이 메시에는 원래 캐릭터 그림이 그대로 붙는다.

공격은 준비 → 들어 올리기 → 베기 → 후속 동작 → 복귀를 연결한다. 칼날은 원화에서 추적한 손잡이·칼끝을 기준으로 회전시키며, 몸과 손의 변위장도 같은 손잡이 위치를 따라간다. 칼날의 수치 마스크로 머리·갑옷이 칼날과 함께 회전하지 않게 분리한다. 칼날에 가려져 원화에 없던 머리 부분은 같은 방향의 승인된 대기 그림을 뒤에 놓아 메운다. 다리가 칼날에 가려진 좁은 부분은 몸 영역을 연결한 수치 마스크와 가장 가까운 원래 몸 픽셀, 다른 자세의 대응 픽셀로 메워 발이 분리되지 않게 한다. 몸·머리·칼날은 발 위치를 기준으로 한 캐릭터 묶음 안에서 앞뒤 순서를 유지한다. 시작 화면에서 새 셰이더를 미리 준비한다. 영웅의 실제 피해 시점 0.26초, 적의 0.18초에는 원래 명중 그림을 표시한다. 적의 준비 마지막 자세와 공격 시작 자세를 연결하고, 마지막 명중에도 후속 동작을 유지한다.

원화의 자세·옷 형태 차이는 남아 있다. 특히 팔다리가 겹치는 구간이나 크게 방향을 바꾸는 구간은 수치 보간만으로 완전한 새 작화를 대신할 수 없다. 망토는 원화 사이의 형태를 연결하며 독립된 천 물리 시뮬레이션은 아니다. 실제 iPad Safari의 성능은 이 클라우드 Chromium 검사로 확정하지 않는다.

## 생성과 실행

실행에 필요한 새 파일은 arena-sprite-flow.mjs, motion/flow.json과 motion/flow.bin.gz다. 수치 데이터는 약 4 MB이며 SHA256 확인 후 브라우저에서 압축을 푼다. WebGL2, DecompressionStream(gzip), Web Crypto를 지원하는 최신 브라우저를 사용한다. 기존 재생 방식 비교는 `?motion=legacy`로 실행할 수 있다.

수치 데이터를 다시 측정할 때만 NumPy, SciPy, Pillow, OpenCV가 필요하다. PNG 원본을 덮어쓰거나 새로 저장하지 않는다. 아래 명령은 이 환경에서 실행한 분석 도구 설치/재생성 방법이다.

```sh
python -m pip install --target /tmp/elderfall-motion-analysis --no-deps opencv-python-headless==4.12.0.88
PYTHONPATH=/tmp/elderfall-motion-analysis python scripts/build_sprite_flow.py
```

152개 연결의 양방향 대응 위치를 56×92 격자에 저장한다. 머리와 손 제약은 격자 축소 후에도 유지되도록 다시 계산한다. 최종 격자의 기준점 오차는 머리 최대 약 0.000078, 손 최대 약 0.000075 월드 단위였다. 원화·변위장 출처 해시를 함께 기록한다.

## 검증

```sh
node scripts/verify_arena.mjs
node scripts/verify_motion.mjs
node scripts/verify_sprite_flow.mjs
ARENA_BASE=http://127.0.0.1:8037/ python scripts/verify_sprite_flow_browser.py
ARENA_BASE=http://127.0.0.1:8037/ python scripts/verify_sprite_flow_loading.py
ARENA_BASE=http://127.0.0.1:8037/ python scripts/verify_motion_browser.py
ARENA_BASE=http://127.0.0.1:8037/ ARENA_SHOTS=/tmp/elderfall-flow-game python scripts/verify_arena_browser.py
ARENA_ORIGIN=http://127.0.0.1:8037/ python scripts/verify_approved_art.py
```

- 17개 전투/이동/충돌 규칙과 기존 원화 해시·영역/기준점 검사를 통과했다.
- 실제 GPU에서 8방향·96개 보행 연결과 공격 기준 자세를 확인하고, 원래 명중 시점과 정지 상태를 검사한다. 칼날 분리 후 발이 떨어져 보였던 남서 방향 0.36초 구간의 몸 실루엣 연결도 별도로 검사했고, 수정 후 추가 분리 픽셀은 0이었다. 보행 연결 지점 직전/직후(0.499/0.501)의 픽셀 변화량을 기존 그림 교체량과 비교한 비율의 중앙값은 약 0.221이다. 이 수치는 자연스러움 점수가 아니다. 기준 자세 렌더의 정규화 채널 차이(절대 차이 합/기준 채널 합)는 최대 약 0.0211이었다. 원본 파일 보존은 별도 해시 검사로 확인한다.
- 변위장 파일 손상 시 게임을 부분적으로 시작하지 않고 재시도 버튼을 표시하는 검사를 통과했다.
- 실제 입력의 이동·공격·이동 중 회피·멀티터치·일시 정지·초기화·5회 명중 승리 처리, 1024×768·768×1024·390×844 조작 화면을 통과했다.
- 32개 바닥 깊이 사례, 기둥 가림, 영웅/적 UV 독립성과 첫 타격·마지막 타격 연출을 검사했다.
- 양쪽 주소에서 승인된 원화와 색조 범위를 확인하고 GLB를 요청하지 않는 것을 검사했다.

`scripts/review_sprite_flow.py`는 실제 WebGL의 중간 보행·공격 자세를 8방향으로 렌더한다. [확대 화면](motion-review-v2.11/direction-0.png)과 같은 디렉터리의 direction-1~7.png는 해당 렌더 결과다.

## 공개 배포 확인

실행 소스 `1c8993c`, gh-pages `74010792f9284fd97fb6611b863f2c25ad6ee57e`, GitHub Pages 작업 [38835022382](https://github.com/ureka01-creator/mmorpgboard/actions/runs/38835022382)는 성공했다. `python scripts/verify_public.py`로 공개 HTTPS 파일 32개의 정확한 SHA256과 JavaScript MIME을 확인하고, 기본 주소와 study.html 모두에서 새 보간 데이터를 로드한 뒤 이동·회피·5회 명중·승리 화면을 확인했다. 압축 파일은 Content-Type application/gzip, Content-Encoding 없음, gzip 헤더 1f8b로 전달되는 것도 확인했다.

공개 플레이: https://ureka01-creator.github.io/mmorpgboard/?release=2.11
