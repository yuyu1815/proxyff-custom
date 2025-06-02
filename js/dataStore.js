/**
 * dataStore.js
 * 
 * マップ機能のためのデータ管理モジュール
 * モンスター情報、プレイヤー位置、ユーザー位置、マップ設定などの状態を一元管理する
 */

class DataStore {
  constructor() {
    // モンスター情報を保存するオブジェクト
    // キーはモンスターID
    this.monsters = {};

    // プレイヤーの位置情報
    this.playerPosition = {
      worldCoordinates: { x: 0, y: 0, z: 0 },
      rotation: 0,
      lastUpdate: Date.now()
    };

    // ユーザーの位置情報
    this.userPosition = {
      worldCoordinates: { x: 0, y: 0, z: 0 },
      rotation: 0,
      lastUpdate: Date.now()
    };

    // マップの設定情報
    this.mapConfig = {
      zoomLevel: 1.0,
      centerCoordinates: { x: 0, y: 0 },
      isTrackingPlayer: true,
      showMonsterPaths: false,
      searchTerm: "",
      filteredMonsterTypes: new Set(),
      initialPacketReceived: false
    };

    // ログメッセージを保存する配列
    this.logs = [];

    // ログの設定
    this.logConfig = {
      maxLogs: 100,  // 保存する最大ログ数
      showLogs: true // ログ表示の有効/無効
    };

    // イベントリスナーを保存するオブジェクト
    this.listeners = {
      monsterUpdate: [],
      playerUpdate: [],
      userUpdate: [],
      mapConfigUpdate: [],
      logUpdate: []
    };
  }

  /**
   * モンスター情報を更新する
   * @param {Object} data - モンスターの位置データ
   * @returns {boolean} - 更新が成功したかどうか
   */
  updateMonster(data) {
    if (!data || !data.id) {
      console.error('Invalid monster data:', data);
      return false;
    }

    const id = data.id;
    const now = Date.now();

    // モンスターが存在しない場合は新規作成
    if (!this.monsters[id]) {
      this.monsters[id] = {
        id: id,
        displayId: this.calculateDisplayId(data),
        type: "normal", // デフォルトタイプ
        rawDataSource: { ...data },
        mapCoordinates: { x: 0, y: 0 },
        worldCoordinates: { x: data.x, y: data.y, z: data.z },
        lastUpdate: now,
        isVisibleOnMap: true
      };
    } else {
      // 既存のモンスター情報を更新
      this.monsters[id].rawDataSource = { ...data };
      this.monsters[id].worldCoordinates = { x: data.x, y: data.y, z: data.z };
      this.monsters[id].lastUpdate = now;
    }

    // マップ座標を計算（ワールド座標からの変換）
    this.updateMonsterMapCoordinates(id);

    // 検索語やフィルターに基づいて表示状態を更新
    this.updateMonsterVisibility(id);

    // リスナーに通知
    this.notifyListeners('monsterUpdate', { id, monster: this.monsters[id] });

    return true;
  }

  /**
   * モンスターの表示IDを計算する
   * @param {Object} data - モンスターの位置データ
   * @returns {string} - 表示用ID
   */
  calculateDisplayId(data) {
    // originalId や monsterIdFull などを考慮した表示用IDの計算ロジック
    // 実際の実装はデータ構造に依存
    return data.originalId || data.monsterIdFull || data.id;
  }

  /**
   * モンスターのマップ座標を更新する
   * @param {string} id - モンスターID
   */
  updateMonsterMapCoordinates(id) {
    const monster = this.monsters[id];
    if (!monster) return;

    // プレイヤーに対する相対位置を計算
    const relX = monster.worldCoordinates.x - this.playerPosition.worldCoordinates.x;
    const relZ = monster.worldCoordinates.z - this.playerPosition.worldCoordinates.z;

    // マップ座標に変換
    monster.mapCoordinates = {
      x: relX,
      y: relZ
    };
  }

  /**
   * モンスターの表示状態を更新する
   * @param {string} id - モンスターID
   */
  updateMonsterVisibility(id) {
    const monster = this.monsters[id];
    if (!monster) return;

    // デフォルトでは表示
    let isVisible = true;

    // 検索語に基づくフィルタリング
    if (this.mapConfig.searchTerm) {
      const searchTerm = this.mapConfig.searchTerm.toLowerCase();
      const displayId = monster.displayId.toLowerCase();
      isVisible = displayId.includes(searchTerm);
    }

    // モンスタータイプに基づくフィルタリング
    if (isVisible && this.mapConfig.filteredMonsterTypes.size > 0) {
      isVisible = !this.mapConfig.filteredMonsterTypes.has(monster.type);
    }

    monster.isVisibleOnMap = isVisible;
  }

  /**
   * すべてのモンスターの表示状態を更新する
   */
  updateAllMonsterVisibility() {
    for (const id in this.monsters) {
      this.updateMonsterVisibility(id);
    }
    this.notifyListeners('monsterUpdate', { allUpdated: true });
  }

  /**
   * プレイヤーの位置情報を更新する
   * @param {Object} data - プレイヤーの位置データ
   */
  updatePlayerPosition(data) {
    if (!data) {
      console.error('Invalid player position data:', data);
      return false;
    }

    this.playerPosition = {
      worldCoordinates: { x: data.x, y: data.y, z: data.z },
      rotation: data.rotation || 0,
      lastUpdate: Date.now(),
      isSpawn: data.isSpawn || false,
      isInitialPacket: data.isInitialPacket || false
    };

    // プレイヤーの位置が変わったので、すべてのモンスターのマップ座標を更新
    for (const id in this.monsters) {
      this.updateMonsterMapCoordinates(id);
    }

    // リスナーに通知
    this.notifyListeners('playerUpdate', this.playerPosition);

    return true;
  }

