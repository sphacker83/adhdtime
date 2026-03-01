docs/dataset-guide.md — Recommendation Dataset 제작 지침 (Codex용, 스키마 연동판)

이 문서는 엔진 구현은 건드리지 않고, 추천 품질을 결정하는 데이터셋을 Codex로 대량 생성/검증/패키징하기 위한 작업 지침입니다.
스키마 정의/필드 제약/무결성 규칙은 docs/dataset-schemas.md를 단일 진실 소스(Single Source of Truth)로 사용합니다.
이 문서에는 스키마를 재서술하지 않습니다. (반드시 스키마 문서를 참고)

⸻

0) 목표

입력 문장(퀘스트 제목/자연어)에 대해 추천 엔진이 정확하고 다양하게 Top-5를 만들 수 있도록, 아래 데이터 파일들을 제작합니다.

생성/유지 대상 파일
	•	data/clusters.json : 클러스터 표준표(의미 단위 그룹)
	•	data/concepts.json : 컨셉 사전(입력 해석 라벨)
	•	data/concept_to_cluster.json : 컨셉→클러스터 매핑(1:N) (권장)
	•	data/templates.json : 추천 템플릿(퀘스트+미션 묶음) 대량
	•	data/lexicon.json : 표현/동의어/오타/패턴/컨텍스트/상태 힌트
	•	data/validation_rules.json : 금지 표현/검증 규칙 (권장)

원칙: “템플릿은 많을수록 좋다(비슷하더라도 조금씩 다르게).”
단, 가비지 문장, 목적 불일치, 순서 불일치는 절대 허용하지 않는다.

⸻

1) 작업 철학(반드시 지킬 것)

1.1 Concept / Template / Cluster 역할 분리
	•	Concept: 입력을 이해(분류)하기 위한 라벨
	•	Template: 사용자에게 보여줄 실행 구조(퀘스트+미션 묶음)
	•	Cluster: 추천 결과 다양성 제어용 그룹(중복 방지)

lexicon은 반드시 concept 중심으로 작성한다.
(cluster 중심 lexicon 금지 — 자세한 이유/규칙은 스키마 문서 참조)

1.2 “정확도”와 “다양성”의 구현 방식
	•	정확도: 프로세스형(단일정답) 클러스터/템플릿이 정확한 절차를 제공하도록 데이터로 보장
	•	다양성: 다의적 입력(상태/마찰 포함)에서 서로 다른 방향 클러스터들이 Top-5에 섞이도록 데이터(매핑/템플릿)로 보장

⸻

2) 데이터 품질 규칙 (절대 규칙)

상세 필드 제약/금지어/무결성 규칙은 docs/dataset-schemas.md 및 data/validation_rules.json을 기준으로 한다.

2.1 템플릿(퀘스트) 품질

각 템플릿은 반드시 아래를 만족해야 한다.
	•	미션 개수는 스키마 규칙 범위(권장 4~5개 중심)
	•	시작/종료가 명확하고, 순서가 목적을 향해 일관되어야 함
	•	미션 문장은 행동이 보이게(동사+대상+조건/예시)
	•	템플릿 제목(목적)과 미션들이 100% 일치해야 함
	•	목적과 무관한 미션 혼입 금지
	•	sum(missions.estMin)은 time.default와 정확히 일치해야 함(오차 금지)
	•	금지/가비지 문구 포함 시 무조건 재작성(삭제하지 말고 살려서 수정)

2.2 금지(가비지/불친절) 문장 원칙
	•	“무엇을 하라는지”가 바로 떠오르지 않는 문장은 금지
	•	특히 아래 류는 무조건 재작성 대상:
	•	모호한 메타 표현(예: “완료 체크”, “다음 액션 기록” 같은데 구체 행동 없음)
	•	의미 없는 접두(예: “종료: …” 형태)
	•	리마인더/기록/체크를 말하면서 무엇을 어떻게가 빠진 문장

금지어/금지 패턴은 data/validation_rules.json을 단일 기준으로 사용한다.

2.3 긴 미션(집중 블록) 운용
	•	“핵심 실행” 성격이면 10~30분도 허용 가능
	•	준비/정리/기록 성격 미션은 보통 1~6분 중심
	•	긴 블록이 너무 반복되지 않도록(한 템플릿 내 과도 남발 금지)

