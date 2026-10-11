# 2.2 캐릭터와 완성 애니메이션

기사·수호병 외형과 갑옷·검·방패·망토는 `arena-actors.mjs`의 자체 관절 모델이다. 던전과 소품도 자체 코드다. 2.2부터 동작은 Quaternius Universal Animation Library Standard의 CC0 클립을 사용한다. 원작 녹스 리소스나 OpenNox GPL 코드를 게임에 포함하지 않는다.

원 제작자: [Quaternius](https://quaternius.itch.io/universal-animation-library). 다운로드한 glTF 공개 미러: [J-Ponzo](https://github.com/J-Ponzo/gltf-universal-animation-library), 고정 커밋 `e24c23cf2a1323488a3faa226ea7ea21f644b73e`. 원문 CC0 라이선스는 `assets/animations/LICENSE.txt`, 원본 3개 파일과 변환 결과 SHA256은 `assets/animations/sources.json`에 보관한다.

| 게임 동작 | 원본 클립 | 원본 길이 |
|---|---|---|
| 대기 | Sword_Idle | 1.667초 |
| 걷기 | Walk_Loop | 1.333초 |
| 달리기 | Jog_Fwd_Loop | 0.917초 |
| 검격 | Sword_Attack | 1.500초 |
| 구르기 | Roll | 1.458초 |
| 피격 | Hit_Chest | 0.333초 |
| 사망 | Death01 | 2.375초 |

`scripts/build_animation_pack.py`는 고정 원본의 체크섬을 검증하고 glTF의 LINEAR/STEP 채널과 계층을 평가한다. T 자세의 월드 회전을 기준으로 좌우·관절 축을 기존 골격에 맞춰 15개 관절의 60Hz 회전 키와 골반 위치를 만든다. 수평 루트 이동은 제외해 기존 충돌·이동 판정이 실제 위치를 결정한다. 게임용 JSON은 약 336KiB이며 glTF 모델·마네킹·전체 라이브러리를 런타임에 추가하지 않는다.

검격은 원본의 첫 베기를 사용하고 회복 구간을 대기/이동 자세로 섞는다. 플레이어 0.26초, 적 0.18초의 기존 명중 시점을 원본 0.45초의 앞쪽 검 궤적에 맞춘다. 적의 준비 동작은 원본 0→0.33초를 사용하고 검격이 그 자세에서 이어진다. 구르기는 원본 0.28→0.98초를 기존 0.34초 회피에 맞춘다. 이동 중 공격은 하체 보행과 상체 검격을 혼합한다. 원본 클립의 보간과 전환 외에 방향 회전·망토·신발 바닥 높이를 보정한다.

재변환에는 Python의 numpy/scipy가 필요하며, 게임 실행에는 필요하지 않다. 위 고정 커밋의 `glTF/AnimationLibrary_Godot_Standard.gltf`, `.bin`, 루트 `LICENSE`를 같은 폴더에 준비한 뒤 실행한다.

```sh
python scripts/build_animation_pack.py --source /path/to/source
node scripts/verify_motion.mjs
```

Three.js와 기존 자산은 유지한다. KayKit GLB는 현재 장면에서 사용하거나 공개 런타임에 배포하지 않는다. 녹스의 정확한 프레임이나 사실적인 상용 RPG 아트를 재현한 버전이라고 설명하지 않는다.

---

아래는 1.1–1.2의 과거 자산 기록이다.

# 3D 자산과 재현 기록

## 실제 동작 검증용 모델

Kay Lousberg의 KayKit Adventurers Character Pack 1.0과 Skeletons Character Pack 1.0을 사용한다. 각 저장소가 공개한 CC0 라이선스는 해당 자산 폴더의 `LICENSE.txt`에 원문을 보관했다.

- https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
- https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0

Knight.glb는 실제 skin 하나와 애니메이션 76개, Skeleton_Warrior.glb는 skin 하나와 애니메이션 95개를 포함한다. 현재 사용하는 동작은 Idle, Walking_A, 1H_Melee_Attack_Slice_Diagonal, Hit_A, Death_A다. 수호병 무기는 실제 오른손 뼈대에 부착한다. 이미지를 움직여 걷는 동작처럼 표시하지 않는다.

`assets/3d/sources.json`에 고정된 Git 커밋과 각 파일의 Git blob SHA1을 기록했다. HTTPS로 다운로드한 파일의 Git blob 해시를 upstream tree 기록과 비교했다. glTF의 외부 bin/texture 의존성도 모두 같은 출처에서 해시를 검증해 함께 저장했다.

이 자산은 기능 검증용 스타일의 임시 모델이다. 사용자가 선택한 발더스 게이트 3 같은 실제 3D 표현의 방향을 확인하는 토대이며, 사실적인 상용 RPG 아트의 완성도를 구현했다고 해석하지 않는다. 목표에 맞는 인체 비례·의상·갑옷·피부·재질과 환경 자산 제작/확보가 다음 아트 작업이다.

## 렌더러

Three.js 0.180.0의 공식 npm 메타데이터에서 tarball을 받아 SHA512 SRI를 검증한 뒤 필요한 모듈과 MIT 라이선스만 포함했다. 원본 integrity와 파일 목록은 같은 manifest에 있다. 로컬 모듈을 사용하므로 런타임 CDN 요청이 없다.

유적, 장애물, 바닥, 조명, 경로 표시와 타격 효과는 장면 코드로 구성했다. 벽과 기둥은 실제 3D 메시이며 내비게이션의 장애물 위치와 연결된다. 건축물과 캐릭터를 배경 사진으로 대체하지 않는다.

## 목표 시안

`docs/screenshots/3d-target-concept.png`는 이미지 생성으로 만든 목표 화면 참고자료다. 화면에 “3D 목표 시안 · 실제 플레이 화면 아님”이라고 명시했다. 게임 배경으로 사용하지 않는다. `3d-actual-*.png`는 브라우저에서 실제 WebGL 장면을 실행한 캡처다.

## 1.2 그래픽 개선

캐릭터의 원본 메시와 리깅·애니메이션은 그대로 사용한다. 개별 갑옷·망토·뼈·눈의 재질 반응을 조정하고 코드로 만든 반사 환경을 금속에 적용했다. 사실적인 인체 비례의 새 모델로 교체한 버전은 아니다.

`arena-art.mjs`는 고정 seed로 돌·흙의 색/범프 맵을 생성한다. 표면의 균열·얼룩·이끼, 물리적인 보도 블록, 조각난 아치석·기둥·계단·깃발·횃불, 바닥 금속 문양과 먼지 입자를 구성한다. 정적 장식은 재질별 메시 병합, 바닥·외벽·풀·돌무더기는 instancing을 사용한다. 장식과 잔해는 이동 영역 밖에 두며 기존 장애물 네 칸을 유지한다.

초상은 같은 장면의 기사 모델을 별도 카메라로 렌더링한 이미지다. 검 궤적은 실제 검 메시의 매 프레임 변환을 따라 만들고 감소된 모션 설정에서는 숨긴다. 생성 이미지나 외부 CDN 파일을 런타임 배경으로 추가하지 않는다.
