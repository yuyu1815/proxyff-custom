/**
 * uiController.js
 * 
 * マップ機能のためのUIコントロールモジュール
 * ボタン、検索フィールド、モンスターリストなどのUI要素を制御する
 */

const dataStore = require('./dataStore');
const { clipboard } = require('electron');

class UIController {
  constructor() {
    this.elements = {
      mapContainer: null,
      monsterList: null,
      searchField: null,
      clearButton: null,
      toggleMapButton: null,
      copyIdsButton: null,
      zoomInButton: null,
      zoomOutButton: null,
      centerMapButton: null,
      toggleTrackingButton: null
    };
    
    this.initialized = false;
    
    // バインドしたメソッド
    this.handleSearch = this.handleSearch.bind(this);
    this.handleClearMonsters = this.handleClearMonsters.bind(this);
    this.handleToggleMap = this.handleToggleMap.bind(this);
    this.handleCopyMonsterIds = this.handleCopyMonsterIds.bind(this);
    this.handleZoomIn = this.handleZoomIn.bind(this);
    this.handleZoomOut = this.handleZoomOut.bind(this);
    this.handleCenterMap = this.handleCenterMap.bind(this);
    this.handleToggleTracking = this.handleToggleTracking.bind(this);
    this.updateMonsterList = this.updateMonsterList.bind(this);
  }

  /**
   * UIコントローラーを初期化する
   * @param {Object} elements - UI要素のオブジェクト
   */
  initialize(elements) {
    if (this.initialized) return;
    
    // 要素の参照を保存
    this.elements = { ...this.elements, ...elements };
    
    // 要素の存在チェック
    for (const key in this.elements) {
      if (!this.elements[key]) {
        console.warn(`UI要素 "${key}" が見つかりません`);
      }
    }
    
    // イベントリスナーを設定
    this.setupEventListeners();
    
    // データストアのイベントリスナーを設定
    dataStore.addEventListener('monsterUpdate', this.updateMonsterList);
    dataStore.addEventListener('mapConfigUpdate', this.updateUIState.bind(this));
    
    // 初期UI状態を設定
    this.updateUIState(dataStore.mapConfig);
    
    this.initialized = true;
    console.log('UIコントローラーが初期化されました');
  }

  /**
   * イベントリスナーを設定する
   */
  setupEventListeners() {
    // 検索フィールド
    if (this.elements.searchField) {
      this.elements.searchField.addEventListener('input', this.handleSearch);
    }
    
    // クリアボタン
    if (this.elements.clearButton) {
      this.elements.clearButton.addEventListener('click', this.handleClearMonsters);
    }
    
    // マップ切り替えボタン
    if (this.elements.toggleMapButton) {
      this.elements.toggleMapButton.addEventListener('click', this.handleToggleMap);
    }
    
    // モンスターIDコピーボタン
    if (this.elements.copyIdsButton) {
      this.elements.copyIdsButton.addEventListener('click', this.handleCopyMonsterIds);
    }
    
    // ズームインボタン
    if (this.elements.zoomInButton) {
      this.elements.zoomInButton.addEventListener('click', this.handleZoomIn);
    }
    
    // ズームアウトボタン
    if (this.elements.zoomOutButton) {
      this.elements.zoomOutButton.addEventListener('click', this.handleZoomOut);
    }
    
    // 中央揃えボタン
    if (this.elements.centerMapButton) {
      this.elements.centerMapButton.addEventListener('click', this.handleCenterMap);
    }
    
    // 追従切り替えボタン
    if (this.elements.toggleTrackingButton) {
      this.elements.toggleTrackingButton.addEventListener('click', this.handleToggleTracking);
    }
  }

  /**
   * UIコントローラーを終了する
   */
  dispose() {
    if (!this.initialized) return;
    
    // イベントリスナーを削除
    if (this.elements.searchField) {
      this.elements.searchField.removeEventListener('input', this.handleSearch);
    }
    
    if (this.elements.clearButton) {
      this.elements.clearButton.removeEventListener('click', this.handleClearMonsters);
    }
    
    if (this.elements.toggleMapButton) {
      this.elements.toggleMapButton.removeEventListener('click', this.handleToggleMap);
    }
    
    if (this.elements.copyIdsButton) {
      this.elements.copyIdsButton.removeEventListener('click', this.handleCopyMonsterIds);
    }
    
    if (this.elements.zoomInButton) {
      this.elements.zoomInButton.removeEventListener('click', this.handleZoomIn);
    }
    
    if (this.elements.zoomOutButton) {
      this.elements.zoomOutButton.removeEventListener('click', this.handleZoomOut);
    }
    
    if (this.elements.centerMapButton) {
      this.elements.centerMapButton.removeEventListener('click', this.handleCenterMap);
    }
    
    if (this.elements.toggleTrackingButton) {
      this.elements.toggleTrackingButton.removeEventListener('click', this.handleToggleTracking);
    }
    
    // データストアのイベントリスナーを削除
    dataStore.removeEventListener('monsterUpdate', this.updateMonsterList);
    dataStore.removeEventListener('mapConfigUpdate', this.updateUIState.bind(this));
    
    this.initialized = false;
    console.log('UIコントローラーが終了しました');
  }

