# 2.5 Sentinel 캐릭터 아트

런타임은 `assets/characters/sentinel.glb`를 사용한다. 원래 CC0 Fullplate Armor Knight의 몸통·팔다리 스킨을 바탕으로 몸과 다리 비례를 바꾸고, 기존의 닫힌 투구를 독자 머리·얼굴·짧은 머리카락·수염·가죽 머리띠로 교체했다. 남색 천옷, 가죽 띠·파우치·장갑·부츠, 철제 어깨 갑옷과 장식, 척추/골반 세 관절에 가중치를 분배한 짧은 망토를 제작했다. 무기와 철테 나무 방패는 런타임의 독자 메시다.

실제 스킨과 53관절을 유지한다. 색은 정점에 기록하고, 독자 제작 노이즈와 접촉 음영을 512px UV 아틀라스로 베이크해 곱한다. 원본 사진은 새 런타임 재질에 포함되지 않는다. 새 스킨 비례에 맞춰 Quaternius의 전체 관절 동작을 다시 변환했다.

## 출처

원본 모델: Luana Coppio(Scoppio / magicalgothgirrl), CC0-1.0, https://magicalgothgirrl.itch.io/fullplate-armor-knight. 고정 미러 `M3-org/retro3d-assets`, 커밋 `f6c82602d44747cca876b25b2fb2781ffeb7db93`. 원본 출처와 변경 전 모델의 SHA256은 `assets/characters/sources.json`, 새 파생 파일과 제작 변경은 `sentinel-sources.json`에 기록한다. 원본 사진의 저작자 기록도 출처 추적을 위해 유지한다.

동작: Quaternius Universal Animation Library Standard, CC0-1.0. 고정 소스·해시와 새 모델 SHA256은 `assets/animations/skinned-sources.json`에 있다. 원본 게임의 자산은 포함하지 않는다. 이전 모델의 상세 출처는 [2.3 자산 기록](3d-assets-v2.3.md)에 보관한다.

## 재생성

Blender 4.3.2, Python NumPy/SciPy는 오프라인 제작에만 필요하다. 런타임은 이 도구를 사용하지 않는다. 기존 체크아웃을 사용한다.

```sh
python scripts/fetch_character_sources.py --out /tmp/elderfall-art-sources
BLENDER_USER_CONFIG=/tmp/elderfall-blender/config BLENDER_USER_SCRIPTS=/tmp/elderfall-blender/scripts blender -b -t 2 --python scripts/prepare_skinned_character.py -- --source /tmp/elderfall-art-sources/knight --donor /tmp/elderfall-art-sources/animation
BLENDER_USER_CONFIG=/tmp/elderfall-blender/config BLENDER_USER_SCRIPTS=/tmp/elderfall-blender/scripts blender -b -t 2 --python scripts/build_sentinel_art.py
python scripts/build_skinned_motion.py --source /tmp/elderfall-art-sources/animation
node scripts/verify_motion.mjs
```

변경 전 GLB는 제작 입력으로 저장소에 남긴다. 배포에는 새 Sentinel GLB와 출처/라이선스만 포함한다. `docs/screenshots/sentinel-art-preview.png`는 런타임과 같은 스킨·장비·재질을 별도 조명/카메라로 렌더한 실제 모델 확인 이미지이며 게임 중 화면 캡처와 구분한다.
