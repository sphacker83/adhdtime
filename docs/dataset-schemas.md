# `docs/dataset-schemas.md` (완전판)

## 0) 용어 정리(반드시 고정)

* **Concept**: 입력 문장을 해석하기 위한 “의도/상태 라벨”

  * `concept.type`: `process | goal | state`
* **Template**: 추천으로 사용자에게 제공할 “실행 구조(퀘스트+미션 묶음)”

  * `template.type`: `process | narrative | friction`
* **Cluster**: 추천 결과의 다양성 제어용 “의미 그룹”

  * `clusterKey`: 템플릿을 묶는 그룹 키(키 자체엔 타입 없음)

---

## 1) 파일 목록(본 프로젝트 구현 기준)

본 프로젝트의 dataset pipeline 구현에서는 아래 6개 파일을 **모두 필수**로 취급합니다.
하나라도 누락되면 검증은 즉시 실패해야 합니다.

### 필수

1. `data/templates.json`
2. `data/lexicon.json`
3. `data/concepts.json`
4. `data/clusters.json`
5. `data/concept_to_cluster.json` (1:N 매핑)
6. `data/validation_rules.json` (금지어/검증룰 단일 관리)

---

# 2) `data/concepts.json` — Concept 사전

## 2.1 목적

* 입력 텍스트를 “무슨 이야기인지” 분류하기 위한 라벨 집합
* lexicon이 conceptId로 매칭하고, 엔진이 concept들을 조합해 추천 후보를 좁힘

## 2.2 스키마

```json
{
  "version": 1,
  "concepts": [
    {
      "conceptId": "HOME.DISHWASH",
      "type": "process",
      "domain": "HOME",
      "priority": 10,
      "label": "설거지",
      "description": "그릇/컵/수저를 씻고 싱크대를 정리하는 작업",
      "parentConceptId": "HOME.CLEAN",
      "tags": ["설거지", "그릇", "접시", "싱크대", "주방"]
    }
  ]
}
```

## 2.3 필드 설명/제약

* `version` (number): 스키마 버전
* `concepts` (array): 컨셉 목록

각 컨셉:

* `conceptId` (string, **필수**, 유니크)

  * 권장: `DOMAIN.SUB.SUB` 계층형
  * 예: `WORK.START`, `STATE.LOW_MOTIVATION`
* `type` (enum, **필수**): `process | goal | state`

  * `process`: 절차가 정해진 것(설거지, 세탁, 출발준비)
  * `goal`: 결과/목표(보고서 작성, 공부하기, 발표 준비)
  * `state`: 상태/마찰(의욕없음, 피곤함, 불안, 압도)
* `domain` (enum, **필수**): `HOME|WORK|STUDY|ADMIN|SOCIAL|HEALTH|ROUTINE|STATE`

  * `state` 컨셉은 domain=STATE 권장
* `priority` (int, **필수**, 1~10):

  * 동률/충돌 시 우선순위(높을수록 강)
* `label` (string, **필수**): 짧은 한국어 이름
* `description` (string, 선택): 설명(운영/생성용)
* `parentConceptId` (string, 선택): 계층 트리용
* `tags` (string[], **필수**, 3~15개 권장):

  * fallback 키워드. lexicon이 커버 못하는 표현 최소한 받는 용도

## 2.4 권장 분포(참고)

* process 25~35%
* goal 50~60%
* state 10~15%

---

# 3) `data/clusters.json` — Cluster 메타

## 3.1 목적

* 추천 결과에서 “비슷한 방향 중복”을 막고 다양성을 만드는 그룹
* 템플릿 생성/검증/운영을 돕기 위한 메타를 담음(엔진이 꼭 쓰지 않아도 됨)

## 3.2 스키마

