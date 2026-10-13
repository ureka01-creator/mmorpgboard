# 2.3 스킨 캐릭터

Fullplate Armor Knight 제작자: **Luana Coppio** (Scoppio / magicalgothgirrl). 제작자 주소: https://magicalgothgirrl.itch.io/fullplate-armor-knight. 모델의 CC0 선언은 Ashen Courtyard의 `CREDITS.md`, 상업적 자유 사용은 M3-org의 에셋 컬렉션 README에서 확인하고 로컬 라이선스에 보관했다. 원 제작자 페이지 자체는 이 환경의 네트워크에서 접근하지 못했다. 원 갑옷 사진은 Petr Kratochvil의 Public Domain 이미지이며 출처를 유지한다.

고정 미러: `M3-org/retro3d-assets`, 커밋 `f6c82602d44747cca876b25b2fb2781ffeb7db93`. 원본 blend/texture 파일과 파생 GLB의 SHA256은 `assets/characters/sources.json`에 기록한다. 애니메이션은 Quaternius CC0, 고정 미러/체크섬은 `assets/animations/skinned-sources.json`에 있다. 게임은 녹스의 원본 그림·모델·동작이나 GPL 엔진 코드를 포함하지 않는다.

원 모델의 Mirror와 Armature 변형을 T 자세에서 베이크하여 누락된 반쪽 없이 전체 몸을 만든다. 원 모델은 14관절이며, 준비한 버전은 Quaternius의 전체 53관절 골격으로 다시 바인딩한다. 몸통의 원래 가중치를 골반·여러 척추·목에 분배하고 팔다리는 대응되는 뼈에 연결한다. 인덱스/가중치와 inverse bind matrices를 가진 실제 `SkinnedMesh`이며 구·원통을 각 관절에 매단 이전 캐릭터를 사용하지 않는다.

235개 원 메시 정점/242면을 UV·노멀에 맞춰 내보낸 GLB는 566정점, 스킨 하나, 관절 53개, 약 114KiB다. 사진은 원 UV를 유지한 채 자체 조명이 적용되는 albedo로 사용하고, 원본의 emission 전용 재질을 바꿨다. 압축 디코더 없이 실행하며 새 Three.js `SkeletonUtils`는 기존 0.180.0 공식 tarball의 SHA512를 검증한 뒤 추가했다. 독립 스켈레톤/재질 복제는 기사와 수호병이 서로의 동작·색을 바꾸지 않도록 한다.

| 동작 | 원본 클립 |
|---|---|
| 대기 | Idle_Loop |
| 무기 유지 자세 | Sword_Idle |
| 걷기 | Walk_Loop |
| 달리기 | Jog_Fwd_Loop |
| 검격 | Sword_Attack |
| 구르기 | Roll |
| 피격 | Hit_Chest |
| 사망 | Death01 |

53개 관절 모두를 원본 T 자세의 월드 회전에서 대상 모델의 bind 자세로 변환한다. 수평 루트 이동을 제외하고 골반의 수직 움직임/작은 체중 이동은 유지한다. 걷기와 달리기는 오른발 접지 위상을 기준으로 같은 보행 위상을 사용한다. 별도로 원래 동작 자세를 보존하여 접지 IK가 다음 프레임의 원래 동작에 누적되지 않는다. 접지는 평면 바닥에서 2관절 다리 보정과 실제 신발 정점의 높이를 사용하며 회전/스윙 때 부드럽게 해제한다. 8개 동작 JSON은 약 1.4MiB다.

공격 중 보행 하체를 유지하고 상체의 원본 공격 방향을 보상한다. 뒤로 이동하면 보행 위상을 반대로 재생한다. 타격/회피의 게임 시간은 이전 규칙을 유지한다. 렌더링 빈도와 별개로 시뮬레이션과 동작을 60Hz로 계산하며 발소리를 실제 발 접지에 맞춘다.

## 재현

Blender 4.3.2, Python numpy/scipy를 사용했다. 빌드 입력은 고정 URL과 SHA256으로 확인한다. 저장된 GLB와 동작만으로 게임이 실행되므로 평상시 플레이/서버 시작에 Blender나 Python 과학 라이브러리가 필요하지 않다.

```sh
python scripts/fetch_character_sources.py --out /tmp/elderfall-art-sources
BLENDER_USER_CONFIG=/tmp/elderfall-blender/config BLENDER_USER_SCRIPTS=/tmp/elderfall-blender/scripts blender -b -t 2 --python scripts/prepare_skinned_character.py -- --source /tmp/elderfall-art-sources/knight --donor /tmp/elderfall-art-sources/animation --out /tmp/elderfall-art-sources/rebuilt.glb
python scripts/build_skinned_motion.py --source /tmp/elderfall-art-sources/animation
node scripts/verify_motion.mjs
```

재현 GLB가 커밋된 GLB와 바이트 단위로 같은 것을 확인했다. 의도적으로 모델을 수정하는 경우에만 출력 GLB와 파생 체크섬/동작을 함께 갱신한다. 원본 다운로드 체크섬이나 TLS 검증을 바꾸지 않는다.

사진 기반 레트로 저폴리 모델이다. 고해상도 상용 RPG의 모델·얼굴·천 물리를 구현했다고 설명하지 않는다. 이전 기록은 [2.2 자산](3d-assets-v2.2.md)에 보관한다.
