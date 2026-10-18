# Price Hunter 누적 인수인계 — v0.1.0 (2026-10-18)

## 목표
오프라인 특가 상품을 발견했을 때 사진 촬영·상품명 확인 → 무료 인터넷/중고 플랫폼 검색 → 기록한 검증 시세 분석 → 수익률 산정까지 빠르게 진행. 0원 API 운영을 1차 원칙으로 유지.

## 이번 버전 실구현
- 5개 탭 모바일/PC 반응형 UI, PWA 셸
- 제품/가격표 사진 업로드, 브라우저 Tesseract.js `kor+eng` OCR (무료 CDN 최초 연결)
- `BarcodeDetector` 제공 환경에서 바코드 판독, 수동 입력 폴백
- OCR의 제품/가격 후보 추출, 가격표 단위(원·만원·천원) 파싱
- Google `site:` 검색 링크: 중고나라/당근/번개장터/네이버 카페/네이버쇼핑/쿠팡/전체
- Google Lens 독립 링크 (사용자 직접 업로드)
- 시세 등록: 상품 매칭/모델 코드 검증, URL 안전성, 중복 방지, 2개 확인 체크 필수
- 시세별 상태: active/marked_sold/confirmed_sold/new
- 최근 1/3/6/12개월·전체, 표본 수/중앙값/가격 차트, 이상치 경고
- 예상 판매가, 구매가, 수수료, 배송, 포장, 네고, 기타 및 사용자가 입력한 세금으로 수익률 계산
- 분석 이력 로컬 저장/JSON 백업 및 복원/모든 기록 삭제
- Google 검색 결과를 무단 크롤링하거나 ‘확인된 거래가격’으로 둔갑시키지 않음

## 제한/검증 필요
- Google 검색 결과의 크롤링 및 중고 플랫폼 가격 데이터 자동 수집은 포함되지 않음(정상 접근 API 미확보).
- Tesseract OCR 모델과 언어팩은 CDN 접근이 필요한 외부 런타임. 현재 이 실행 환경에서는 CDN 접근이 차단되어 **실사진 OCR 추론의 엔드투엔드 검증을 수행하지 못함**. 프로그램의 OCR 호출 경로는 구현됨.
- `BarcodeDetector` 실제 기기별 지원과 현장 인식 성능 미검증.
- 한글/영문 텍스트가 없는 제품 사진의 종류/모델을 자체 모델로 분류하지 못함.
- 파일 URL에서 브라우저별 Worker 제한이 있을 수 있어 HTTPS 배포 권장.
- 판매완료 표시만으로 실제 판매액 확인이 불가능함; 실거래로 직접 확인한 자료만 실거래 통계에 포함.
- 고가/유사 모델, 묶음·리퍼·구성품·색상·세대 차이는 수동 검증 필요.
- 상품별 데이터는 동일 타이틀의 스냅샷으로 연결됨. 제품명을 재입력해서 바꾸면 기존 시세가 다른 이름 아래 남을 수 있음.

## 테스트 결과
- `node tests/core.test.js`: 24/24 통과 (가격 단위/배송비 오인식 방지/동일 모델 판정/이종 모델 차단/시세 중앙값/손익분기 계산 등)
- `node --check app.js` / `core.js`: 구문 검사 통과
- Chromium DOM 인터랙션 모의 테스트: 데스크톱/390px 모바일에서 검색링크 7개, 시세 등록, 순이익 50,000원, 분석 보관 정상, JS 예외 0개
- 모바일 390px 가로 스크롤 이탈 없음. 다만 테스트 브라우저의 보안 정책으로 HTTPS 페이지 자체 연결이 차단되어 OCR CDN 실제 호출과 PWA 실배포를 확인하지 못함.
- 폴라로이드 제품의 7만원·20만원·10만원 언급은 사용자 사례이며, 앱에 실시간 확인 시세로 채우지 않았음.

## 향후 작업 우선순위
1. 실제 폰 Android Chrome/Edge 사진 30~100장 OCR 벤치마크: 인식 성공률, 잘못된 가격 추출, 조도/가격표 영역 크롭 테스트. 한국어 문자열 교정 UX.
2. 제품 식별: EAN 조회 허용된 무료 상품 DB가 있는지 조사; CLIP/Florence-2 기반 WebGPU 모델 추가를 검토하고 모델 라이선스/기기별 메모리 프로파일링.
3. 외부 시세 제공 가능 경로: 중고나라·당근·번개장터 공식 제휴/공개 API 정책 확인, 승인된 피드만 통합. Google 검색 UI 결과는 API가 아니므로 크롤러로 가정하지 말 것.
4. 등록 UX: 매물 스크린샷 OCR→제목·가격·URL 후보 한꺼번에 확인하고 등록, 동일 상품 묶음/부품 매물 자동 제외.
5. 데이터 퀄리티: 날짜·판매상태 신뢰도, 상태 변화 이력(동일 URL), 출처별 중복 검사, 표본 수에 따른 신뢰구간.
6. APK: PWA 확정 이후 Capacitor 기반 Android App Bundle/APK 제작, 권한 분리, 테스트.
7. 배포: GitHub Pages `main / (root)` 배포, 실기기 모델 다운로드/서비스워커 검증.

## 상태
**v0.1.0 사용 가능(보조 검증형)** — 자동 전체 가격 수집·완전 자동 상품 인식 기능은 아직 개발되지 않음. 따라서 모든 기능을 개발 완료했다고 표시하지 말 것.

## 참고 문헌
- https://github.com/naptha/tesseract.js
- https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector
- https://github.com/huggingface/transformers.js
- https://developers.google.com/search/docs/monitor-debug/search-operators/all-search-site?hl=ko
- https://developers.google.com/custom-search/v1/overview

## GitHub 배포 상태
- 공식 저장소: https://github.com/kdc916/Price-Hunter
- 2026-10-18 버전 파일 커밋 및 fetch_file 확인됨.
- GitHub Pages 주소는 외부 웹 검증 실패로 아직 공개 배포 성공을 주장하지 않음. Pages 설정 `main/(root)` 점검 필요.