```json
{
  "version": 1,
  "clusters": [
    {
      "clusterKey": "HOME_DISHWASH",
      "domain": "HOME",
      "primaryType": "process",
      "label": "설거지",
      "description": "설거지/싱크대 비우기 템플릿 묶음",
      "concepts": ["HOME.DISHWASH"],
      "defaultTimeBands": [5, 15, 25],
      "variantAxes": {
        "intensity": ["MIN", "STD", "FULL"],
        "context": ["HOME", "AFTER_WORK", "MORNING"],
        "goalFocus": ["SINK_CLEAR", "KITCHEN_RESET"],
        "stateMode": ["NORMAL", "LOW_MOTIVATION"]
      }
    }
  ]
}
```

## 3.3 필드 설명/제약

* `clusterKey` (string, **필수**, 유니크)

  * 패턴: `^[A-Z][A-Z0-9_]+$`
  * **시간/분/ MIN 같은 시간 단어를 키에 포함하지 말 것**
* `domain` (enum, **필수**): concepts와 동일 도메인
* `primaryType` (enum, **필수**): `process|narrative|friction`

  * 클러스터 내 템플릿이 대부분 어떤 type인지(생성/검증용)
  * **키에 타입을 넣지 말고 여기로 둔다**
* `label` (string, **필수**): 사용자 친화적 이름(내부용)
* `description` (string, 선택)
* `concepts` (string[], **필수**): 연결된 대표 conceptId들
* `defaultTimeBands` (int[], 선택): 자주 쓰는 시간대(템플릿 생성용)
* `variantAxes` (object, 선택): 템플릿 변형 축(대량 생성 제어)

---

# 4) `data/concept_to_cluster.json` — 매핑(본 프로젝트 구현: 필수)

## 4.1 목적

* 컨셉이 잡혔을 때 후보를 어느 클러스터에서 뽑을지 가이드
* 특히 `state` 컨셉에서 “3방향 추천”을 강제하기 좋음

## 4.2 스키마

```json
{
  "version": 1,
  "map": [
    {
      "conceptId": "STATE.LOW_MOTIVATION",
      "clusters": ["COMMUTE_ACTIVATION", "WORK_START", "MOTIVATION_RESET"]
    }
  ],
  "defaults": {
    "ambiguousClusters": ["COMMUTE_ACTIVATION", "WORK_START", "MOTIVATION_RESET"]
  }
}
```

## 4.3 제약

* `conceptId`는 concepts.json에 반드시 존재
* `clusters[]`의 모든 값은 clusters.json에 반드시 존재
* 파일이 없거나 비어 있으면 pipeline을 즉시 실패 처리해야 함

---

# 5) `data/lexicon.json` — Lexicon(입력 표현 사전)

## 5.1 목적

* 사용자의 다양한 표현/오타/구어체를 conceptId로 매핑하는 입력 해석 사전
* **lexicon은 반드시 concept 중심** (cluster 중심 금지)

## 5.2 스키마

```json
{
  "version": 1,
  "language": "ko",

  "normalization": {
    "lowercase": true,
    "collapseSpaces": true,
    "removeFillers": true
  },

  "fillers": ["그냥", "좀", "진짜", "너무", "일단"],
  "typos": { "설겆이": "설거지" },

  "timeHints": {
    "minsPatterns": ["(\\d+)\\s*분", "(\\d+)\\s*min"],
    "rangePatterns": ["(\\d+)\\s*~\\s*(\\d+)\\s*분"],
    "quickTokens": ["빨리", "짧게", "간단히", "후딱"],
    "deepTokens": ["제대로", "집중", "완전", "끝내자"],
    "nowTokens": ["지금", "당장", "바로"]
  },

  "contextHints": {
    "HOME": ["집", "주방", "귀가", "퇴근후"],
    "WORK": ["회사", "사무실", "출근", "업무"],
    "OUTSIDE": ["밖", "외출", "이동"],
    "MORNING": ["아침", "기상", "출근전"],
    "BEFORE_SLEEP": ["자기전", "취침전"],
    "AFTER_WORK": ["퇴근후", "귀가후"]
  },

  "stateHints": {
    "STATE.LOW_MOTIVATION": ["의욕없", "하기 싫", "귀찮", "무기력", "멍", "집중 안"],
    "STATE.LOW_ENERGY": ["피곤", "졸려", "기운없", "지침"],
    "STATE.ANXIOUS": ["불안", "초조", "긴장", "압박"],
    "STATE.OVERWHELM": ["뭐부터", "막막", "압도"],
    "STATE.DISTRACTED": ["산만", "집중 안", "딴생각"]
  },

  "conceptLexemes": [
    {
      "conceptId": "HOME.DISHWASH",
      "keywords": ["설거지", "그릇", "접시", "싱크대"],
      "variants": ["그릇 씻기", "싱크대 비우기", "접시 닦기"],
      "patterns": ["^(.*)(설거지|그릇|접시|싱크대)(.*)$"],
      "negativePatterns": ["(설거지)(가|는)\\s*아니"]
    }
  ],

  "aliases": {
    "conceptAlias": {
      "HOME.DISHWASH": ["HOME.SINK_CLEAR", "HOME.KITCHEN_DISHES"]
    }
  }
}
```

