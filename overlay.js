/**
 * overlay.js
 * 
 * マップ機能のメインJavaScriptファイル
 * 各モジュールを初期化し、連携させる
 */

// モジュールのインポート
const dataStore = require('./js/dataStore');
const eventHandler = require('./js/eventHandler');
const mapRenderer = require('./js/mapRenderer');
const uiController = require('./js/uiController');
const logManager = require('./js/logManager');

// DOMが読み込まれたら初期化を開始
document.addEventListener('DOMContentLoaded', () => {
  console.log('オーバーレイの初期化を開始します');

  // マップキャンバスの取得
  const mapCanvas = document.getElementById('map-canvas');
  if (!mapCanvas) {
    console.error('マップキャンバスが見つかりません');
    return;
  }

  // UI要素の参照を取得
  const uiElements = {
    mapContainer: document.getElementById('map-container'),
    monsterList: document.getElementById('monster-list'),
    searchField: document.getElementById('monster-id-search'),
    clearButton: document.getElementById('clear-monsters'),
    toggleMapButton: document.getElementById('toggle-map'),
    copyIdsButton: document.getElementById('copy-monster-ids'),
    zoomInButton: document.getElementById('zoom-in'),
    zoomOutButton: document.getElementById('zoom-out'),
    centerMapButton: document.getElementById('center-map'),
    toggleTrackingButton: document.getElementById('toggle-tracking')
  };

  // ログ関連のUI要素
  const logElements = {
    logDisplay: document.getElementById('log-display'),
    clearLogsButton: document.getElementById('clear-logs'),
    toggleLogsButton: document.getElementById('toggle-logs')
  };

  // キャンバスのサイズをコンテナに合わせる
  function resizeCanvas() {
    const container = uiElements.mapContainer;
    if (container && mapCanvas) {
      mapCanvas.width = container.clientWidth;
      mapCanvas.height = container.clientHeight;

      // マップレンダラーにサイズ変更を通知
      if (mapRenderer.initialized) {
        mapRenderer.resizeCanvas(mapCanvas.width, mapCanvas.height);
      }
    }
  }

  // ウィンドウリサイズ時にキャンバスサイズを調整
  window.addEventListener('resize', resizeCanvas);

  // 初期化順序: データストア → イベントハンドラ → マップレンダラー → UIコントローラー → ログマネージャー

  // 1. イベントハンドラの初期化
  eventHandler.initialize();

  // 2. マップレンダラーの初期化
  mapRenderer.initialize(mapCanvas);

  // 3. UIコントローラーの初期化
  uiController.initialize(uiElements);

  // 4. ログマネージャーの初期化
  logManager.initialize(logElements);

  // 5. キャンバスのサイズを設定
  resizeCanvas();

  console.log('オーバーレイの初期化が完了しました');

  // アプリケーション終了時のクリーンアップ
  window.addEventListener('beforeunload', () => {
    console.log('オーバーレイを終了します');

    // 各モジュールを終了
    logManager.dispose();
    uiController.dispose();
    mapRenderer.dispose();
    eventHandler.dispose();
  });
});

// エラーハンドリング
window.addEventListener('error', (event) => {
  console.error('未処理のエラーが発生しました:', event.error);
});