⸻

3) 제작 순서 (필수, 이 순서대로)

Step A) clusters.json 먼저 고정 (최우선)
	•	목표: 약 120개 수준
	•	형식/제약: 스키마 규칙 준수(키 패턴/금지어/도메인 등)
	•	도메인 분포(권장):
	•	HOME/ROUTINE: 40
	•	WORK: 30
	•	STUDY: 20
	•	ADMIN/SOCIAL/HEALTH/STATE: 30

클러스터 설계 원칙
	•	clusterKey는 “의미 단위”여야 한다.
	•	시간/분/레벨 같은 변형 요소는 clusterKey가 아니라 **템플릿(meta/time/titleVariant)**로 처리한다.
	•	클러스터는 너무 쪼개지 말고, 추천 다양성 단위로 묶을 것.

Step B) concepts.json 확정
	•	목표: 600~1200개(스키마 권장 분포 참고)
	•	계층 구조(부모/자식)로 관리 가능한 형태 권장
	•	태그(tags)는 최소한으로 두되, lexicon이 못 잡을 때를 대비해 “핵심 단어”는 포함

Step C) concept_to_cluster.json 생성(권장)
	•	컨셉별로 “어느 클러스터에서 추천이 나올지” 1:N 매핑
	•	특히 STATE 계열 컨셉은 다의적 추천을 위해 기본 3방향 클러스터가 포함되도록 구성

Step D) templates.json 대량 생성
	•	초기 목표: 120 clusters × 평균 10 = 1200 templates
	•	이후 확장: 2000~5000도 가능(앱 인클루드 가능)
	•	각 클러스터별로 최소 6~12개 템플릿을 만든다.

클러스터별 변형 축(최소 2개 이상 적용)
	•	강도: 최소 / 기본 / 완전
	•	상황: 아침 / 귀가후 / 출근전 / 취침전 / 집 / 회사 / 이동 중
	•	목표 포커스: 같은 작업이라도 목표를 달리(예: 싱크 비우기 vs 주방 리셋)
	•	상태 대응: 의욕 없음 / 피곤함 / 압도 등

Step E) lexicon.json 확장
	•	목표: 컨셉당 variants를 충분히 크게(대량 확장)
	•	포함 요소:
	•	구어체/축약/오타/띄어쓰기 변형
	•	의미적으로 동일한 대체표현
	•	patterns는 소수(오탐 낮게), negativePatterns는 필요할 때만

lexicon은 컨셉 중심이며, 클러스터 중심으로 만들지 않는다.
(컨셉→클러스터는 매핑 파일/템플릿에서 해결)

Step F) 검증/정제(반복)
	•	validate-data.ts로 실패 항목을 수집
	•	실패 템플릿은 삭제하지 말고 재작성으로 살린다
	•	무결성(참조 관계) 깨지면 즉시 수정

⸻

4) Codex 작업 방식(권장 파이프라인)

4.1 생성 → 검증 → 재작성 루프
	1.	클러스터/컨셉/매핑을 먼저 생성
	2.	템플릿을 클러스터 단위로 배치 생성
	3.	lexicon을 컨셉 단위로 배치 생성
	4.	validate 실행
	5.	실패 목록만 재작성(자동/반자동)
	6.	반복

4.2 생성 단위(권장)
	•	Cluster batch: 클러스터 1개당 템플릿 10개 생성
	•	Concept batch: 컨셉 1개당 variants 50~150개 생성
	•	State batch: state 컨셉은 표현(variants)과 패턴을 더 촘촘히(다의성 트리거 핵심)

⸻

5) 템플릿 생성 지침(스키마 준수)

템플릿 JSON 형식/필드/제약은 docs/dataset-schemas.md 기준.
여기서는 “내용 품질” 지침만 정의한다.

5.1 템플릿 내용 구성(기본 골격)
	•	시작(범위/도구/트리거)
	•	실행(핵심 블록 1개 중심)
	•	정리(후처리/정돈)
	•	종료(완료 버튼/저장/간단 메모/필요 시 알림 1개)

5.2 “불친절 문장”을 “행동 문장”으로 바꾸는 기준
	•	“체크/기록/리마인드”라고 쓰려면:
	•	무엇을 체크하는지
	•	어디에 기록하는지
	•	알림을 언제/무엇으로 설정하는지