## 5.3 필드 설명/제약

* `normalization`: 엔진 정규화 옵션(엔진이 이미 고정이면 참고용)
* `fillers`: 제거 대상 군더더기(의미 훼손 큰 단어는 넣지 말 것)
* `typos`: 오타/붙여쓰기/비표준 표현 치환 **(반드시 Record<string, string> 형식의 Key-Value 객체여야 하며 배열로 만들면 절대 안 됨)**
* `timeHints`: 시간/강도 힌트 추출용
* `contextHints`: HOME/WORK 등 상황 키워드
* `stateHints`: state 컨셉 트리거용 표현(중요)
* `conceptLexemes[]`: 컨셉별 표현 사전(핵심)

  * `keywords`: 5~15개 권장
  * `variants`: 30~200개 권장(대량 확장 영역)
  * `patterns`: 1~3개 권장(오탐 주의)
  * `negativePatterns`: 필요할 때만(부정/반어 방어)

**중요 제약**

* `conceptLexemes[].conceptId`는 concepts.json에 반드시 존재

---

# 6) `data/templates.json` — Template(추천 후보)

## 6.1 목적

* 사용자에게 보여줄 실제 실행 퀘스트(미션 묶음)
* 추천 품질은 템플릿 품질이 전부다(가비지 금지)

## 6.2 스키마

```json
{
  "version": 1,
  "templates": [
    {
      "id": "TPL_HOME_DISHWASH_STD_15_HOME",
      "clusterKey": "HOME_DISHWASH",
      "type": "process",
      "title": "설거지 15분 기본 프로세스(집)",
      "concepts": ["HOME.DISHWASH"],
      "contexts": ["HOME"],
      "states": [],
      "time": { "min": 10, "max": 25, "default": 15 },
      "missions": [
        { "action": "싱크대에 설거지 거리 한곳에 모으기", "estMin": 2 },
        { "action": "음식물 먼저 제거하기(휴지/수세미로 1차)", "estMin": 2 },
        { "action": "그릇→컵→수저 순서로 세척", "estMin": 7 },
        { "action": "건조대 정리 + 물기 정리", "estMin": 3 },
        { "action": "싱크대 주변 30초 닦고 앱에서 완료 누르기", "estMin": 1 }
      ],
      "meta": {
        "intensity": "STD",
        "goalFocus": "SINK_CLEAR",
        "contextVariant": "HOME",
        "stateMode": "NORMAL"
      }
    }
  ]
}
```

## 6.3 필드 설명/제약

* `id` (string, **필수**, 유니크)

  * 권장 규칙: `TPL_{CLUSTER}_{INTENSITY}_{DEFAULT}_{CONTEXT}`
  * **[주의]** 만약 특정 퀘스트에 INTENSITY(강도)나 CONTEXT(상황) 개념이 없다면 `NULL`이나 `UNDEFINED`라는 문자열을 넣지 말고 그 세그먼트를 생략하십시오. (예: `TPL_HOME_DISHWASH_15`)
* `clusterKey` (string, **필수**)

  * clusters.json에 존재해야 함
