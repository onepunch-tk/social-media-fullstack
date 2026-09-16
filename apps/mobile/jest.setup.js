process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';
// @shopify/flash-list@2.0.2의 jestSetup은 존재하지 않는 RecyclerView export로 FlashList를 덮어 undefined로 만든다.
// v2는 mock 없이도 jest에서 항목·ListEmptyComponent를 렌더하므로 require하지 않는다.
// 앱에서는 루트 레이아웃이 store를 import해 defineThemes를 보장한다 — 화면 단독 렌더 테스트에서는 여기서 대신한다.
require('./src/shared/presentation/theme/theme');
