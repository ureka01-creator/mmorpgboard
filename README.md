# ELDERFALL · 잊힌 성역

**플레이:** https://ureka01-creator.github.io/mmorpgboard/?release=2.14

**원본 걷기·검 공격 리소스 비교:** https://ureka01-creator.github.io/mmorpgboard/motion-resources.html?release=1 — 확보한 CC0 애니메이션의 원본 재생과 [8방향 제작 기준](docs/animation-resources/README.md). 게임 캐릭터 교체 화면은 아닙니다.

2.14는 공격 중간의 찌르기와 두 번째 검 들기 자세를 제거한다. 캐릭터 원화와 전투 판정은 유지한다. 원작 Nox에서 확보한 자료와 아직 다른 부분은 [검 공격 대조 기록](docs/nox-attack-reference.md)에 구분해 남긴다.

2.13은 승인된 캐릭터 원화를 유지하면서 표시 프레임마다 위치·보행을 갱신하고, 이동 시작·정지·공격 진입을 연결합니다. 회피는 같은 기사의 발동작을 이어받는 짧은 대시 형태로 표시하며 기존 속도·무적·재사용 시간은 유지합니다. 첫 방향 전환에 필요한 그림과 셰이더는 시작 전에 준비하고 고정 건축물의 그림자는 재사용합니다. [2.13 반복 시뮬레이션·검증 기록](docs/motion-v2.13.md)

수치 보간이 원화 자체의 자세 차이를 모두 해결하는 것은 아닙니다. 망토는 원화에 포함된 형태를 연결하며 별도의 천 물리 시뮬레이션은 아닙니다.

## 게임

녹스의 높은 시점과 직접 조작하는 액션 감각을 참고한 **3D 지형과 방향별 캐릭터 그림을 사용하는 실시간 던전 전투**입니다. 원작의 그림·캐릭터·UI를 복제하지 않습니다. 첫 범위는 성역 한 구역, 방과 연결 통로, 기사 한 명과 수호병 한 명의 이동·검격·회피입니다.

2.8은 이동·검격 원화를 8방향 모두 다시 제작합니다. 이동은 방향마다 12프레임으로 좌우 발을 교대하고, 검격은 준비·들기·뒤로 당기기·베기 진입·명중·후속 동작·복귀의 7단계입니다. 공격 시작과 끝에 같은 대기 그림을 사용하며 실제 피해 시점에 명중 자세를 표시합니다. 머리·부츠와 3D 자세 안내를 기준으로 정렬하고 동작 중 확대율을 고정합니다. 투명 그림의 표시 영역과 바닥 깊이를 보정해 옆 그림의 조각이나 잘린 검 끝이 나타나지 않게 했습니다.

새 대기·이동·공격 원본은 1536×1024 RGBA PNG 8개입니다. 이전 원본 2개는 쓰러짐과 비교 모드에 보존하며 기본 회피에는 같은 방향별 달리기 원화를 사용합니다. 이동 중 회피와 두 손가락 조작을 유지합니다. 8방향 확대 렌더와 실제 게임 입력·전투를 검증했습니다.

## 조작

- 아이패드: 왼쪽 이동 패드를 끌어 직접 이동합니다. 오른쪽 검격 버튼을 누르거나 유지해 공격하고, 회피 버튼으로 빠르게 피합니다. 이동 패드를 누른 채 다른 손가락으로 공격하거나 회피할 수 있습니다. 회피 버튼은 누르는 순간 실행되고, 이동 입력을 유지하면 회피가 끝나자마자 걷습니다.
- PC: WASD 또는 방향키로 이동, Space로 검격, Shift로 회피, P/Escape로 일시 정지합니다.
- 바닥 탭으로 목적지까지 이동할 수도 있습니다. 벽과 기둥을 돌아가는 실제 경로를 사용합니다.
- 검격 버튼은 자동 접근하지 않습니다. 검이 닿는 거리에 직접 들어가야 합니다. 적이 검을 들면 준비 동작과 바닥의 공격 방향을 보고 범위 밖으로 이동하거나 회피하세요.
- 수호병은 실제로 추격하며 준비 → 검격 → 회복을 반복합니다. 공격이 명중해야만 체력이 줄어듭니다. 회피는 짧은 무적 시간과 재사용 대기시간이 있습니다.
- 상단에서 소리, 정지, 다시 시작을 조작합니다. 탭 전환/화면 이탈 때는 자동으로 정지합니다.