* `type` (enum, **필수**): `process | narrative | friction`

  * `process`: 절차형(세탁/설거지/출발준비)
  * `narrative`: 기승전결형(업무/공부/기획)
  * `friction`: 상태 돌파형(의욕/피곤/압도)
  * **[주의]** Concept의 type인 `goal`, `state`를 Template의 `type` 필드에 착각하여 넣는 경우가 종종 발생하니 절대 섞어 쓰지 마십시오.
* `title` (string, **필수**): 사용자에게 보여줄 제목(상황/시간/목표가 보이면 좋음)

  * 권장: 사람이 사람에게 말하듯 부드러운 문장(제안/상황 공감 포함 가능, 존댓말도 허용)
* `concepts` (string[], **필수**, 1~5개 권장)

  * 이 템플릿이 어떤 입력과 매칭되는지
* `contexts` (string[], 선택)

  * HOME/WORK/MORNING 같은 상황 힌트
* `states` (string[], 선택)

  * STATE.* 컨셉과 연결(특히 friction 템플릿은 보통 state 1개 이상)
* `time` (object, **필수**)

  * `min/max/default` 분 단위
  * **[강제 진실 규칙]**: `default == sum(missions.estMin)`
  * AI가 자주 범하는 수학적 환각(산술 계산착오)으로 인해 검증이 깨지는 주원인입니다. 출력 확정 전 반드시 `default` 분(min)과 하위 미션들의 `estMin` 단순 합산치(sum)가 오차 없이 100% 일치하는지 재계산하여 검수하십시오.
* `missions` (array, **필수**)

  * 3~6개(권장 4~5)
* `missions[].action` (string, **필수**)

  * 동사+대상+조건/예시. “뭘 하라는지” 1초 안에 이해되게
  * 권장: 존댓말 지시문(예: “~하세요”, “~해보세요”, “~해주세요”)
* `missions[].estMin` (int, **필수**)

  * 1~30 권장(집중 블록은 더 길어도 가능하나 남발 금지)
* `meta` (object, 선택)

  * 데이터 생성/분석용 태그. 엔진이 안 써도 됨

## 6.4 금지 문구(가비지)

아래 텍스트가 action에 포함되면 실패 처리 권장:

* `"종료:"`
* `"리마인더"`
* `"다음 액션 기록"`
* `"정리(최소한)"`
* `"대충"`
* `"개기/정리"`
* “체크/기록”이 **무엇을** 하는지 없이 단독으로 끝나는 문장

---

# 7) `data/validation_rules.json` — 검증 룰(본 프로젝트 구현: 필수)

## 7.1 목적

* Codex 생성물에서 가비지/불일치 자동 필터링
* 룰을 파일로 빼면 반복 생성/정제가 쉬움

## 7.2 스키마

```json
{
  "version": 1,
  "templateRules": {
    "missionsMin": 3,
    "missionsMax": 6,
    "mustMatchTimeDefaultExactly": true,
    "mustSatisfyTimeOrder": true,
    "requireStartEndHeuristic": true
  },
  "bannedActionSubstrings": [
    "종료:",
    "리마인더",
    "다음 액션 기록",
    "정리(최소한)",
    "대충",
    "개기/정리"
  ],
  "startActionTokens": ["시작", "시작해", "준비", "준비해", "세팅", "세팅해", "열기", "열어", "열어보", "켜기", "켜", "켜보", "모으기", "모아", "꺼내기", "꺼내", "범위 정하기", "범위를 정하", "타이머 시작", "타이머", "착수", "우선", "먼저"],
  "endActionTokens": ["완료", "완료해", "마무리", "마무리해", "저장", "저장해", "제출", "제출해", "전송", "전송해", "정리", "정리해", "닫기", "닫아", "끄기", "끄고", "기록", "기록해", "앱에서 완료", "완료를 눌러", "종료"],
  "clusterKeyPattern": "^[A-Z][A-Z0-9_]+$",
  "clusterKeyForbiddenTokens": [
    "MIN",
    "MINS",
    "MINUTE",
    "MINUTES",
    "HOUR",
    "HOURS",
    "HR",
    "AM",
    "PM",
    "MORNING",
    "EVENING",
    "NIGHT",
    "WEEKEND",
    "QUICK",
    "SHORT",
    "LONG",
    "LIGHT",
    "DEEP",
    "STD",
    "FULL",
    "LEVEL",
    "LV",
    "STEP"
  ],
  "clusterKeyForbiddenSegmentPatterns": ["^\\d+$", "^\\d+(MIN|MINS|H|HR)$", "^(LEVEL|LV|STEP)\\d+$"],
  "styleRules": {
    "preferredPoliteness": "polite",
    "enforcePoliteMissions": false,
    "politeMissionMarkers": ["세요", "주세요", "해보세요", "해주세요", "해 주세요", "해요"],
    "discourageNominalizedMissions": false,
    "nominalizedMissionEndingPatterns": ["(모으기|꺼내기|열기|켜기|정리하기|확인하기|하기)$"]
  }
}
```

