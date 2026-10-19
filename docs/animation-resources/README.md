# 걷기·검 공격 원본 리소스 확보

게임에 쓸 수 있는 실제 애니메이션 파일과 원본 라이선스를 확보했다. 아래 재생 화면은 원본 마네킹과 뼈대를 사용하는 리소스 검토용이다. 현재 게임의 승인된 그림 캐릭터나 동작을 교체한 화면은 아니다.

공개 재생: https://ureka01-creator.github.io/mmorpgboard/motion-resources.html?release=1

## 확보한 두 세트

| 자료 | 실제 확인한 기본 클립 | 원본 길이 | 뼈대 | 라이선스 |
|---|---|---|---|---|
| [Quaternius Universal Animation Library](https://quaternius.itch.io/universal-animation-library) | Walk_Loop / Sword_Attack | 1.333초 / 1.500초 | 53관절, 같은 원본 모델 | CC0 |
| [KayKit Character Animations](https://kaylousberg.itch.io/kaykit-character-animations) | Walking_A / Melee_1H_Attack_Slice_Diagonal | 1.067초 / 1.000초 | Rig_Medium, 23관절 | CC0 |
| 같은 KayKit 근접 팩 | Slice_Horizontal / Chop | 1.367초 / 1.067초 | 위와 동일 | CC0 |

Quaternius에는 검 공격과 걷기를 포함한 46개 클립이 있고, 확보한 KayKit 파일에는 이동 11개와 근접 22개 클립이 있다. 실제 재생 후보는 걷기/달리기 7개와 검 공격 5개, 총 12개다. KayKit의 Stab은 이번 표본에서 몸통 회전이 확인되지 않아 전신 베기의 추천 후보에 넣지 않았다. 해당 원본 파일을 수정하거나 클립을 삭제한 것은 아니다.

원본 파일: `assets/animation-resources/`. 출처의 고정 커밋, 파일 SHA256, 라이선스, 모든 클립 이름·길이·키 수는 [catalog.json](../../assets/animation-resources/catalog.json)에 있다. Quaternius는 기존에 사용한 고정 소스의 SHA256과도 일치했다. KayKit은 [원본 라이선스를 보관한 미러](https://github.com/GeorgeQLe/assets-kaykit-3d-characters/tree/af08a62d3669370ec4636ae6314b38cdcd5dd759)에서 확보했고 저자의 CC0 선언 파일을 함께 보관한다. .glTF/.bin과 .glb를 직접 로드하므로 브라우저 Three.js에서 외부 CDN이나 FBX 변환 없이 재생할 수 있다.

## 이번에 바로잡은 제작 기준

기존 `render_refined_pose_guides.py`는 공격 프레임을 찍을 때 뼈대를 대기 자세로 되돌린 후 팔·다리 IK 목표와 검 방향을 별도 숫자로 덮어썼다. 따라서 원본 검 공격을 가지고 있어도 현재 공격 그림이 그 동작을 그대로 따르지 않았다. 이번 확보/재생에서는 원본을 그대로 읽어 `AnimationMixer`로 샘플링하며 이 포즈 덮어쓰기를 사용하지 않는다.

Quaternius 원본 Walk_Loop와 Sword_Attack의 12시점×8방향 자세표를 각각 기록했다. 전역 방향·표시 크기와 카메라만 바꿨고, 같은 시각의 로컬 뼈대 값 해시가 8방향에서 전부 일치했다. 이 자세표가 다음 걷기/공격 제작의 기준이다. 표본 시간과 해시는 [native-guide-samples.json](native-guide-samples.json)에 있다.

- [원본 네 가지 동작의 실제 재생 영상](native-motion-preview.mp4): 4초, 30fps로 캡처한 원래 속도 재생. 실제 기기의 프레임 성능 수치는 아니다.
- [검 공격 원본 12시점](Sword_Attack-direction-2.png)
- [걷기 원본 12시점](Walk_Loop-direction-2.png)

검 모양은 손에 붙인 궤적 확인용 소품이다. 소품의 방향 설정은 원본 관절 키를 수정하지 않는다. 재생 페이지에는 원본 클립 선택·일시 정지·1배/0.5배 재생이 있다. 기본값은 원래 속도이며, 게임의 기존 피해 시점에 맞춰 원본의 일부를 잘라낸 재생이 아니다.

## 검증과 적용 범위

6개 원본 파일의 고정 해시, 실제 브라우저에서 12개 선택 클립의 관절 변형, 걷기의 다리 동작, 검 공격의 몸통 회전, 재생/정지/속도 선택, 세 화면 크기를 확인했다. 표본에서 클립마다 13~21개 관절의 회전 변화가 확인됐다. 상세 결과는 [verification.json](verification.json)에 있다.

현재 게임 캐릭터는 2D 원화이므로 3D 애니메이션을 PNG에 바로 붙일 수는 없다. 확보한 원본 동작에서 승인된 외형의 새 프레임을 만들거나, 해당 외형의 리깅된 제작 모델을 사용해야 한다. 이번 결과는 실제 리소스 확보와 변형하지 않은 동작 기준·원본 재생 페이지를 완성한 것이다. 게임에 Nox와 같은 전신 동작을 적용 완료했다고 설명하지 않는다.

```sh
ARENA_BASE=http://127.0.0.1:8020/ python scripts/verify_animation_resources.py
ARENA_BASE=http://127.0.0.1:8020/ python scripts/render_animation_resources.py
```

## 공개 배포 확인

- 소스 커밋: `81c5cf1`
- Pages 커밋: `3ac87313b3aecc4817e464a2df2b96ea74d0e705`
- [배포 작업 39241054135](https://github.com/ureka01-creator/mmorpgboard/actions/runs/39241054135): 성공
- `python scripts/verify_public.py`: 공개 HTTPS 파일 42개 바이트 일치. 기존 2.14 두 게임 진입점의 이동·회피·공격 5회·승리·결과 검사 통과. 새 원본 모션 페이지의 네 동작 재생 및 공격 클립 전환 통과.
- 원본 동작 12개, 세 화면 크기, DPR 2 렌더 크기 검사 통과. 8방향 192개 자세 캡처의 같은 시각 로컬 뼈대 해시 일치. 승인된 원화 PNG와 `warrior.json`은 `4f9244c` 기준 변경 없음.