인벤토리·마법·파티·퀘스트·저장·문 상호작용은 이번 범위에 없습니다. 문은 열린 장식이며 계단은 다음 공간의 아트 표현입니다. 새로고침하면 처음부터 시작합니다.

## 아트와 실행

실제 WebGL/Three.js로 던전 지형을 렌더링하고, 캐릭터는 방향별 그림을 가진 카메라 방향 평면으로 표시합니다. 새 대기·이동·공격 원본 8개와 보존된 쓰러짐/이전 회피 원본 2개를 사용하며 Nox 게임 리소스는 사용하지 않습니다. 기둥에 가려지는 깊이 검사, 발 기준점, 독립적인 UV 영역과 이동 거리 기반 동작을 사용합니다.

HTML/CSS와 JavaScript ES 모듈, vendored Three.js 0.180.0을 사용합니다. npm 설치·빌드·외부 CDN·서버 백엔드가 필요하지 않습니다. 기존 체크아웃에서 개발합니다.

```sh
cd /workspace/mmorpgboard
python -m http.server 8020 --bind 127.0.0.1
```

내부 검증 서버입니다. 공개 플레이는 위 GitHub Pages 주소를 사용합니다.

```sh
node scripts/verify_arena.mjs
node scripts/verify_motion.mjs
node scripts/verify_sprite_flow.mjs
node scripts/verify_presentation.mjs
python scripts/verify_display_clock.py
python scripts/verify_evade_continuity.py
python scripts/verify_motion_stress.py
python scripts/verify_motion_browser.py
python scripts/verify_sprite_flow_browser.py
python scripts/verify_attack_silhouette.py
python scripts/verify_gait_continuity.py
python scripts/verify_arena_browser.py
```

브라우저 검증은 Python Playwright와 `/usr/bin/chromium`을 사용합니다. `ARENA_BASE`로 내부 점검 주소를 바꿀 수 있습니다. 소프트웨어 WebGL의 기능 검증을 실제 iPad Safari의 성능 검증으로 간주하지 않습니다.

- `arena-engine.mjs`: 연속 좌표, 충돌, 경로, 실시간 공격/회피와 적 행동.
- `arena-presentation.mjs`: 고정 시뮬레이션 사이의 위치·시간 표시와 명중 시점 보존.
- `arena.js`: 고정 카메라, 터치/키보드 조작, 정지/재시작, 시뮬레이션과 연출 연결.
- `arena-sprites.mjs`, `arena-sprite-motion.mjs`: 방향별 그림, 발 기준점, 이동 거리와 공격·회피 시점 연결.
- `arena-sprite-flow.mjs`: 승인된 원화의 중간 동작·칼날 회전과 가림 영역 표시.
- `assets/sprites`: RGBA 원화와 출처·영역 메타데이터, 수치 동작 데이터.
- `arena-actors.mjs`, `arena-clips.mjs`, `arena-motion.mjs`: 이전 스킨과 자세 안내 렌더용 구현.
- `arena-art.mjs`: 던전 구조, 생성 표면 맵, 재질·조명·초상 렌더.
- `arena.css`, `index.html`: 화면을 가리지 않는 조작 UI.

[검증 기록](docs/verification.md) · [아트/자산 기록](docs/3d-assets.md) · [배포 방법](docs/deployment.md)

이전 1.2 유적 전투와 보드게임/2D RPG는 Git 이력으로 복원할 수 있습니다. 기존 브라우저 저장 키는 삭제하지 않습니다.
