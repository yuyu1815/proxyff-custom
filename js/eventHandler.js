/**
 * eventHandler.js
 * 
 * マップ機能のためのイベント処理モジュール
 * IPC通信からのイベントを受信し、データストアを更新する
 */

const { ipcRenderer } = require('electron');
const dataStore = require('./dataStore');

class EventHandler {
  constructor() {
    this.initialized = false;
  }

  /**
   * イベントハンドラを初期化する
   */
  initialize() {
    if (this.initialized) return;

    // モンスター位置イベントのリスナーを設定
    ipcRenderer.on('monster-position', (event, data) => {
      console.log(`モンスター位置イベントを受信しました（ID: ${data.id}）`);
      dataStore.updateMonster(data);
    });

    // プレイヤー位置イベントのリスナーを設定
    ipcRenderer.on('player-position', (event, data) => {
      console.log('プレイヤー位置イベントを受信しました');
      dataStore.updatePlayerPosition(data);

      // スポーンイベントの場合は特別な処理
      if (data.isSpawn) {
        console.log('プレイヤースポーンイベントを検出しました');
      }

      // 初期パケットの場合は特別な処理
      if (data.isInitialPacket) {
        console.log('初期パケットを検出しました');
      }
    });

    // ユーザー位置イベントのリスナーを設定
    ipcRenderer.on('user-position', (event, data) => {
      //console.log('ユーザー位置イベントを受信しました');
      dataStore.updateUserPosition(data);
    });

    // 初期パケットイベントのリスナーを設定
    ipcRenderer.on('initial-packet', (event, packet) => {
      console.log('初期パケットイベントを受信しました');
      dataStore.setInitialPacket(packet);
    });

    // ログメッセージイベントのリスナーを設定
    ipcRenderer.on('log-message', (event, logData) => {
      console.log(`ログメッセージを受信しました（タイプ: ${logData.type}）`);
      dataStore.addLog(logData);
    });

    this.initialized = true;
    console.log('イベントハンドラが初期化されました');
  }

  /**
   * イベントハンドラを終了する
   */
  dispose() {
    if (!this.initialized) return;

    // すべてのリスナーを削除
    ipcRenderer.removeAllListeners('monster-position');
    ipcRenderer.removeAllListeners('player-position');
    ipcRenderer.removeAllListeners('user-position');
    ipcRenderer.removeAllListeners('initial-packet');
    ipcRenderer.removeAllListeners('log-message');

    this.initialized = false;
    console.log('イベントハンドラが終了しました');
  }

  /**
   * メインプロセスにイベントを送信する
   * @param {string} channel - イベントチャンネル
   * @param {*} data - イベントデータ
   */
  sendToMain(channel, data) {
    ipcRenderer.send(channel, data);
  }
}

// シングルトンインスタンスを作成してエクスポート
const eventHandler = new EventHandler();
module.exports = eventHandler;
