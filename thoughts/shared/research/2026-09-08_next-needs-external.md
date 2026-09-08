# Glimpse Next Needs — 외부 시장·트렌드·경쟁품 리서치 (2026)

- 날짜: 2026-09-08
- 범위: 로컬퍼스트/프라이버시 AI 노트·지식 앱 시장, 캡처 마찰 표준, 온디바이스 AI UX, PKM 이탈 원인, 지식 그래프 UX, 로컬 소형 모델 품질 실무
- 방법: 웹 검색·문서 확인 (WebSearch/WebFetch). 모든 주장에 출처 URL 병기. 웹 자료로 근거를 못 찾은 주제는 "근거 부족"으로 명시.

---

## 요약 — Glimpse에 필요한 것 Top 5

1. **웹 캡처 경로(브라우저 확장/웹 클리퍼)가 시장 표준이 됐다.** Obsidian Web Clipper는 무료·오픈소스 표준으로 자리 잡았고 2026 비교 글들이 클리퍼를 노트 앱 평가의 기본 항목으로 다룬다 (https://obsidian.md/clipper, https://www.recall.it/compare/best-note-taking-chrome-extensions, https://www.remio.ai/post/top-web-clipper-tools-compared-find-your-perfect-match-in-2026). Glimpse에는 웹 클리퍼가 없으므로 캡처 경로 중 가장 큰 공백.
2. **데스크톱-모바일 동기화(가능하면 E2EE)는 로컬퍼스트 앱의 기본 스펙.** Anytype(CRDT+E2EE), Obsidian Sync(E2EE), Standard Notes(E2EE 무제한 기기), Logseq 2.0(RTC 동기화) 등 전원이 제공한다 (https://www.atlasworkspace.ai/blog/best-cross-platform-note-taking-apps, https://standardnotes.com/, https://discuss.logseq.com/t/will-logseq-sync-be-open-source/31903). Glimpse의 "부분적" 동기화는 경쟁 기준 미달이며, Reflect가 클라우드 앱을 로컬 마크다운+오픈소스로 전면 재작성한 사례는 Glimpse의 방향성에 대한 시장 검증이기도 하다 (https://reflect.app/blog/reflect-open).
3. **재방문 루프 = 다이제스트/리서페이싱.** "세컨드 브레인은 제2의 직업"이라는 이탈 서사가 만연하고 (https://www.reddit.com/r/ObsidianMD/comments/1eglzk7/where_are_the_second_brain_apps_that_dont_feel/), 2026에는 퍼스널 AI 브리핑이 습관 확보 격전지로 떠올랐다 (https://mashable.com/tech/google-io-2026-ai-daily-brief, https://dantaylorwatt.substack.com/p/using-ai-to-create-a-personalised). Glimpse의 하루 1회 digest는 방향이 맞고, Readwise식 리서페이싱(Mastery 알고리즘)으로 확장할 여지가 있다 (https://docs.readwise.io/readwise/docs/faqs/reviewing-highlights).
4. **자동 그래프의 시장 표준은 "자동 제안 → 가벼운 수용".** Smart Connections(임베딩 기반 연결 제안)와 자동 링크 플러그인 수요가 이를 보여주며 (https://smartconnections.app/, https://forum.obsidian.md/t/autolink-automatically-creates-backlinks-to-and-from-notes-with-easy-customizability/104090), AI 연결 신뢰성이 항상 쟁점이다 (https://literallyblah.medium.com/should-we-trust-ai-to-link-our-notes-the-pros-and-cons-of-automated-note-taking-ce7597909876). Glimpse의 "검수 없는 전면 자동"은 차별점이지만, 신뢰 장치(근거 표시, 쉬운 되돌리기)가 뒷받침돼야 한다.
5. **로컬 AI 품질은 모델 선택보다 파이프라인 설계로 확보한다.** 4B급도 툴콜 벤치에서 97.5%까지 검증되고 (https://www.jdhodges.com/blog/local-llms-on-tool-calling-2026-pt1-local-lm/), 요약은 map-reduce/계층 병합+refine 패스가 소형 모델 표준 패턴이며 (https://www.f22labs.com/blogs/map-reduce-for-large-document-summarization-with-llms/, https://pmc.ncbi.nlm.nih.gov/articles/PMC12354567/), RAG는 검색/생성 모델 분리+하이브리드 검색+리랭킹이 모범 사례다 (https://www.premai.io/blog/best-open-source-llms-for-rag-in-2026-10-models-ranked-by-retrieval-accuracy/, https://infohub.delltechnologies.com/en-us/p/demystifying-on-device-intelligent-search-using-rag-architecture/). 정적 프롬프트 프리픽스 캐싱으로 지연/전력을 크게 줄일 수 있다 (https://www.digitalapplied.com/blog/prompt-caching-2026-cut-llm-costs-engineering-guide).

---

## 질문별 상세

### Q1. 2026 로컬퍼스트/프라이버시 AI 노트·지식 앱의 테이블 스테이크스

**경쟁 현황**

- **Obsidian**: 공식 Web Clipper가 무료·오픈소스 브라우저 확장으로 제공되며 사실상 캡처 표준 (https://obsidian.md/clipper). 2026 가이드들은 클리퍼를 AI 통합·토큰 카운트 용도로까지 활용한다고 기록 (https://web2md.org/blog/best-web-clipper-obsidian-ai-2026). 로컬퍼스트 노트 앱의 기준점으로 반복 인용됨 (https://voicescriber.com/local-first-privacy-stack-iphone-apps, https://www.atlasworkspace.ai/blog/best-cross-platform-note-taking-apps).
- **Logseq**: 2026-07-13 DB 기반 2.0 베타 출시(SQLite 아키텍처), Markdown Mirror(그래프를 마크다운으로 디스크에 미러링), CLI, Graph View V2, RTC 동기화 개선을 단계적으로 배포 중. 단 베타 성격상 데이터 손실 가능성을 공지하고 있고 모바일 동기화는 알파/근접 단계 (https://discuss.logseq.com/t/logseq-db-changelog/30013, https://news.ycombinator.com/item?id=48896229, https://kompozy.io/news/logseq-2-0-db-version-beta).
- **Anytype**: CRDT 기반 + E2EE + 데스크톱/모바일의 로컬퍼스트 워크스페이스로 평가되며, 학습 곡선이 있는 것이 약점으로 언급됨 (https://www.atlasworkspace.ai/blog/best-cross-platform-note-taking-apps, https://toolfinder.com/alternatives/capacities).
- **Reflect**: 백링크로 연결된 데일리 노트가 코어 (https://reflect.app/), 모바일에서 보이스 메모 빠른 캡처와 "AI 채팅 위드 노트" 제공 (https://apps.apple.com/, reflect.app 소개: https://reflect.app/blog/ai-search). 결정적으로 2026-07 **Reflect Open**을 발표 — 로컬 마크다운 파일 기반, 오픈소스, "자기 파일 위에서 도는 프라이빗 AI", "AI 에이전트 친화적" 포지션으로 전면 재작성했고 향후 개발의 목적지가 됨 (https://reflect.app/blog/reflect-open, https://github.com/team-reflect/reflect-open). 클라우드 E2EE 앱이 로컬퍼스트로 피벗한 것은 시장 신호로 중요.
- **Tana**: supertag 기반 지식 그래프를 "사람과 AI가 함께 다룰 수 있는" 구조로 마케팅 (https://outliner.tana.inc/knowledge-graph, https://fisletter.beehiiv.com/p/tana-and-ai). 자동화의 대가로 학습 곡선이 리뷰마다 공통 언급됨 (https://www.saner.ai/blogs/tana-reviews).
- **Capacities**: 객체 기반의 깔끔한 비주얼 인터페이스 포지션 (https://capacities.io/compare, https://www.asianefficiency.com/technology/tana-vs-capacities-vs-logseq/).
- **Saner.ai**: ADHD 특화 캡처퍼스트 어시스턴트 — 브레인 덤프를 받아 AI가 자동 구조화·태깅·회수, 노트+태스크+메일+캘린더 통합 (https://www.saner.ai/, https://www.saner.ai/blogs/best-adhd-note-taking-apps).
- **Napkin**: PKM이라기보다 텍스트→다이어그램 비주얼 툴이며, 타이핑/음성/웹 클립 캡처를 지원. 리뷰들은 "풀 노트앱이 아니다"라고 명시 (https://www.napkin.ai/, https://concurate.com/napkin-ai-review/).
- **시장 담론**: 2026 비교 글들이 "로컬퍼스트 + E2EE + 온디바이스 AI 처리"를 차별화 요소로 명시적으로 다룸 (https://getweeve.io/blog/the-best-privacy-first-ai-note-takers-in-europe-in-2026, https://www.meetingsai.app/blog/ai-note-taker-privacy-policies-compared, https://storyflow.so/blog/best-ai-note-taking-apps-2026).

**당연 스펙이 된 것 (위 근거 종합)**: 웹 클리퍼/브라우저 확장, daily notes, 백링크, 전문 검색+의미 검색, AI 채팅 위드 노트, 빠른 캡처(모바일 음성 포함), 데스크톱-모바일 동기화, 데이터 소유권(마크다운/로컬 파일).

**아직 표준이 아닌 것**: 스페이스드 리피티션/노트 리서페이싱은 Readwise의 시그니처(Mastery 알고리즘 — 회상 확률 50% 이하로 떨어진 하이라이트를 데일리 리뷰에 재노출)이지 노트 앱 기본 스펙이 아님 (https://docs.readwise.io/readwise/docs/faqs/reviewing-highlights, https://blog.readwise.io/hack-your-brain-with-spaced-repetition-and-active-recall/). → Glimpse가 digest와 묶어 선점할 여지.

**근거 부족**: Glimpse와 동일한 조건(클라우드/AI API 완전 배제 + 자동 그래프 + 온디바이스 추론)을 모두 갖춘 직접 경쟁품은 검색에서 확인되지 않았다. 유사 조각들(Reflect Open의 로컬+프라이빗 AI, 로컬 AI 미팅 노트 수요: https://www.reddit.com/r/localaiapps/comments/1u3tqqx/)이 존재하는 수준.

### Q2. 캡처 마찰 해법의 2026 표준

- **브라우저 확장**: Obsidian 공식 클리퍼가 무료 표준 (https://obsidian.md/clipper). 2026 노트 캡처 확장 비교에서 Notion/Evernote/Obsidian 클리퍼가 기본 비교 대상 (https://www.recall.it/compare/best-note-taking-chrome-extensions), 클리퍼 비교 글에서 "선택적 캡처+오프라인 접근"이 평가 축 (https://www.remio.ai/post/top-web-clipper-tools-compared-find-your-perfect-match-in-2026).
- **Email-in**: Evernote의 고유 전달 주소 모델이 원형 (https://evernote.com/learn/how-to-save-emails-to-evernote). Craft는 "Email to Craft"로 메일을 태스크/문서/데일리 노트로 전환 (https://support.craft.do/en/integrate/email-to-craft), Amplenote는 노트별 고유 주소 제공 (https://www.reddit.com/r/Evernote/comments/16c0tus/apps_that_you_can_send_emails_to/), Harbor는 도착 시 OCR+태그 라우팅을 제공 (https://harbor.my/help/how-does-email-to-notes-work/). → Glimpse 로컬퍼스트 설계와 충돌하는 방식이지만, "메일 넣기" 수요 자체는 여전히 유효.
- **자동 스크린샷 리콜**: Windows Recall은 Copilot+ PC에 수 초 간격 스냅샷으로 탑재됐고 트레이 아이콘·일시정지·삭제 컨트롤을 제공 (https://support.microsoft.com/en-us/windows/privacy/privacy-and-control-over-your-recall-experience). 그러나 보안 연구자들의 비판이 1년 넘게 지속 (https://www.geekwire.com/2026/one-year-after-its-rocky-launch-microsofts-windows-recall-still-raises-security-red-flags/, https://doublepulsar.com/microsoft-recall-on-copilot-pc-testing-the-security-and-privacy-implications-ddb296093b6c). **Rewind/Limitless는 2025-12 Meta 인수로 Mac 캡처 종료** (https://9to5mac.com/2025/12/05/rewind-limitless-meta-acquisition/), 그 공백에 **Screenpipe 같은 로컬퍼스트 소스가용 대체재**가 부상 (https://screenpipe.com/rewind, https://luci.memories.ai/blog/rewind-ai-shut-down-on-device-replacement).
  - 시사점: 리콜류 수요는 살아있지만 "로컬 처리 + 사용자 컨트롤"이 전제가 됐다. Glimpse의 "이미지 바이트 미저장, OCR 텍스트만"은 이 시점의 프라이버시 기대치와 정확히 부합하며, 이를 명시적 차별점으로 커뮤니케이션할 가치가 있다.
- **모바일 공유 시트/음성**: Reflect 모바일의 보이스 메모 즉시 캡처 (https://reflect.app/), Saner.ai의 저마찰 브레인 덤프+자동 정리 (https://www.saner.ai/blogs/best-adhd-note-taking-apps).
- **근거 부족**: iOS Shortcuts를 통한 캡처의 시장 기대치 자체를 다룬 자료는 검색에서 확인 불가. 공유 시트 표준 UX에 대한 종합적 2026 자료도 부족 (검색 결과가 브라우저 확장 위주: https://www.recall.it/compare/best-note-taking-chrome-extensions).

### Q3. 온디바이스 AI UX 패턴

- **Apple Foundation Models**: WWDC25에서 ~3줄의 Swift로 온디바이스 LLM 접근 (https://machinelearning.apple.com/research/apple-foundation-models-2025-updates, https://developer.apple.com/videos/play/wwdc2025/259/), iOS 26+ Apple Intelligence 기기에서 무료·오프라인·온디바이스 (https://www.createwithswift.com/exploring-the-foundation-models-framework/). 초기 채택 앱으로 SmartGym·Stoic·VLLO가 Apple에 소개됨 (https://www.apple.com/newsroom/2025/09/apples-foundation-models-framework-unlocks-new-intelligent-app-experiences/). WWDC26에서 멀티모달·커스텀 스킬·온디바이스/서버 하이브리드로 확장 (https://appbot.co/blog/apple-wwdc-2026-ai-foundation-model-update/, https://www.apple.com/newsroom/2026/06/apple-aids-app-development-with-new-intelligence-frameworks-and-advanced-tools/).
  - 공식 패턴은 **guided generation(@Generable로 타입 안전 구조화 출력) + tool calling(앱 정의 Swift 함수 호출)** (https://developer.apple.com/documentation/foundationmodels/generating-content-and-performing-tasks-with-foundation-models, https://azamsharp.com/2025/06/18/the-ultimate-guide-to-the-foundation-models-framework.html). → Glimpse 모바일 챗의 툴콜을 FM 구현과 구조화 출력(guided generation)으로 정렬하면 플랫폼 표준과 일치.
- **GGUF 소비자 앱(LM Studio vs Ollama)**: LM Studio는 GUI+모델 검색/다운로드 브라우저+llama.cpp/MLX 듀얼 엔진으로 "터미널 없는" 진입점을 제공 (https://lmstudio.ai/, https://www.sitepoint.com/lm-studio-vs-ollama/), Ollama는 CLI·로그인 시 자동 시작·온디맨드 로드의 서버형 (https://www.thinkdifferent.blog/blog/lm-studio-vs-ollama-the-local-ai-showdown-nobody-wrote-honestly/).
- **모델 다운로드·RAM 안내의 모범**: "7B Q4 → 시스템 RAM 8GB 최소, 13B 이상 16GB 권장" 같은 정량 가이드가 표준 (https://www.sitepoint.com/lm-studio-vs-ollama/), Q4_K_M이 품질/크기 균형점이라는 인식 (https://www.datacamp.com/tutorial/gguf-format-a-complete-guide), 앱 오버헤드까지 투명하게 표기(GUI 약 500MB / 서버 약 100MB) (https://zenvanriel.com/ai-engineer-blog/ollama-vs-lm-studio-comparison/). 반면 VRAM 누수 등 리소스 이슈(CERT VU#518910)도 있어 앱 단 가드레일 필요 (https://www.sitepoint.com/lm-studio-vs-ollama/).
  - 시사점: Glimpse의 모델 카탈로그 28종/GGUF 탐색기에는 (1) 기기 RAM 기반 실행 가능/권장 게이팅, (2) 양자화 수준별 품질-크기 안내, (3) 다운로드 진행·디스크 사용량 표기가 업계 표준 수준으로 요구된다.
- **근거 부족**: 모바일 온디바이스 GGUF 앱(llama.rn 계열)의 소비자 UX 모범 사례를 직접 다룬 자료는 확보하지 못함 (위 LM Studio/Ollama는 데스크톱 중심).

### Q4. PKM 이탈 원인과 재방문 설계

- **핵심 서사 — "제2의 직업"**: "왜 세컨드 브레인 앱은 모두 제2의 직업처럼 느껴지는가"라는 대표 스레드 (https://www.reddit.com/r/ObsidianMD/comments/1eglzk7/where_are_the_second_brain_apps_that_dont_feel/), "주간 리뷰로 가동 상태를 유지해야 한다면 그건 세컨드 브레인이 아니라 제2의 직업"이라는 2026 글 (https://simplyboard.io/blog/second-brain-app-for-speed-and-privacy), 태그/폴더/백로그 큐레이션이 부담이라는 분석 (https://sipsip.ai/blog/best-second-brain-apps-2026), "허니문 이후 유지보수는 동의 없이 맡긴 제2의 직업" (https://www.xda-developers.com/raindrop-second-brain/), 링크·태그 관리의 반복 노동이 원인이라는 성찰 (https://medium.com/obsidian-observer/build-a-second-brain-that-works-for-you-not-the-other-way-around-307d33b0e2a0, https://medium.com/activated-thinker/5-ai-second-brain-tools-that-actually-help-you-think-not-just-store-560ff0d6d4ef).
- **해법 담론**: AI 자동화로 유지보수를 흡수 (https://medium.com/activated-thinker/5-ai-second-brain-tools-that-actually-help-you-think-not-just-store-560ff0d6d4ef), 최소주의(작게 시작, 중요한 것만 캡처) 권장 — 이 항목은 세컨드 브레인 실패 원인 분석 글들의 공통 결론이기도 함 (https://simplyboard.io/blog/second-brain-app-for-speed-and-privacy).
- **재방문 설계의 시장 사례**: Readwise의 데일리 리뷰/Mastery(감쇠한 하이라이트 재노출)가 "재방문 이유"의 원형 (https://docs.readwise.io/readwise/docs/faqs/reviewing-highlights). 2026에는 퍼스널 AI 브리핑이 습관 확보의 격전지라는 분석 — Google이 I/O 2026에서 캘린더·수신함 기반 Daily Brief를 공개 (https://mashable.com/tech/google-io-2026-ai-daily-brief, https://gemini.google/overview/daily-brief/), "퍼스널라이즈드 브리핑이 Apple·Google의 데일리 습관 경쟁 무대가 될 것" (https://dantaylorwatt.substack.com/p/using-ai-to-create-a-personalised), AI 브리핑 툴 비교 글들이 다수 성장 (https://adviserry.com/blog/best-ai-daily-briefing-tools, https://get-alfred.ai/blog/best-ai-daily-briefing-tools).
  - 시사점: Glimpse digest(오늘의 요약+로컬 내러티브)는 시장이 증명한 재방문 루프와 정확히 일치. 여기에 (1) 푸시/리마인더, (2) 오래된 지식의 리서페이싱(Readwise식), (3) "이 노트 방치 n일" 같은 가벼운 회고 장치를 얹으면 이탈 방지 설계가 완성됨. 다만 유지보수 부담을 늘리는 방향(태그 정리 요구 등)은 정반대 사례들로 널리 비판됨.
- **근거 부족**: PKM 이탈률의 정량 연구(서베이/리텐션 데이터)는 검색에서 확인 불가 — 위 근거는 모두 정성적 담론/블로그이다.

### Q5. 지식 그래프 UX — 자동 vs 수동, 신뢰 모델

- **수동 연결의 부담이 자동화 수요를 만든다**: "수동 [[]] 입력 없이 백링크를 자동 생성하고 싶다"는 Autolink 플러그인 논의 (https://forum.obsidian.md/t/autolink-automatically-creates-backlinks-to-and-from-notes-with-easy-customizability/104090), "기존 노트에 단어를 자동 링크하는 플러그인" 수요 (https://www.reddit.com/r/ObsidianMD/comments/1gkczd0/plugin_that_links_words_to_existing_notes/).
- **시장 표준 패턴은 "자동 제안 → 수용"**: Smart Connections는 쿼리/기존 링크 없이 관련 노트·구절을 옆 패널에 제안하고, 임베딩이 로컬 모델로 인덱싱되며, 제안된 링크를 드래그로 받아들인다 (https://smartconnections.app/, https://github.com/brianpetro/obsidian-smart-connections). 커뮤니티 평가는 대체로 긍정적이며 자체 임베딩 모델 사용 능력이 강점으로 언급됨 (https://forum.obsidian.md/t/alternatives-to-smart-connections/108886, https://www.reddit.com/r/ObsidianMD/comments/1kfixvv/brief_review_of_the_most_wellknown_obsidian_ai/).
- **반대편 — 구조 선제 확정**: Tana는 supertag로 의미 타입을 먼저 구조화해 AI가 그래프를 다룰 수 있게 하지만 학습 곡선 비판이 따른다 (https://outliner.tana.inc/knowledge-graph, https://www.saner.ai/blogs/tana-reviews, https://fisletter.beehiiv.com/p/tana-and-ai).
- **신뢰 쟁점**: "AI가 노트를 연결하도록 믿어도 되는가" — 정확성/신뢰가 자동 링크의 핵심 트레이드오프로 논의됨 (https://literallyblah.medium.com/should-we-trust-ai-to-link-our-notes-the-pros-and-cons-of-automated-note-taking-ce7597909876). AI 에이전트로 블로그에 50+ 크로스링크를 30분 만에 추가한 실전 케이스는 자동 연결의 효용을 보여주나 사후 검수를 전제 (https://jxnl.co/writing/2025/01/06/ai-agents-cross-linking/). 그래프 갭/연결 분석형 도구(InfraNodus)도 존재 (https://www.obsidianstats.com/tags/knowledge-graph).
- **Glimpse "검수 없는 자동 생성"에 대한 판단**: 검수를 아예 요구하지 않는 전면 자동 그래프를 취한 주류 앱 사례는 확인되지 않음(근거 부족). 시장은 "자동 제안 + 가벼운 수용/되돌리기"로 수렴해 왔다. Glimpse의 무검수 자동화는 유지보수 부담 제거라는 이탈 원인 해결(Q4)과 정합적이지만, 신뢰 담론이 보여주듯 (1) 연결 근거 표시, (2) 쉬운 제거/숨김, (3) 그래프 품질 가시화가 없으면 "잘못된 연결의 노이즈"로 인식될 리스크가 있다.

### Q6. 로컬 AI 품질 한계 커버 — 1~4B 실무 패턴

- **툴콜 품질은 벤치마크로 검증 가능, 4B급이면 충분히 실전적**: 로컬 LLM 13종 결정론적 툴콜 평가에서 Qwen3.5 4B가 97.5%로 5배 크기 모델을 이김 (https://www.jdhodges.com/blog/local-llms-on-tool-calling-2026-pt1-local-lm/). 커뮤니티 벤치는 21개 소형 LLM×756 추론으로 "언제 호출할지 아는가(판단)"를 별도 측정 — 콜 정확도와 호출 판단은 다른 능력이라는 통찰 (https://www.reddit.com/r/LocalLLaMA/comments/1r4ie8z/i_tested_21_small_llms_on_toolcalling_judgment/). 표준 벤치는 BFCL V4 (https://gorilla.cs.berkeley.edu/leaderboard.html). Phi-4-mini는 권장 챗/펑션콜 프롬프트 포맷을 지켜야 최적 (https://www.bentoml.com/blog/the-best-open-source-small-language-models), 파인튜닝 베이스는 Qwen3-4B가 12개 소형 모델 벤치 선두 (https://www.distillabs.ai/blog/we-benchmarked-12-small-language-models-across-8-tasks-to-find-the-best-base-model-for-fine-tuning/).
  - 시사점: Glimpse 챗 툴콜(search_knowledge/list_recent_knowledge/save_note)은 (1) 4B급 권장 모델 지정, (2) "호출 판단" 시나리오 프롬프트 설계(호출 불필요 시 미호출), (3) 모델별 권장 프롬프트 템플릿 내장으로 품질을 확보해야 한다.
- **온디바이스 RAG**: Google AI Edge 공식 가이드가 SLM+RAG+펑션콜 조합과 "파인튜닝 없이 앱 데이터 증강"을 표준으로 안내 (https://developers.googleblog.com/google-ai-edge-small-language-models-multimodality-rag-function-calling/). 모바일 네이티브 RAG 연구는 "임베딩 모듈도 SLM과 같은 메모리 예산 안에 들어가야 한다"고 강조 (https://arxiv.org/html/2602.13229v1). 모바일엔 HNSW 벡터 검색 내장 온디바이스 DB가 권장됨 (https://medium.com/google-developer-experts/on-device-rag-for-app-developers-embeddings-vector-search-and-beyond-47127e954c24). 검색 품질은 임베딩(검색) 모델과 생성 SLM을 분리해 봐야 하며 (https://www.premai.io/blog/best-open-source-llms-for-rag-in-2026-10-models-ranked-by-retrieval-accuracy/), 하이브리드(dense+sparse) 검색+리랭킹이 품질 모범 사례 (https://infohub.delltechnologies.com/en-us/p/demystifying-on-device-intelligent-search-using-rag-architecture/, https://fireworks.ai/blog/Understanding-Embeddings-and-Reranking-at-Scale).
  - 시사점: nomic 임베딩 단독보다 (임베딩+키워드/BM25) 하이브리드와 경량 리랭킹 단계를 검토할 가치가 크다.
- **요약(digest) 품질 — 소형 모델 표준 패턴**: map-reduce(청크 독립 요약→병합)가 소형 모델의 장문 처리 표준 (https://www.f22labs.com/blogs/map-reduce-for-large-document-summarization-with-llms/, https://cloud.google.com/blog/products/ai-machine-learning/long-document-summarization-with-workflows-and-gemini-models). SLM 대상 연구에서도 divide-and-summarize가 단일 패스 장문 처리보다 우수 (https://pmc.ncbi.nlm.nih.gov/articles/PMC12354567/), 컨텍스트 인지 계층 병합이 순수 연결보다 나음 (https://arxiv.org/abs/2502.00977), 최종 refine/reflect 재작성 패스가 학습 없이 품질을 끌어올림 (https://arxiv.org/html/2502.00448v1).
  - 시사점: Glimpse digest 내러티브는 "하루 항목들 → 청크/항목별 요약 → 계층 병합 → 1회 refine" 파이프라인으로 구성하면 1~4B에서도 품질을 담보할 수 있다.
- **캐싱/인덱싱**: 정적 지시문을 프롬프트 앞쪽에 고정하고 가변 콘텐츠를 뒤에 두면 KV/프리픽스 캐시가 매 청크에 적중해 지연·비용이 최대 90% 절감되며 품질 손실 없음 (https://www.digitalapplied.com/blog/prompt-caching-2026-cut-llm-costs-engineering-guide, https://neuraltrust.ai/blog/llm-caching-strategies). 로컬 요약 추천 모델은 Qwen3 14B/Llama 3.1 8B 급이 거론되지만 이는 데스크톱 기준 (https://www.promptquorum.com/prompt-bites/best-local-llm-document-summarization).
  - 시사점: Glimpse의 digest가 매일 비슷한 시스템 프롬프트를 쓴다면 프롬프트 프리픽스 고정+캐시 재사용, 임베딩 인덱스의 증분 재계산(변경분만)이 모바일 배터리/발열 관리에 직결된다.

---

## 출처

경쟁품/시장
- https://obsidian.md/clipper
- https://web2md.org/blog/best-web-clipper-obsidian-ai-2026
- https://www.remio.ai/post/top-web-clipper-tools-compared-find-your-perfect-match-in-2026
- https://www.recall.it/compare/best-note-taking-chrome-extensions
- https://reflect.app/
- https://reflect.app/blog/reflect-open
- https://github.com/team-reflect/reflect-open
- https://reflect.app/blog/ai-search
- https://discuss.logseq.com/t/logseq-db-changelog/30013
- https://news.ycombinator.com/item?id=48896229
- https://kompozy.io/news/logseq-2-0-db-version-beta
- https://discuss.logseq.com/t/will-logseq-sync-be-open-source/31903
- https://outliner.tana.inc/knowledge-graph
- https://fisletter.beehiiv.com/p/tana-and-ai
- https://www.saner.ai/blogs/tana-reviews
- https://capacities.io/compare
- https://www.asianefficiency.com/technology/tana-vs-capacities-vs-logseq/
- https://toolfinder.com/alternatives/capacities
- https://www.saner.ai/
- https://www.saner.ai/blogs/best-adhd-note-taking-apps
- https://www.napkin.ai/
- https://concurate.com/napkin-ai-review/
- https://storyflow.so/blog/best-ai-note-taking-apps-2026
- https://getweeve.io/blog/the-best-privacy-first-ai-note-takers-in-europe-in-2026
- https://www.meetingsai.app/blog/ai-note-taker-privacy-policies-compared
- https://www.atlasworkspace.ai/blog/best-cross-platform-note-taking-apps
- https://standardnotes.com/
- https://voicescriber.com/local-first-privacy-stack-iphone-apps
- https://www.reddit.com/r/localaiapps/comments/1u3tqqx/

캡처/리콜
- https://evernote.com/learn/how-to-save-emails-to-evernote
- https://support.craft.do/en/integrate/email-to-craft
- https://www.reddit.com/r/Evernote/comments/16c0tus/apps_that_you_can_send_emails_to/
- https://harbor.my/help/how-does-email-to-notes-work/
- https://support.microsoft.com/en-us/windows/privacy/privacy-and-control-over-your-recall-experience
- https://www.geekwire.com/2026/one-year-after-its-rocky-launch-microsofts-windows-recall-still-raises-security-red-flags/
- https://doublepulsar.com/microsoft-recall-on-copilot-pc-testing-the-security-and-privacy-implications-ddb296093b6c
- https://9to5mac.com/2025/12/05/rewind-limitless-meta-acquisition/
- https://screenpipe.com/rewind
- https://luci.memories.ai/blog/rewind-ai-shut-down-on-device-replacement
- https://github.com/yuka-friends/Windrecorder

온디바이스 AI
- https://machinelearning.apple.com/research/apple-foundation-models-2025-updates
- https://developer.apple.com/videos/play/wwdc2025/259/
- https://www.apple.com/newsroom/2025/09/apples-foundation-models-framework-unlocks-new-intelligent-app-experiences/
- https://appbot.co/blog/apple-wwdc-2026-ai-foundation-model-update/
- https://www.apple.com/newsroom/2026/06/apple-aids-app-development-with-new-intelligence-frameworks-and-advanced-tools/
- https://developer.apple.com/documentation/foundationmodels/generating-content-and-performing-tasks-with-foundation-models
- https://www.createwithswift.com/exploring-the-foundation-models-framework/
- https://azamsharp.com/2025/06/18/the-ultimate-guide-to-the-foundation-models-framework.html
- https://lmstudio.ai/
- https://www.sitepoint.com/lm-studio-vs-ollama/
- https://www.thinkdifferent.blog/blog/lm-studio-vs-ollama-the-local-ai-showdown-nobody-wrote-honestly/
- https://zenvanriel.com/ai-engineer-blog/ollama-vs-lm-studio-comparison/
- https://www.datacamp.com/tutorial/gguf-format-a-complete-guide
- https://ollama.com/blog/improved-performance-and-model-support-with-gguf

PKM 이탈/재방문
- https://www.reddit.com/r/ObsidianMD/comments/1eglzk7/where_are_the_second_brain_apps_that_dont_feel/
- https://simplyboard.io/blog/second-brain-app-for-speed-and-privacy
- https://sipsip.ai/blog/best-second-brain-apps-2026
- https://www.xda-developers.com/raindrop-second-brain/
- https://medium.com/obsidian-observer/build-a-second-brain-that-works-for-you-not-the-other-way-around-307d33b0e2a0
- https://medium.com/activated-thinker/5-ai-second-brain-tools-that-actually-help-you-think-not-just-store-560ff0d6d4ef
- https://docs.readwise.io/readwise/docs/faqs/reviewing-highlights
- https://blog.readwise.io/hack-your-brain-with-spaced-repetition-and-active-recall/
- https://mashable.com/tech/google-io-2026-ai-daily-brief
- https://gemini.google/overview/daily-brief/
- https://dantaylorwatt.substack.com/p/using-ai-to-create-a-personalised
- https://adviserry.com/blog/best-ai-daily-briefing-tools
- https://get-alfred.ai/blog/best-ai-daily-briefing-tools

지식 그래프 UX
- https://smartconnections.app/
- https://github.com/brianpetro/obsidian-smart-connections
- https://forum.obsidian.md/t/alternatives-to-smart-connections/108886
- https://www.reddit.com/r/ObsidianMD/comments/1kfixvv/brief_review_of_the_most_wellknown_obsidian_ai/
- https://forum.obsidian.md/t/autolink-automatically-creates-backlinks-to-and-from-notes-with-easy-customizability/104090
- https://www.reddit.com/r/ObsidianMD/comments/1gkczd0/plugin_that_links_words_to_existing_notes/
- https://literallyblah.medium.com/should-we-trust-ai-to-link-our-notes-the-pros-and-cons-of-automated-note-taking-ce7597909876
- https://jxnl.co/writing/2025/01/06/ai-agents-cross-linking/
- https://www.obsidianstats.com/tags/knowledge-graph

로컬 소형 모델 품질
- https://www.jdhodges.com/blog/local-llms-on-tool-calling-2026-pt1-local-lm/
- https://www.reddit.com/r/LocalLLaMA/comments/1r4ie8z/i_tested_21_small_llms_on_toolcalling_judgment/
- https://gorilla.cs.berkeley.edu/leaderboard.html
- https://www.bentoml.com/blog/the-best-open-source-small-language-models
- https://www.distillabs.ai/blog/we-benchmarked-12-small-language-models-across-8-tasks-to-find-the-best-base-model-for-fine-tuning/
- https://developers.googleblog.com/google-ai-edge-small-language-models-multimodality-rag-function-calling/
- https://arxiv.org/html/2602.13229v1
- https://medium.com/google-developer-experts/on-device-rag-for-app-developers-embeddings-vector-search-and-beyond-47127e954c24
- https://www.premai.io/blog/best-open-source-llms-for-rag-in-2026-10-models-ranked-by-retrieval-accuracy/
- https://infohub.delltechnologies.com/en-us/p/demystifying-on-device-intelligent-search-using-rag-architecture/
- https://fireworks.ai/blog/Understanding-Embeddings-and-Reranking-at-Scale
- https://www.f22labs.com/blogs/map-reduce-for-large-document-summarization-with-llms/
- https://cloud.google.com/blog/products/ai-machine-learning/long-document-summarization-with-workflows-and-gemini-models
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12354567/
- https://arxiv.org/abs/2502.00977
- https://arxiv.org/html/2502.00448v1
- https://www.digitalapplied.com/blog/prompt-caching-2026-cut-llm-costs-engineering-guide
- https://neuraltrust.ai/blog/llm-caching-strategies
- https://www.promptquorum.com/prompt-bites/best-local-llm-document-summarization

**근거 부족으로 결론을 유보한 항목**: (1) 검수 없는 전면 자동 그래프를 취한 주류 앱 사례, (2) PKM 이탈률 정량 연구, (3) iOS Shortcuts 캡처의 시장 기대치 자료, (4) 모바일 온디바이스 GGUF(llama.rn 계열) 소비자 UX 모범 사례, (5) consilience.md의 "9개 에이전트 네이티브 노트 앱 비교" — 해당 페이지가 제품 랜딩으로 변경되어 내용 검증 불가, 인용에서 제외.
