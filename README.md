# proxyff-custom

## 概要 (Overview)

proxyff-customは、WebSocketを使用するゲーム（特にFinal Fantasy関連のゲーム）のネットワークトラフィックを傍受し、解析するためのツールです。このツールを使用することで、ゲームクライアントとサーバー間の通信を監視し、パケットの内容を解析することができます。

This tool is designed to intercept and analyze network traffic for games that use WebSockets (specifically Final Fantasy related games). It allows you to monitor communication between the game client and server, and analyze the content of packets.

## 機能 (Features)

- WebSocket通信の傍受: ゲームクライアントとサーバー間のWebSocket通信を傍受します
- パケット解析: 傍受したパケットを解析し、内容を表示します
- 暗号化パケットの復号: XOR暗号化されたパケットを復号します
- キャラクター移動の追跡: キャラクターの位置情報や移動タイプを解析します
- チャットメッセージの解析: ゲーム内のチャットメッセージを解析します
- モンスター出現の追跡: モンスターの出現位置を解析します

- WebSocket Interception: Intercepts WebSocket communication between the game client and server
- Packet Analysis: Analyzes intercepted packets and displays their content
- Decryption: Decrypts XOR-encrypted packets
- Character Movement Tracking: Analyzes character position information and movement types
- Chat Message Analysis: Analyzes in-game chat messages
- Monster Spawn Tracking: Analyzes monster spawn positions

## 技術スタック (Technology Stack)

- Node.js: アプリケーションのバックエンド
- Electron: デスクトップアプリケーションフレームワーク
- WebSocket: ゲームクライアントとサーバー間の通信プロトコル

- Node.js: Backend of the application
- Electron: Desktop application framework
- WebSocket: Communication protocol between game client and server

## インストール方法 (Installation)

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/proxyff-custom.git

# プロジェクトディレクトリに移動
cd proxyff-custom

# 依存関係をインストール
npm install
```

## 使用方法 (Usage)

```bash
# アプリケーションを起動
npm start
```

または、Windowsの場合は以下のバッチファイルを実行することもできます：

```bash
start.bat
```

## プロジェクト構造 (Project Structure)

- `index.js`: アプリケーションのエントリーポイント
- `WebSocketProxy.js`: WebSocketプロキシの実装
- `PacketParser.js`: パケット解析ロジック
- `PacketTypes.js`: サポートされているパケットタイプの定義
- `preload/HookWebsocket.js`: WebSocket接続をフックするためのスクリプト
- `docs/chatpacket.txt`: チャットパケットの構造に関するドキュメント

## 開発 (Development)

このプロジェクトは開発中であり、新しいパケットタイプのサポートや機能の追加が行われる可能性があります。

This project is under development, and support for new packet types and additional features may be added.

## ライセンス (License)

このプロジェクトはオープンソースソフトウェアです。

This project is open source software.
