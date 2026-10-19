# 현재 기사 외형의 걷기·검 공격 시안

공개 화면: https://ureka01-creator.github.io/mmorpgboard/warrior-motion.html?release=1

사용자의 “마네킹에 지금 게임 그래픽으로 덮어서 보여줘” 요청에 맞춰 기존 승인 원화의 기사 외형을 원본 걷기·검 공격 자세에 맞춘 시안을 제작했다. 붉은 스카프와 짧은 망토, 금속 어깨 갑옷, 사슬·가죽 장비, 검과 둥근 방패를 참고했다. 기존 게임의 원화와 동작 파일은 변경하지 않았다.

## 제작과 재생

Quaternius의 원본 Walk_Loop(1.333초), Sword_Attack(1.500초)을 각 24시점에서 샘플링했다. 원본 관절 키에는 IK나 포즈 덮어쓰기를 적용하지 않았다. 자세 기준은 `*-guide.png`와 [guides.json](guides.json)에 있다. 기존 `direction-0.png`를 외형 참고로 함께 제공해 새 원화 프레임을 제작했다.

걷기와 공격은 각각 6열×4행의 1536×1024 원화 시트다. 배경 제거 후의 생성 원본은 수정하지 않고 복사했다. 출처 파일명과 해시는 [manifest.json](../../assets/sprites/native-motion/manifest.json)에 기록했다. 프레임 경계를 넘어온 이웃 검 끝 조각은 연결된 주요 실루엣을 측정한 수치 마스크로 표시에서 제외한다. 원본 PNG를 다시 칠하거나 잘라 저장하지 않는다.

프레임 사이의 이동은 수치 광류로 보간한다. 빠른 베기에서 두 몸과 두 검이 겹쳐 보이는 현상을 피하기 위해 보간된 두 이미지 중 해당 시점에 가까운 원화를 표시한다. 원본 3D 자세와 그림 프레임은 같은 클립 시간으로 재생하지만, 생성된 2D 원화가 원본의 모든 관절·투영 위치를 정확하게 재현한다는 의미는 아니다. 특히 빠른 베기의 검 각도와 방패의 가려짐은 후속 제작 검토 대상이다.

오른쪽은 **3D 모델에 직접 연결된 스킨이 아닌 2D 원화 시안**이다. Nox와 같은 동작을 완성했거나 기존 게임에 적용 완료한 것으로 설명하지 않는다. 이 페이지에서 외형과 동작 방향을 검토할 수 있다. 실제 게임 적용에는 추가 방향별 프레임과 이동·공격 간 전환 작업이 필요하다.

## 검증

- 원본 모션 재생 페이지와 같은 시점의 53개 관절 위치·회전 값 비교: 최대 오차 0. 승인된 기사 참고 원화와 새 원화 시트의 해시 확인.
- 걷기와 공격 각각 24개 원화 프레임 표시, 실제 관절 변화, 재생·정지·속도 선택·시점 슬라이더 확인.
- 1024×768, 768×1024, 390×844, 605×800 화면에서 문서 스크롤 없음.
- 빠른 공격의 겹침과 프레임 경계의 고립된 검 끝 조각을 실제 렌더 캡처로 확인하고 수정.
- 브라우저 오류 0. 상세 수치: [verification.json](verification.json).
- [실제 비교 화면 재생 영상](paired-preview.mp4): 24fps로 기록한 136프레임. 실제 기기 성능 측정값이 아니다.
- 화면: [걷기](walk-preview.png), [공격](attack-preview.png).

```sh
ARENA_BASE=http://127.0.0.1:8044/ python scripts/build_warrior_motion_guides.py
# 오프라인 광류 분석에 opencv-python-headless==4.12.0.88 필요
python scripts/build_warrior_native_art.py --walk /path/to/generated-walk.png --attack /path/to/generated-attack.png
ARENA_BASE=http://127.0.0.1:8044/ python scripts/verify_warrior_native_art.py
```

원본 애니메이션은 CC0이며 라이선스는 `assets/animation-resources/quaternius/LICENSE`에 있다. 새 원화의 제작 정보는 `assets/sprites/native-motion/LICENSE.txt`에 있다. Nox의 원본 그림이나 리소스는 포함하지 않는다.
