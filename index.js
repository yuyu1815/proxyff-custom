// アプリケーションのライフサイクルを制御し、ネイティブブラウザウィンドウを作成するためのモジュール
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const fetch = require('node-fetch');
const zlib = require('zlib');
const util = require('util');
const gunzip = util.promisify(zlib.gunzip);
const https = require("https");
const path = require("path");
const WebSocketProxy = require('./WebSocketProxy');


const INTERCEPT_HTTPS_PROTOCOL = true;

// PacketParserで使用するためにmainWindowをグローバルにアクセス可能にする
global.mainWindow = null;
global.overlayWindow = null;

let wsProxy = new WebSocketProxy();

// モンスターの位置情報を保存
const monsterPositions = new Map();

// プレイヤーの位置情報を保存
let playerPosition = {
  x: 0,
  y: 0,
  z: 0,
  rotation: 0,
  lastUpdate: Date.now()
};

// ユーザーの位置情報を保存
let userPosition = {
  x: 0,
  y: 0,
  z: 0,
  lastUpdate: Date.now()
};

ipcMain.on('websocket-packet', (event, dataBuffer) => {
  for (const { url, data, direction } of dataBuffer ) {
    if (direction == "SEND") {
      wsProxy.OnOutgoingMessage(url, Buffer.from(data));
    } else {
      wsProxy.OnIncommingMessage(url, Buffer.from(data));
    }
  }
});

// モンスターの位置データを処理し、オーバーレイに転送
ipcMain.on('monster-position', (event, data) => {
  // 参照用にモンスターの位置を保存
  monsterPositions.set(data.id, {
    x: data.x,
    y: data.y,
    z: data.z,
    rotation: data.rotation,
    lastUpdate: Date.now()
  });

  // モンスターの位置データをオーバーレイウィンドウに転送
  if (global.overlayWindow && !global.overlayWindow.isDestroyed()) {
    global.overlayWindow.webContents.send('monster-position', data);
    console.log(`モンスターの位置をオーバーレイに転送しました（ID: ${data.id}）`);
  } else {
    console.log(`モンスターの位置を保存しましたが、オーバーレイウィンドウが利用できません（ID: ${data.id}）`);
  }
});

// プレイヤーの位置データを処理し、オーバーレイに転送
ipcMain.on('player-position', (event, data) => {
  // プレイヤーの位置を更新
  playerPosition = {
    x: data.x,
    y: data.y,
    z: data.z,
    rotation: data.rotation,
    lastUpdate: Date.now()
  };

  // スポーンパケットからの位置データの場合、特別な処理を行う
  if (data.isSpawn) {
    console.log('プレイヤースポーン位置を検出しました');

    // スポーン時の初期パケットを設定
    // 初期パケット: 00 00 00 00 00 00 00 04 00 01 00 00
    const initialPacket = Buffer.from('000000000000000400010000', 'hex');

    // 初期パケットをオーバーレイウィンドウに送信
    if (global.overlayWindow && !global.overlayWindow.isDestroyed()) {
      global.overlayWindow.webContents.send('initial-packet', initialPacket);
      console.log('スポーン時の初期パケットをオーバーレイに転送しました');
    }
  }

  // プレイヤーの位置データをオーバーレイウィンドウに転送
  if (global.overlayWindow && !global.overlayWindow.isDestroyed()) {
    global.overlayWindow.webContents.send('player-position', playerPosition);
    console.log('プレイヤーの位置をオーバーレイに転送しました');
  } else {
    console.log('プレイヤーの位置を更新しましたが、オーバーレイウィンドウが利用できません');
  }
});

// ユーザーの位置データを処理し、オーバーレイに転送
ipcMain.on('user-position', (event, data) => {
  // ユーザーの位置を更新
  userPosition = {
    x: data.x,
    y: data.y,
    z: data.z,
    rotation: data.rotation || 0,
    lastUpdate: data.lastUpdate || Date.now()
  };

  // ユーザーの位置データをオーバーレイウィンドウに転送
  if (global.overlayWindow && !global.overlayWindow.isDestroyed()) {
    global.overlayWindow.webContents.send('user-position', userPosition);
    //console.log('ユーザーの位置をオーバーレイに転送しました');
  } else {
    console.log('ユーザーの位置を更新しましたが、オーバーレイウィンドウが利用できません');
  }
});