  /**
   * 検索フィールドの入力を処理する
   * @param {Event} event - 入力イベント
   */
  handleSearch(event) {
    const searchTerm = event.target.value.trim();
    dataStore.updateMapConfig({ searchTerm });
  }

  /**
   * モンスターをクリアする
   */
  handleClearMonsters() {
    dataStore.clearMonsters();
    this.showFeedback('モンスターリストをクリアしました');
  }

  /**
   * マップの表示/非表示を切り替える
   */
  handleToggleMap() {
    const mapContainer = this.elements.mapContainer;
    if (!mapContainer) return;
    
    const isVisible = mapContainer.style.display !== 'none';
    mapContainer.style.display = isVisible ? 'none' : 'block';
    
    // ボタンのテキストを更新
    if (this.elements.toggleMapButton) {
      this.elements.toggleMapButton.textContent = isVisible ? 'マップを表示' : 'マップを非表示';
    }
    
    this.showFeedback(isVisible ? 'マップを非表示にしました' : 'マップを表示しました');
  }

  /**
   * モンスターIDをクリップボードにコピーする
   */
  handleCopyMonsterIds() {
    const visibleIds = dataStore.getVisibleMonsterIds();
    
    if (visibleIds.length === 0) {
      this.showFeedback('コピーするモンスターIDがありません');
      return;
    }
    
    // IDをカンマ区切りでクリップボードにコピー
    const idText = visibleIds.join(', ');
    clipboard.writeText(idText);
    
    this.showFeedback(`${visibleIds.length}個のモンスターIDをコピーしました`);
  }

  /**
   * ズームインする
   */
  handleZoomIn() {
    const { zoomLevel } = dataStore.mapConfig;
    const newZoomLevel = Math.min(5.0, zoomLevel * 1.2);
    dataStore.updateMapConfig({ zoomLevel: newZoomLevel });
  }

  /**
   * ズームアウトする
   */
  handleZoomOut() {
    const { zoomLevel } = dataStore.mapConfig;
    const newZoomLevel = Math.max(0.1, zoomLevel / 1.2);
    dataStore.updateMapConfig({ zoomLevel: newZoomLevel });
  }

  /**
   * マップをプレイヤーの位置に中央揃えする
   */
  handleCenterMap() {
    dataStore.updateMapConfig({
      centerCoordinates: {
        x: dataStore.playerPosition.worldCoordinates.x,
        y: dataStore.playerPosition.worldCoordinates.z
      }
    });
    
    this.showFeedback('マップをプレイヤーの位置に中央揃えしました');
  }

  /**
   * プレイヤー追従モードを切り替える
   */
  handleToggleTracking() {
    const isTracking = !dataStore.mapConfig.isTrackingPlayer;
    dataStore.updateMapConfig({ isTrackingPlayer: isTracking });
    
    this.showFeedback(isTracking ? 'プレイヤー追従モードをONにしました' : 'プレイヤー追従モードをOFFにしました');
    
    // ボタンのテキストを更新
    if (this.elements.toggleTrackingButton) {
      this.elements.toggleTrackingButton.textContent = isTracking ? '追従OFF' : '追従ON';
    }
  }

  /**
   * モンスターリストを更新する
   * @param {Object} updateInfo - 更新情報
   */
  updateMonsterList(updateInfo) {
    if (!this.elements.monsterList) return;
    
    // 全更新の場合はリスト全体を再構築
    if (updateInfo.allUpdated) {
      this.rebuildMonsterList();
      return;
    }
    
    // 個別のモンスター更新の場合
    if (updateInfo.id && updateInfo.monster) {
      this.updateMonsterListItem(updateInfo.id, updateInfo.monster);
    }
  }

  /**
   * モンスターリストを再構築する
   */
  rebuildMonsterList() {
    const monsterList = this.elements.monsterList;
    if (!monsterList) return;
    
    // リストをクリア
    monsterList.innerHTML = '';
    
    // 表示されているモンスターのIDを取得
    const visibleIds = dataStore.getVisibleMonsterIds();
    
    // フラグメントを作成（DOMの再描画を最小限に抑えるため）
    const fragment = document.createDocumentFragment();
    
    // 各モンスターのリスト項目を作成
    visibleIds.forEach(id => {
      const monster = dataStore.monsters[id];
      if (!monster) return;
      
      const listItem = this.createMonsterListItem(id, monster);
      fragment.appendChild(listItem);
    });
    
    // フラグメントをリストに追加
    monsterList.appendChild(fragment);
    
    // モンスター数を更新
    this.updateMonsterCount(visibleIds.length);
  }

