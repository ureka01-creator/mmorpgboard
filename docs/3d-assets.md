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
