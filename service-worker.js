// 週案管理アプリ Service Worker
// 戦略：Network First（常にネットワーク優先）
// RC3以降の改修でservice-worker.jsの変更は原則不要

const CACHE_NAME = 'shuan-v4-rc4';
const FALLBACK_URLS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// インストール時：フォールバック用キャッシュを作成
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FALLBACK_URLS))
  );
  self.skipWaiting();
});

// アクティベート時：古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// フェッチ：Network First
// ネットワーク取得成功 → レスポンスを返しキャッシュも更新
// ネットワーク失敗 → キャッシュから提供
self.addEventListener('fetch', event => {
  // GETリクエストのみ対象
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 正常レスポンスはキャッシュを更新
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // ネットワーク失敗時はキャッシュから提供
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // キャッシュにもない場合はメインのHTMLを返す
          return caches.match('./index.html');
        });
      })
  );
});