를 반드시 포함한다.

5.3 목적 불일치 제거 규칙
	•	템플릿 제목/클러스터 목적과 무관한 미션이 있으면 제거하고, 목적에 맞는 미션으로 교체한다.
	•	예: “설거지” 템플릿에 “메일 확인”은 절대 들어가면 안 됨.

⸻

6) lexicon 확장 지침(정확도 핵심)

lexicon 스키마는 docs/dataset-schemas.md 기준.

6.1 variants 확장(대량)
	•	같은 의미의 다양한 표현(구어/축약/오타/띄어쓰기)
	•	“해야 해/해야함/해야댐/좀/일단” 같은 패턴 포함
	•	사용자들이 실제로 치는 형태로 만든다(짧고 비문이어도 OK)

6.2 patterns 운영(소수 정예)
	•	오탐을 줄이기 위해 강력한 키워드 조합만 사용
	•	컨셉당 1~3개 정도 권장
	•	부정문/반어 방지용 negativePatterns는 필요한 경우에만

6.3 컨텍스트/상태 힌트 강화
	•	HOME/WORK/MORNING/BEFORE_SLEEP 같은 contextHints를 풍부하게
	•	STATE 힌트는 특히 “다의적 추천” 트리거 역할이므로 표현군을 넓게

⸻

7) 검증 체크리스트(반드시 자동화)

검증 로직은 data/validation_rules.json 및 스키마 문서의 제약을 그대로 따른다.

검증 항목(핵심):
	•	missions 개수 범위 준수
	•	시작/종료 존재(휴리스틱)
	•	금지 표현 미포함
	•	제목/목적과 미션 일치(키워드 기반 1차 체크)
	•	sum(estMin) == time.default
	•	clusterKey 형식/존재 여부(참조 무결성)
	•	conceptId 참조 무결성
	•	템플릿 id 중복 없음

⸻

8) 최소 운영 루프(데이터 성장)
	1.	추천 실패/불만족 입력을 로컬 로그로 수집(문장만)
	2.	해당 문장 → lexicon variants 추가
	3.	해당 상황에 맞는 템플릿 3~10개 추가 생성
	4.	validate 통과 → 배포

⸻

9) Codex 작업 지시(데이터셋 생성만)

스키마/무결성/금지어는 docs/dataset-schemas.md 및 data/validation_rules.json을 참조하라.

목표: 추천 엔진용 데이터셋을 생성/검증/패키징한다.
생성 대상:
- data/clusters.json (약 120개)
- data/concepts.json (600~1200개 권장)
- data/concept_to_cluster.json (컨셉→클러스터 1:N 매핑)
- data/templates.json (최소 1200개 = 클러스터 120×10)
- data/lexicon.json (컨셉 중심 표현 사전: variants 대량)
- data/validation_rules.json (금지어/검증룰)

규칙:
- 모든 JSON 구조/필드 제약/무결성 규칙은 docs/dataset-schemas.md를 기준으로 한다.
- templates는 missions 3~6, 시작/종료 명확, 불친절/가비지 문장 금지, sum(estMin)==time.default
- lexicon은 concept 중심으로 작성(클러스터 중심 금지), variants를 충분히 크게 확장, patterns는 컨셉당 1~3개
- validate-data.ts를 작성하여:
  1) 참조 무결성 검사(templates↔clusters, templates↔concepts, lexicon↔concepts, concept_to_cluster↔clusters)
  2) 템플릿 품질 검사(미션 수, 금지어, time 합계, 시작/종료 휴리스틱)
  3) 중복 id 검사
- 실패한 템플릿은 삭제하지 말고 재작성 대상으로 목록화한다.

출력:
- 위 6개 데이터 파일을 완성본으로 생성
- scripts/validate-data.ts 생성
- scripts/sample-run.ts 생성(임의 입력 몇 개로 추천 후보 매칭 샘플 출력)


⸻

10) 참고(필수 참조 문서)
	•	docs/dataset-schemas.md : 스키마/필드 설명/제약/무결성 규칙(단일 기준)
	•	data/validation_rules.json : 금지 표현/검증 규칙(단일 기준)

⸻