  /**
   * ユーザーの位置情報を更新する
   * @param {Object} data - ユーザーの位置データ
   */
  updateUserPosition(data) {
    if (!data) {
      console.error('Invalid user position data:', data);
      return false;
    }

    this.userPosition = {
      worldCoordinates: { x: data.x, y: data.y, z: data.z },
      rotation: data.rotation || 0,
      lastUpdate: data.lastUpdate || Date.now()
    };

    // リスナーに通知
    this.notifyListeners('userUpdate', this.userPosition);

    return true;
  }

  /**
   * マップの設定を更新する
   * @param {Object} config - 更新する設定のオブジェクト
   */
  updateMapConfig(config) {
    if (!config) {
      console.error('Invalid map config:', config);
      return false;
    }

    // 設定を更新
    this.mapConfig = { ...this.mapConfig, ...config };

    // 検索語やフィルターが変更された場合は、モンスターの表示状態を更新
    if ('searchTerm' in config || 'filteredMonsterTypes' in config) {
      this.updateAllMonsterVisibility();
    }

    // リスナーに通知
    this.notifyListeners('mapConfigUpdate', this.mapConfig);

    return true;
  }

  /**
   * 初期パケットを設定する
   * @param {Buffer} packet - 初期パケット
   */
  setInitialPacket(packet) {
    if (!packet) {
      console.error('Invalid initial packet:', packet);
      return false;
    }

    this.mapConfig.initialPacketReceived = true;

    // リスナーに通知
    this.notifyListeners('mapConfigUpdate', this.mapConfig);

    return true;
  }

  /**
   * モンスターをクリアする
   */
  clearMonsters() {
    this.monsters = {};
    this.notifyListeners('monsterUpdate', { allUpdated: true, cleared: true });
    return true;
  }

  /**
   * 表示されているモンスターのIDリストを取得する
   * @returns {Array} - 表示されているモンスターのIDリスト
   */
  getVisibleMonsterIds() {
    return Object.keys(this.monsters).filter(id => this.monsters[id].isVisibleOnMap);
  }

  /**
   * モンスターの色を取得する
   * @param {string} id - モンスターID
   * @returns {string} - モンスターの色（CSS色文字列）
   */
  getMonsterColor(id) {
    const monster = this.monsters[id];
    if (!monster) return '#cccccc'; // デフォルト色

    // モンスターIDに基づいて色を決定
    // 例: IDの最後の数字に基づいて色を変える
    const idNum = parseInt(id.replace(/\D/g, '')) || 0;
    const colors = [
      '#ff0000', // 赤
      '#00ff00', // 緑
      '#0000ff', // 青
      '#ffff00', // 黄
      '#ff00ff', // マゼンタ
      '#00ffff', // シアン
      '#ff8800', // オレンジ
      '#8800ff'  // 紫
    ];

    return colors[idNum % colors.length];
  }

  /**
   * ログを追加する
   * @param {Object} logData - ログデータ
   * @param {string} logData.type - ログのタイプ
   * @param {Array<string>} logData.messages - ログメッセージの配列
   * @param {number} logData.timestamp - タイムスタンプ
   * @returns {boolean} - 追加が成功したかどうか
   */
  addLog(logData) {
    if (!logData || !logData.messages || !Array.isArray(logData.messages)) {
      console.error('Invalid log data:', logData);
      return false;
    }

    // 新しいログを配列の先頭に追加（新しいログが上に表示されるように）
    this.logs.unshift({
      type: logData.type || 'info',
      messages: logData.messages,
      timestamp: logData.timestamp || Date.now()
    });

    // 最大ログ数を超えた場合、古いログを削除
    if (this.logs.length > this.logConfig.maxLogs) {
      this.logs = this.logs.slice(0, this.logConfig.maxLogs);
    }

    // リスナーに通知
    this.notifyListeners('logUpdate', { logs: this.logs });

    return true;
  }

  /**
   * ログをクリアする
   * @returns {boolean} - クリアが成功したかどうか
   */
  clearLogs() {
    this.logs = [];

    // リスナーに通知
    this.notifyListeners('logUpdate', { logs: this.logs, cleared: true });

    return true;
  }

  /**
   * ログの設定を更新する
   * @param {Object} config - 更新する設定のオブジェクト
   * @returns {boolean} - 更新が成功したかどうか
   */
  updateLogConfig(config) {
    if (!config) {
      console.error('Invalid log config:', config);
      return false;
    }

    // 設定を更新
    this.logConfig = { ...this.logConfig, ...config };

    // リスナーに通知
    this.notifyListeners('logUpdate', { config: this.logConfig });

    return true;
  }

  /**
   * ログを取得する
   * @param {number} limit - 取得するログの最大数
   * @returns {Array} - ログの配列
   */
  getLogs(limit = 0) {
    if (limit <= 0 || limit >= this.logs.length) {
      return [...this.logs];
    }

    return this.logs.slice(0, limit);
  }

  /**
   * イベントリスナーを追加する
   * @param {string} event - イベント名
   * @param {Function} callback - コールバック関数
   */
  addEventListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * イベントリスナーを削除する
   * @param {string} event - イベント名
   * @param {Function} callback - コールバック関数
   */
  removeEventListener(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(listener => listener !== callback);
  }

  /**
   * リスナーに通知する
   * @param {string} event - イベント名
   * @param {*} data - イベントデータ
   */
  notifyListeners(event, data) {
    if (!this.listeners[event]) return;
    for (const callback of this.listeners[event]) {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    }
  }
}

// シングルトンインスタンスを作成してエクスポート
const dataStore = new DataStore();
module.exports = dataStore;