  /**
   * モンスターリスト項目を更新する
   * @param {string} id - モンスターID
   * @param {Object} monster - モンスター情報
   */
  updateMonsterListItem(id, monster) {
    const monsterList = this.elements.monsterList;
    if (!monsterList) return;
    
    // 既存の項目を探す
    let listItem = monsterList.querySelector(`[data-monster-id="${id}"]`);
    
    // モンスターが表示対象でない場合は項目を削除
    if (!monster.isVisibleOnMap) {
      if (listItem) {
        listItem.remove();
      }
      
      // モンスター数を更新
      this.updateMonsterCount(dataStore.getVisibleMonsterIds().length);
      return;
    }
    
    // 項目が存在しない場合は新規作成
    if (!listItem) {
      listItem = this.createMonsterListItem(id, monster);
      monsterList.appendChild(listItem);
      
      // モンスター数を更新
      this.updateMonsterCount(dataStore.getVisibleMonsterIds().length);
      return;
    }
    
    // 既存の項目を更新
    const infoElement = listItem.querySelector('.monster-info');
    if (infoElement) {
      infoElement.textContent = this.formatMonsterInfo(monster);
    }
    
    // 色を更新
    const color = dataStore.getMonsterColor(id);
    listItem.style.borderLeft = `4px solid ${color}`;
  }

  /**
   * モンスターリスト項目を作成する
   * @param {string} id - モンスターID
   * @param {Object} monster - モンスター情報
   * @returns {HTMLElement} - リスト項目要素
   */
  createMonsterListItem(id, monster) {
    const listItem = document.createElement('li');
    listItem.className = 'monster-list-item';
    listItem.dataset.monsterId = id;
    
    // モンスターの色を取得
    const color = dataStore.getMonsterColor(id);
    listItem.style.borderLeft = `4px solid ${color}`;
    
    // モンスターIDを表示
    const idElement = document.createElement('div');
    idElement.className = 'monster-id';
    idElement.textContent = monster.displayId;
    listItem.appendChild(idElement);
    
    // モンスター情報を表示
    const infoElement = document.createElement('div');
    infoElement.className = 'monster-info';
    infoElement.textContent = this.formatMonsterInfo(monster);
    listItem.appendChild(infoElement);
    
    // クリックイベントを設定（将来的な機能拡張用）
    listItem.addEventListener('click', () => {
      this.handleMonsterItemClick(id);
    });
    
    return listItem;
  }

  /**
   * モンスター情報をフォーマットする
   * @param {Object} monster - モンスター情報
   * @returns {string} - フォーマットされた情報
   */
  formatMonsterInfo(monster) {
    const { x, y, z } = monster.worldCoordinates;
    return `X: ${x.toFixed(1)}, Y: ${y.toFixed(1)}, Z: ${z.toFixed(1)}`;
  }

  /**
   * モンスター数を更新する
   * @param {number} count - モンスター数
   */
  updateMonsterCount(count) {
    // モンスター数表示要素がある場合は更新
    const countElement = document.getElementById('monster-count');
    if (countElement) {
      countElement.textContent = `モンスター数: ${count}`;
    }
  }

  /**
   * モンスターリスト項目のクリックを処理する
   * @param {string} id - モンスターID
   */
  handleMonsterItemClick(id) {
    // 将来的な機能拡張用（例: クリックしたモンスターにフォーカスする）
    console.log(`モンスター ${id} がクリックされました`);
  }

  /**
   * UI状態を更新する
   * @param {Object} mapConfig - マップ設定
   */
  updateUIState(mapConfig) {
    // 検索フィールドの値を更新
    if (this.elements.searchField && this.elements.searchField.value !== mapConfig.searchTerm) {
      this.elements.searchField.value = mapConfig.searchTerm;
    }
    
    // 追従ボタンのテキストを更新
    if (this.elements.toggleTrackingButton) {
      this.elements.toggleTrackingButton.textContent = mapConfig.isTrackingPlayer ? '追従OFF' : '追従ON';
    }
  }

  /**
   * フィードバックメッセージを表示する
   * @param {string} message - メッセージ
   * @param {number} duration - 表示時間（ミリ秒）
   */
  showFeedback(message, duration = 2000) {
    // フィードバック要素がなければ作成
    let feedbackElement = document.getElementById('feedback-message');
    
    if (!feedbackElement) {
      feedbackElement = document.createElement('div');
      feedbackElement.id = 'feedback-message';
      document.body.appendChild(feedbackElement);
      
      // スタイルを設定
      feedbackElement.style.position = 'fixed';
      feedbackElement.style.bottom = '20px';
      feedbackElement.style.left = '50%';
      feedbackElement.style.transform = 'translateX(-50%)';
      feedbackElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      feedbackElement.style.color = 'white';
      feedbackElement.style.padding = '10px 20px';
      feedbackElement.style.borderRadius = '5px';
      feedbackElement.style.zIndex = '1000';
      feedbackElement.style.transition = 'opacity 0.3s';
    }
    
    // メッセージを設定して表示
    feedbackElement.textContent = message;
    feedbackElement.style.opacity = '1';
    
    // 一定時間後に非表示
    setTimeout(() => {
      feedbackElement.style.opacity = '0';
    }, duration);
  }
}

// シングルトンインスタンスを作成してエクスポート
const uiController = new UIController();
module.exports = uiController;