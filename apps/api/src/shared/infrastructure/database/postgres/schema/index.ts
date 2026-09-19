// 영속성 스키마 집결점 — 테이블이 생기면 `{domain-복수형}.schema.ts`를 여기서 re-export한다.
export { accounts } from './account.schema.js';
export { postCounters, postLikes, posts } from './post.schema.js';
export { profiles } from './profile.schema.js';