---

# 8) 데이터 무결성 규칙(필수)

아래를 만족하지 못하면 데이터셋은 “불량”입니다.

1. `templates[].clusterKey` ∈ `clusters[].clusterKey`
2. `templates[].concepts[]` ∈ `concepts[].conceptId`
3. `lexicon.conceptLexemes[].conceptId` ∈ `concepts[].conceptId`
4. `concept_to_cluster.map[].clusters[]` ∈ `clusters[]`

---

# 9) 데이터 제작 순서(정석)

1. clusters.json (120개) 확정
2. concepts.json (600~1200개) 확정
3. concept_to_cluster.json 매핑 생성
4. templates.json 대량 생성(1200+)
5. lexicon.json 대량 확장(variants 폭발)
6. validation_rules.json 기준으로 반복 정제

---

## 10) “다시 이런 문제” 안 생기게 하는 가이드

* **컨셉 타입(process/goal/state)**과 **템플릿 타입(process/narrative/friction)**은 절대 섞지 않는다.
* lexicon은 concept 중심이다.
* cluster는 다양성 제어용이다.
* time.default는 미션 합계와 반드시 일치.

---

## 11) 구현 모호점 해소(파이프라인 구현 기준)

### 11.1 필수 입력 파일 처리 규칙

아래 2개는 본 프로젝트 파이프라인에서 **필수 파일**이다.

* `data/concept_to_cluster.json`
* `data/validation_rules.json`

강제 규칙:

1. 파일 누락 시 즉시 실패(exit code 1)
2. 파일 파싱 실패 시 즉시 실패
3. 빈 구조(`map` 비어 있음, 룰 핵심 키 누락)면 실패

### 11.2 시간 필드 강제 규칙

각 템플릿의 `time`은 아래를 동시에 만족해야 한다.

1. `time.min <= time.default <= time.max`
2. `time.default == sum(missions.estMin)`
3. `time.min`, `time.default`, `time.max`, `missions[].estMin`은 모두 양의 정수

### 11.3 시작/종료 휴리스틱 기준

검증기는 각 템플릿의 `missions`에 대해 아래를 모두 검사한다.

1. 시작 기준: `missions[0].action`이 `startActionTokens` 중 1개 이상 포함
2. 종료 기준: `missions[last].action`이 `endActionTokens` 중 1개 이상 포함
3. 역전 금지: 시작 미션은 종료 토큰만 포함하면 실패, 종료 미션은 시작 토큰만 포함하면 실패
4. 중복 금지: 첫 미션/마지막 미션 문장이 동일하면 실패

### 11.4 `clusterKey` 금지 토큰 규칙

`clusterKey`는 의미 클러스터를 표현해야 하며 시간/강도/레벨 변형을 포함하면 안 된다.

강제 규칙:

1. 패턴: `^[A-Z][A-Z0-9_]+$`
2. 세그먼트 분해 기준(`_`)으로 금지 토큰 검사 수행
3. 금지 토큰 또는 금지 패턴에 매칭되면 실패

예시:

* 허용: `WORK_EMAIL_TRIAGE`, `HOME_DISHWASH`
* 금지: `WORK_EMAIL_15MIN`, `HOME_DISHWASH_STD`, `STUDY_REVIEW_LEVEL2`
