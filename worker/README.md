# Price Hunter Cafe Worker — 최초 1회 설치

**본 서버는 비밀번호나 API 키 없이 자동으로 네이버 카페를 생성하지 않습니다.** 네이버 카페, 일반 게시판, 네이버 개발자 앱, 무료 Cloudflare 계정을 먼저 생성해야 합니다. GitHub Pages는 게시글 **초안/복사까지만** 가능하며, 실제 자동 등록은 동일 도메인에서 제공되는 Worker 버전을 이용합니다.

## 공식 근거

- 네이버 카페 글쓰기: https://developers.naver.com/docs/login/cafe-api/cafe-api.md
- 네이버 로그인: https://developers.naver.com/docs/login/devguide/devguide.md
- Cloudflare Worker 가격: https://developers.cloudflare.com/workers/platform/pricing/

## 운영 준비

1. 네이버 카페를 개설하고 **일반 게시판 두 개**(공식 특가, 회원 특가)를 만들어 각각 `clubid`, `menuid` 숫자를 준비합니다. **상품 판매 게시판은 공식 글쓰기 API에서 지원하지 않습니다.**
2. NAVER Developers에서 로그인 애플리케이션을 생성합니다. 네이버 로그인과 카페 글쓰기 API 이용권한을 활성화합니다. Callback URL: `https://<Worker 배포주소>/auth/naver/callback` (네이버 개발자센터에 정확히 등록).
3. Cloudflare 무료 계정에서 Workers 및 D1을 이용합니다. 아래 명령은 개발자 PC(또는 GitHub Codespaces)에 Node.js가 설치된 환경을 전제로 합니다.

```bash
cd worker
npm install
npx wrangler login
npx wrangler d1 create price-hunter-community
cp wrangler.example.jsonc wrangler.jsonc
```

4. `wrangler.jsonc`의 `database_id`를 방금 생성한 D1 ID로, `NAVER_CAFE_ID`, `NAVER_OFFICIAL_MENU_ID`, `NAVER_MEMBER_MENU_ID`를 실제 숫자로 교체합니다. 이 값은 개인 비밀번호가 아닙니다.
5. 네이버 ID와 Secret 및 토큰 암호화 키는 **배포된 GitHub 소스나 wrangler.jsonc에 절대로 넣지 마세요.**

```bash
npx wrangler secret put NAVER_CLIENT_ID
npx wrangler secret put NAVER_CLIENT_SECRET
openssl rand -base64 32
npx wrangler secret put TOKEN_ENCRYPTION_KEY
npx wrangler d1 migrations apply price-hunter-community --remote
npm run deploy
```

6. 배포된 Worker 주소에서 네이버 로그인 → 개인 프로필 `본인 식별 ID`를 확인하고 아래 명령을 실행합니다. 네이버 공개 닉네임이나 로그인 이메일이 아닌 OAuth 응답의 고유 ID입니다.

```bash
npx wrangler secret put NAVER_ADMIN_ID
npm run deploy
```

7. 배포 Worker 원본 URL을 네이버 개발자센터에 Callback으로 등록했는지 확인합니다. 서버 인증·첫 게시 테스트를 진행합니다. Google Chrome 등에서 팝업 차단이나 서드파티 쿠키 문제를 피하기 위해 **동일한 Worker 주소**에서 페이지를 엽니다.

## 게시 정책

- **운영자 공식:** 회원이 사진/특가를 검수 큐에 보냅니다. 운영자는 반드시 승인 버튼을 직접 클릭해야 본인 네이버 계정으로 게시됩니다. 자동 무검수 게시 불가.
- **회원 직접:** 해당 네이버 계정으로 로그인하고 게시할 상품·정보를 확인 후 명시적 게시 버튼을 누르면 본인 이름으로 게시됩니다.
- 카페의 일반 게시판 글쓰기 허용 등급/권한과 네이버 카페 API 권한에 따라 실제 게시 여부가 다릅니다. 회원은 해당 카페에 가입돼 있어야 합니다.
- 본 시스템은 사용자당 하루 최대 5건, 1분 간격, 동일 상품·판매처·일자의 중복 제보 차단을 기본으로 합니다. 네이버 공식 API 한도(계정당 하루 최대 200건)는 별도로 적용됩니다.
- 글 공개는 **카페 회원 공개**(`openyn=false`, `searchopen=false`)가 기본값입니다. 운영 정책과 정보제공 동의 없이 전체 공개로 바꾸지 마세요.
- 확인되지 않은 온라인 최저가·예상 순이익·재고는 단정하지 않습니다. 사진 첨부는 선택 사항이며, 브라우저에서 JPEG 재인코딩해 EXIF를 제거합니다. 사진에 찍힌 개인정보는 사용자가 제거해야 합니다.
- 서버는 AES-GCM으로 네이버 토큰을 암호화해 D1에 저장합니다. `TOKEN_ENCRYPTION_KEY` 분실 시 기존 세션/토큰을 읽을 수 없으므로 네이버 재로그인이 필요합니다.
- 네이버 카페 API의 게시 결과가 애매하면 `needs_review` 상태로 보관하고 자동 재시도하지 않아 중복 글이 올라갈 위험을 줄입니다.

## 배포 확인

- `GET /api/config`: `{configured:true}`면 초기 설정이 유효합니다.
- `GET /api/me`: OAuth 연결 및 본인 ID 확인.
- `POST /api/deals` (`mode=official`): 대기열 제보 생성.
- 운영자 `GET /api/deals?scope=pending`: 대기열 조회.
- 운영자 `POST /api/deals/{id}/approve`: 승인 후 실제 글쓰기.
- 회원 `POST /api/deals` (`mode=member`): 본인 글쓰기.

**미완료 사항**: 이 개발 산출물은 네이버 앱 ID/Secret, 카페 ID, 실제 Worker 계정이 없는 상태입니다. API 호출 성공·실제 게시물 생성·운영 서버는 아직 검증되지 않았으며, 사용자 인증 이후 확인해야 합니다.
