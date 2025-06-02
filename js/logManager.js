/**
 * logManager.js
 * 
 * マップ機能のためのログ管理モジュール
 * ログの表示と管理を担当する
 */

const dataStore = require('./dataStore');

class LogManager {
  constructor() {
    this.elements = {
      logDisplay: null,
      clearLogsButton: null,
      toggleLogsButton: null
    };
    
    this.initialized = false;
    
    // バインドしたメソッド
    this.handleClearLogs = this.handleClearLogs.bind(this);
    this.handleToggleLogs = this.handleToggleLogs.bind(this);
    this.updateLogDisplay = this.updateLogDisplay.bind(this);
  }

  /**
   * ログマネージャーを初期化する
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
    dataStore.addEventListener('logUpdate', this.updateLogDisplay);
    
    this.initialized = true;
    console.log('ログマネージャーが初期化されました');
  }

  /**
   * イベントリスナーを設定する
   */
  setupEventListeners() {
    // クリアボタン
    if (this.elements.clearLogsButton) {
      this.elements.clearLogsButton.addEventListener('click', this.handleClearLogs);
    }
    
    // 表示切替ボタン
    if (this.elements.toggleLogsButton) {
      this.elements.toggleLogsButton.addEventListener('click', this.handleToggleLogs);
    }
  }

  /**
   * ログマネージャーを終了する
   */
  dispose() {
    if (!this.initialized) return;
    
    // イベントリスナーを削除
    if (this.elements.clearLogsButton) {
      this.elements.clearLogsButton.removeEventListener('click', this.handleClearLogs);
    }
    
    if (this.elements.toggleLogsButton) {
      this.elements.toggleLogsButton.removeEventListener('click', this.handleToggleLogs);
    }
    
    // データストアのイベントリスナーを削除
    dataStore.removeEventListener('logUpdate', this.updateLogDisplay);
    
    this.initialized = false;
    console.log('ログマネージャーが終了しました');
  }

  /**
   * ログをクリアする
   */
  handleClearLogs() {
    dataStore.clearLogs();
    this.showFeedback('ログをクリアしました');
  }

  /**
   * ログの表示/非表示を切り替える
   */
  handleToggleLogs() {
    const isVisible = dataStore.logConfig.showLogs;
    dataStore.updateLogConfig({ showLogs: !isVisible });
    
    // ボタンのテキストを更新
    if (this.elements.toggleLogsButton) {
      this.elements.toggleLogsButton.textContent = !isVisible ? '非表示' : '表示';
    }
    
    // ログ表示エリアの表示/非表示を切り替え
    if (this.elements.logDisplay) {
      this.elements.logDisplay.style.display = !isVisible ? 'block' : 'none';
    }
    
    this.showFeedback(!isVisible ? 'ログを表示しました' : 'ログを非表示にしました');
  }

  /**
   * ログ表示を更新する
   * @param {Object} updateInfo - 更新情報
   */
  updateLogDisplay(updateInfo) {
    if (!this.elements.logDisplay || !dataStore.logConfig.showLogs) return;
    
    // ログ表示エリアをクリア
    this.elements.logDisplay.innerHTML = '';
    
    // ログを取得
    const logs = dataStore.getLogs();
    
    // ログがない場合はメッセージを表示
    if (logs.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'log-empty-message';
      emptyMessage.textContent = 'ログはありません';
      this.elements.logDisplay.appendChild(emptyMessage);
      return;
    }
    
    // フラグメントを作成（DOMの再描画を最小限に抑えるため）
    const fragment = document.createDocumentFragment();
    
    // 各ログエントリを作成
    logs.forEach(log => {
      const logEntry = this.createLogEntry(log);
      fragment.appendChild(logEntry);
    });
    
    // フラグメントをログ表示エリアに追加
    this.elements.logDisplay.appendChild(fragment);
  }

  /**
   * ログエントリ要素を作成する
   * @param {Object} log - ログデータ
   * @returns {HTMLElement} - ログエントリ要素
   */
  createLogEntry(log) {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${log.type}`;
    
    // ヘッダー（タイプとタイムスタンプ）
    const header = document.createElement('div');
    header.className = 'log-entry-header';
    
    // タイプ
    const typeElement = document.createElement('span');
    typeElement.className = 'log-entry-type';
    typeElement.textContent = this.formatLogType(log.type);
    header.appendChild(typeElement);
    
    // タイムスタンプ
    const timestampElement = document.createElement('span');
    timestampElement.className = 'log-entry-timestamp';
    timestampElement.textContent = this.formatTimestamp(log.timestamp);
    header.appendChild(timestampElement);
    
    logEntry.appendChild(header);
    
    // メッセージ
    log.messages.forEach(message => {
      const messageElement = document.createElement('div');
      messageElement.className = 'log-entry-message';
      messageElement.textContent = message;
      logEntry.appendChild(messageElement);
    });
    
    return logEntry;
  }

  /**
   * ログタイプをフォーマットする
   * @param {string} type - ログタイプ
   * @returns {string} - フォーマットされたタイプ
   */
  formatLogType(type) {
    switch (type) {
      case 'monster-spawn':
        return 'モンスター出現';
      case 'info':
        return '情報';
      case 'error':
        return 'エラー';
      case 'warning':
        return '警告';
      default:
        return type;
    }
  }

  /**
   * タイムスタンプをフォーマットする
   * @param {number} timestamp - タイムスタンプ
   * @returns {string} - フォーマットされたタイムスタンプ
   */
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
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
const logManager = new LogManager();
module.exports = logManager;