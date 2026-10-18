# Price Hunter — 무료 OCR 엔진 및 실사진 개선 평가 (v0.5.1)

## 현재 및 후보
- 운영: Tesseract.js 6, 한국어+영어, 브라우저 안에서 인식. 별도 유료 OCR API 없음.
- 정밀 후보: PaddleOCR PP-OCRv5 한국어 인식 모델(`korean_PP-OCRv5_mobile_rec`, 약 14MB). **v0.5.1에는 실행형 PaddleOCR이 탑재되지 않았음.**
- 공식 브라우저 SDK: `@paddleocr/paddleocr-js` (Apache-2.0). ONNX 검출/인식 모델, WASM 리소스, 모델 아카이브 포맷 및 배포가 필요.

## 로보락 사용자 스크린샷 기준 실제 OCR 조사
사용자 이미지 675×250, 로보락 S9 MaxV Ultra, 정가 1,840,000원 / 할인가 1,190,000원 (35%).
- Tesseract 5 CLI kor+eng PSM 6 전체: 판매가 `1,190,000` 뒤 `원` 누락.
- 가격 띠 x155..515, y113..194 3배 확대 PSM 6: `치가 35%1,190,000원`처럼 통화 단위 확인.
이는 단일 이미지의 정성 비교로, 전체 실기기 정확도 수치가 아님.

## v0.5.1 처리 단계
1. 전체 이미지의 OCR을 수행한다.
2. 기기 가로세로 비율로 수평 상품 카드/PC 2열/세로 모바일을 구분한다.
3. 오른쪽 가격 띠는 반드시 한 번 재인식해 취소선 정가를 구매가로 쓰지 않도록 한다.
4. 가격 근거가 부족하면 추가 상품명 영역 및 고대비 OCR을 진행한다.
5. 원화 단위, 할인율 일치, 원가, 적립금, 포인트, 쿠폰, 혜택가를 교차 검증해 구매가를 선택한다.

## PaddleOCR 교체 전 반드시 확인
- 공식 SDK에 `lang=korean` 모델을 실제로 브라우저에서 초기화할 수 있는지
- 모델 다운로드, CORS, GitHub Pages에서의 WASM 및 Worker 호환성
- 모델 파일 캐시, 모바일 메모리, 처리 지연과 폴백 흐름
- 다양한 쇼핑몰 30장 이상의 실제 스크린샷으로 판매가 인식 성공률/오입력률/소요시간 비교

## 1차 공식 자료
- https://github.com/PaddlePaddle/PaddleOCR/blob/main/docs/version3.x/inference_deployment/cross_platform/browser.en.md
- https://github.com/PaddlePaddle/PaddleOCR/blob/main/docs/version3.x/module_usage/text_recognition.en.md
- https://github.com/naptha/tesseract.js/blob/master/docs/api.md
