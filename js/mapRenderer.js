/**
 * mapRenderer.js
 * 
 * マップ機能のためのレンダリングモジュール
 * Canvas APIを使用してマップ、モンスター、プレイヤーなどを描画する
 */

const dataStore = require('./dataStore');

class MapRenderer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.initialized = false;
    this.animationFrameId = null;
    
    // オフスクリーンキャンバス（グリッド描画用）
    this.offscreenCanvas = null;
    this.offscreenCtx = null;
    this.gridNeedsUpdate = true;
    
    // マウスイベント用の状態
    this.isDragging = false;
    this.lastMousePos = { x: 0, y: 0 };
    
    // バインドしたメソッド
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    this.render = this.render.bind(this);
  }

  /**
   * レンダラーを初期化する
   * @param {HTMLCanvasElement} canvas - マップ描画用のキャンバス要素
   */
  initialize(canvas) {
    if (this.initialized) return;
    
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // オフスクリーンキャンバスの初期化
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = canvas.width;
    this.offscreenCanvas.height = canvas.height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    
    // マウスイベントリスナーの設定
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseUp);
    this.canvas.addEventListener('wheel', this.handleWheel);
    
    // データストアのイベントリスナーを設定
    dataStore.addEventListener('monsterUpdate', this.render);
    dataStore.addEventListener('playerUpdate', this.render);
    dataStore.addEventListener('userUpdate', this.render);
    dataStore.addEventListener('mapConfigUpdate', (config) => {
      // ズームレベルが変更された場合はグリッドを再描画
      if ('zoomLevel' in config) {
        this.gridNeedsUpdate = true;
      }
      this.render();
    });
    
    // 初回描画
    this.gridNeedsUpdate = true;
    this.startRenderLoop();
    
    this.initialized = true;
    console.log('マップレンダラーが初期化されました');
  }

  /**
   * レンダリングループを開始する
   */
  startRenderLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    const loop = () => {
      this.render();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    
    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * レンダリングループを停止する
   */
  stopRenderLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * レンダラーを終了する
   */
  dispose() {
    if (!this.initialized) return;
    
    // レンダリングループを停止
    this.stopRenderLoop();
    
    // イベントリスナーを削除
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    
    // データストアのイベントリスナーを削除
    dataStore.removeEventListener('monsterUpdate', this.render);
    dataStore.removeEventListener('playerUpdate', this.render);
    dataStore.removeEventListener('userUpdate', this.render);
    
    this.initialized = false;
    console.log('マップレンダラーが終了しました');
  }

  /**
   * マップをレンダリングする
   */
  render() {
    if (!this.initialized || !this.canvas || !this.ctx) return;
    
    const { mapConfig, playerPosition, monsters } = dataStore;
    const { width, height } = this.canvas;
    
    // キャンバスをクリア
    this.ctx.clearRect(0, 0, width, height);
    
    // グリッドを描画（必要な場合のみ再生成）
    if (this.gridNeedsUpdate) {
      this.drawGridToOffscreen();
      this.gridNeedsUpdate = false;
    }
    
    // オフスクリーンキャンバスからグリッドをコピー
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
    
    // マップの中心座標を計算
    const centerX = width / 2;
    const centerY = height / 2;
    
    // プレイヤー追従モードの場合、プレイヤーを中心に表示
    if (mapConfig.isTrackingPlayer) {
      this.centerMapOnPlayer(centerX, centerY);
    }
    
    // モンスターの経路を描画（有効な場合）
    if (mapConfig.showMonsterPaths) {
      this.drawMonsterPaths();
    }
    
    // モンスターを描画
    this.drawMonsters(centerX, centerY);
    
    // プレイヤーを描画
    this.drawPlayer(centerX, centerY);
    
    // ユーザーを描画（プレイヤーと異なる場合）
    this.drawUser(centerX, centerY);
    
    // デバッグ情報を描画（開発中のみ）
    this.drawDebugInfo();
  }

  /**
   * オフスクリーンキャンバスにグリッドを描画する
   */
  drawGridToOffscreen() {
    if (!this.offscreenCtx) return;
    
    const { width, height } = this.offscreenCanvas;
    const { zoomLevel } = dataStore.mapConfig;
    
    // オフスクリーンキャンバスをクリア
    this.offscreenCtx.clearRect(0, 0, width, height);
    
    // グリッドの間隔（ズームレベルに応じて調整）
    const gridSize = 50 * zoomLevel;
    
    // グリッドの色と線の太さを設定
    this.offscreenCtx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    this.offscreenCtx.lineWidth = 1;
    
    // 垂直線を描画
    for (let x = 0; x <= width; x += gridSize) {
      this.offscreenCtx.beginPath();
      this.offscreenCtx.moveTo(x, 0);
      this.offscreenCtx.lineTo(x, height);
      this.offscreenCtx.stroke();
    }
    
    // 水平線を描画
    for (let y = 0; y <= height; y += gridSize) {
      this.offscreenCtx.beginPath();
      this.offscreenCtx.moveTo(0, y);
      this.offscreenCtx.lineTo(width, y);
      this.offscreenCtx.stroke();
    }
    
    // 中心点を強調表示
    this.offscreenCtx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    this.offscreenCtx.lineWidth = 2;
    
    const centerX = width / 2;
    const centerY = height / 2;
    
    // 中心の十字線を描画
    this.offscreenCtx.beginPath();
    this.offscreenCtx.moveTo(centerX - 10, centerY);
    this.offscreenCtx.lineTo(centerX + 10, centerY);
    this.offscreenCtx.moveTo(centerX, centerY - 10);
    this.offscreenCtx.lineTo(centerX, centerY + 10);
    this.offscreenCtx.stroke();
  }

  /**
   * プレイヤーを中心にマップを表示する
   * @param {number} centerX - キャンバスの中心X座標
   * @param {number} centerY - キャンバスの中心Y座標
   */
  centerMapOnPlayer(centerX, centerY) {
    // プレイヤーの位置をマップの中心に設定
    dataStore.mapConfig.centerCoordinates = {
      x: dataStore.playerPosition.worldCoordinates.x,
      y: dataStore.playerPosition.worldCoordinates.z
    };
  }

  /**
   * モンスターの経路を描画する
   */
  drawMonsterPaths() {
    // 実装は将来的な拡張用
  }

  /**
   * モンスターを描画する
   * @param {number} centerX - キャンバスの中心X座標
   * @param {number} centerY - キャンバスの中心Y座標
   */
  drawMonsters(centerX, centerY) {
    const { monsters } = dataStore;
    const { zoomLevel } = dataStore.mapConfig;
    
    // すべてのモンスターを描画
    for (const id in monsters) {
      const monster = monsters[id];
      
      // 表示されないモンスターはスキップ
      if (!monster.isVisibleOnMap) continue;
      
      // モンスターのマップ座標を取得
      const { x, y } = monster.mapCoordinates;
      
      // スクリーン座標に変換
      const screenX = centerX + x * zoomLevel;
      const screenY = centerY + y * zoomLevel;
      
      // モンスターの色を取得
      const color = dataStore.getMonsterColor(id);
      
      // モンスターを描画（円として）
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, 5, 0, Math.PI * 2);
      this.ctx.fill();
      
      // モンスターIDを描画
      this.ctx.fillStyle = 'white';
      this.ctx.font = '10px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(monster.displayId, screenX, screenY - 10);
    }
  }

  /**
   * プレイヤーを描画する
   * @param {number} centerX - キャンバスの中心X座標
   * @param {number} centerY - キャンバスの中心Y座標
   */
  drawPlayer(centerX, centerY) {
    // プレイヤーを中心に描画
    this.ctx.fillStyle = 'blue';
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    this.ctx.fill();
    
    // プレイヤーの向きを示す線を描画
    const { rotation } = dataStore.playerPosition;
    const dirX = Math.sin(rotation) * 15;
    const dirY = Math.cos(rotation) * 15;
    
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY);
    this.ctx.lineTo(centerX + dirX, centerY - dirY);
    this.ctx.stroke();
  }

  /**
   * ユーザーを描画する（プレイヤーと異なる場合）
   * @param {number} centerX - キャンバスの中心X座標
   * @param {number} centerY - キャンバスの中心Y座標
   */
  drawUser(centerX, centerY) {
    const { playerPosition, userPosition, mapConfig } = dataStore;
    
    // プレイヤーとユーザーが同じ位置の場合は描画しない
    if (
      playerPosition.worldCoordinates.x === userPosition.worldCoordinates.x &&
      playerPosition.worldCoordinates.z === userPosition.worldCoordinates.z
    ) {
      return;
    }
    
    // ユーザーの相対位置を計算
    const relX = userPosition.worldCoordinates.x - playerPosition.worldCoordinates.x;
    const relZ = userPosition.worldCoordinates.z - playerPosition.worldCoordinates.z;
    
    // スクリーン座標に変換
    const screenX = centerX + relX * mapConfig.zoomLevel;
    const screenY = centerY + relZ * mapConfig.zoomLevel;
    
    // ユーザーを描画
    this.ctx.fillStyle = 'green';
    this.ctx.beginPath();
    this.ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
    this.ctx.fill();
    
    // ユーザーの向きを示す線を描画
    const { rotation } = userPosition;
    const dirX = Math.sin(rotation) * 15;
    const dirY = Math.cos(rotation) * 15;
    
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(screenX, screenY);
    this.ctx.lineTo(screenX + dirX, screenY - dirY);
    this.ctx.stroke();
  }

  /**
   * デバッグ情報を描画する
   */
  drawDebugInfo() {
    // 開発中のみ有効
    const showDebug = false;
    if (!showDebug) return;
    
    const { playerPosition, mapConfig } = dataStore;
    const monsterCount = Object.keys(dataStore.monsters).length;
    const visibleMonsterCount = dataStore.getVisibleMonsterIds().length;
    
    this.ctx.fillStyle = 'white';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'left';
    
    const debugInfo = [
      `プレイヤー位置: X=${playerPosition.worldCoordinates.x.toFixed(2)}, Y=${playerPosition.worldCoordinates.y.toFixed(2)}, Z=${playerPosition.worldCoordinates.z.toFixed(2)}`,
      `ズームレベル: ${mapConfig.zoomLevel.toFixed(2)}`,
      `モンスター数: ${monsterCount} (表示: ${visibleMonsterCount})`,
      `追従モード: ${mapConfig.isTrackingPlayer ? 'ON' : 'OFF'}`
    ];
    
    debugInfo.forEach((text, index) => {
      this.ctx.fillText(text, 10, 20 + index * 20);
    });
  }

  /**
   * マウスダウンイベントハンドラ
   * @param {MouseEvent} event - マウスイベント
   */
  handleMouseDown(event) {
    this.isDragging = true;
    this.lastMousePos = {
      x: event.clientX,
      y: event.clientY
    };
    
    // ドラッグ開始時に追従モードを無効化
    if (dataStore.mapConfig.isTrackingPlayer) {
      dataStore.updateMapConfig({ isTrackingPlayer: false });
    }
  }

  /**
   * マウス移動イベントハンドラ
   * @param {MouseEvent} event - マウスイベント
   */
  handleMouseMove(event) {
    if (!this.isDragging) return;
    
    const deltaX = event.clientX - this.lastMousePos.x;
    const deltaY = event.clientY - this.lastMousePos.y;
    
    // マップの中心座標を更新
    const { centerCoordinates, zoomLevel } = dataStore.mapConfig;
    const newCenterX = centerCoordinates.x - deltaX / zoomLevel;
    const newCenterY = centerCoordinates.y - deltaY / zoomLevel;
    
    dataStore.updateMapConfig({
      centerCoordinates: { x: newCenterX, y: newCenterY }
    });
    
    this.lastMousePos = {
      x: event.clientX,
      y: event.clientY
    };
  }

  /**
   * マウスアップイベントハンドラ
   * @param {MouseEvent} event - マウスイベント
   */
  handleMouseUp(event) {
    this.isDragging = false;
  }

  /**
   * ホイールイベントハンドラ（ズーム処理）
   * @param {WheelEvent} event - ホイールイベント
   */
  handleWheel(event) {
    event.preventDefault();
    
    const { zoomLevel } = dataStore.mapConfig;
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1; // ズームイン/アウト係数
    
    // ズームレベルの制限（最小0.1、最大5.0）
    const newZoomLevel = Math.max(0.1, Math.min(5.0, zoomLevel * zoomFactor));
    
    dataStore.updateMapConfig({ zoomLevel: newZoomLevel });
  }

  /**
   * キャンバスのサイズを更新する
   * @param {number} width - 新しい幅
   * @param {number} height - 新しい高さ
   */
  resizeCanvas(width, height) {
    if (!this.initialized) return;
    
    this.canvas.width = width;
    this.canvas.height = height;
    
    // オフスクリーンキャンバスも更新
    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;
    
    // グリッドを再描画
    this.gridNeedsUpdate = true;
    this.render();
  }
}

// シングルトンインスタンスを作成してエクスポート
const mapRenderer = new MapRenderer();
module.exports = mapRenderer;