// ウィンドウオブジェクトのグローバル参照を保持します。保持しないと、
// JavaScriptオブジェクトがガベージコレクションされたときにウィンドウが自動的に閉じられます。
let mainWindow

async function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // ブラウザウィンドウを作成
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, '/preload/HookWebsocket.js'),
      contextIsolation: false
    }
  });

  // PacketParser用にグローバル参照を設定
  global.mainWindow = mainWindow;

  // 不明なパケットを表示するためのオーバーレイウィンドウを作成
  overlayWindow = new BrowserWindow({
    width: 800,
    height: 800,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // オーバーレイウィンドウのグローバル参照を設定
  global.overlayWindow = overlayWindow;

  // オーバーレイHTMLファイルを読み込み
  overlayWindow.loadFile('overlay.html');

  // オーバーレイウィンドウが読み込まれた後に初期パケットを設定
  overlayWindow.webContents.on('did-finish-load', () => {
    // 初期パケット: 00 00 00 00 00 00 00 04 00 01 00 00
    const initialPacket = Buffer.from('000000000000000400010000', 'hex');

    // 初期パケットをマップに設定
    console.log('初期パケットをマップに設定します');

    // プレイヤーの初期位置を設定
    const initialPlayerPosition = {
      x: 0,
      y: 0,
      z: 0,
      rotation: 0,
      lastUpdate: Date.now(),
      isInitialPacket: true
    };

    // 初期パケットをオーバーレイウィンドウに送信
    overlayWindow.webContents.send('initial-packet', initialPacket);

    // プレイヤーの初期位置をオーバーレイウィンドウに送信
    overlayWindow.webContents.send('player-position', initialPlayerPosition);

    console.log('初期パケットとプレイヤー位置を設定しました');
  });

  // オーバーレイウィンドウの位置を設定
  overlayWindow.setPosition(width - 800, 0);

  // オーバーレイウィンドウはタスクバーに表示しない
  overlayWindow.setSkipTaskbar(true);

  // アプリのindex.htmlを読み込み
  mainWindow.loadURL('https://universe.flyff.com/play');

  // 開発者ツールを開く
  //mainWindow.webContents.openDevTools();
  //global.overlayWindow.webContents.openDevTools();

  // オーバーレイの位置設定コードはオーバーレイが無効化されているため削除

  // ウィンドウが閉じられたときに発火
  mainWindow.on('closed', function () {
    // ウィンドウオブジェクトの参照を解除します。通常、マルチウィンドウをサポートするアプリでは
    // ウィンドウを配列に格納し、このときに対応する要素を削除する必要があります。
    global.mainWindow = null;
    mainWindow = null;

    // メインウィンドウが閉じられたときにオーバーレイウィンドウも閉じる
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.close();
    }
  });

  // オーバーレイウィンドウの閉じるイベントを処理
  overlayWindow.on('closed', function () {
    // ウィンドウオブジェクトの参照を解除
    global.overlayWindow = null;
    overlayWindow = null;
  });
}

// このメソッドはElectronが初期化を完了し、
// ブラウザウィンドウを作成する準備ができたときに呼び出されます。
// 一部のAPIはこのイベントが発生した後にのみ使用できます。
app.on('ready', createWindow);

// すべてのウィンドウが閉じられたときに終了
app.on('window-all-closed', function () {
  // macOSでは、Cmd + Qで明示的に終了するまで
  // アプリケーションとそのメニューバーがアクティブなままであることが一般的です
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

app.on('activate', async function () {
  // macOSでは、ドックアイコンがクリックされ、
  // 他のウィンドウが開いていないときに
  // アプリケーションでウィンドウを再作成するのが一般的です。

  if (mainWindow === null) {
    createWindow()
  }
});
