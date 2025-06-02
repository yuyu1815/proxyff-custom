// 必要なモジュールのインポート
const PacketTypes = require("./PacketTypes");
const hexdump = require("hexdump-nodejs");
const { read } = require("original-fs");
const fs = require("fs");

// パケットの基本クラス定義
class Packet {
    constructor() {
        this.origin = undefined;      // パケットの発信元
        this.packetType = undefined;  // パケットタイプ
        this.data = {};               // パケットデータを格納するオブジェクト
    }
    // 発信元を設定するメソッド
    SetOrigin(origin) {
        this.origin = origin;
    }
    // キーと値のペアでデータを設定するメソッド
    Set(key, value) {
        this.data[key] = value;
    }
};

// パケット解析クラスの定義とエクスポート
module.exports = class PacketParser {
    /**
     * バッファをカスタムヘックスダンプ形式でフォーマットするメソッド
     * @param {Buffer} buffer - フォーマットするバッファ
     * @returns {string} - フォーマットされたヘックスダンプ文字列
     */
    static customHexdump(buffer) {
        // 結果の文字列を初期化
        let result = "  Offset  00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F\n";

        // 16バイトごとに行をフォーマット
        for (let i = 0; i < buffer.length; i += 16) {
            // オフセット
            result += `${i.toString(16).padStart(8, '0')}  `;

            // 16進数の値
            for (let j = 0; j < 16; j++) {
                if (i + j < buffer.length) {
                    result += `${buffer[i + j].toString(16).padStart(2, '0').toUpperCase()} `;
                } else {
                    result += '   ';
                }
            }

            result += '\n';
        }

        return result;
    }
    /**
     * 開始位置から目標位置までの回転角度を計算するメソッド
     * @param {[number, number, number]} posA - 開始位置の座標
     * @param {[number, number, number]} posB - 目標位置の座標
     * @returns {number} - 計算された回転角度（度数法）
     */
    static CalculateRotation(posA, posB) {
        // 回転角度計算のための変数定義
        var x1, x2, y1, y2, cx1, cy1, cx2, cy2, deltaX, deltaY, dx, dy, rad, deg;
        // 座標の取得と中心点の計算
        x1 = posA[2];
        y1 = posA[0];
        x2 = posB[2];
        y2 = posB[0];
        cx1 = x1 - (0 / 2);
        cy1 = y1 - (0 / 2);
        cx2 = x2 - (0 / 2);
        cy2 = y2 - (0 / 2);

        // 回転角度の計算処理
        deltaX = cx2 - cx1;
        deltaY = cy2 - cy1;
        y1 = Math.sqrt((Math.abs(deltaY) * Math.abs(deltaY)) + (Math.abs(deltaX) * (Math.abs(deltaX))));
        x1 = 0;
        dy = deltaY - y1;
        dx = deltaX - x1;
        rad = Math.atan2(dy, dx);
        deg = rad * (360 / Math.PI);
        return ((360 - deg) + 90) % 360;
    }

    /**
     * バイナリパケットを解析するメソッド
     * @param {Buffer} rawPacket - 生のパケットデータ
     * @return {Packet} - 解析されたパケットオブジェクト
     */
    static ParsePacket(rawPacket) {
        let currentCursor = 0;

        // バイト読み取り用のヘルパー関数群
        let readBytes = (numBytes) => {
            //console.log(rawPacket)
            // バッファの境界チェック
            if (currentCursor + numBytes > rawPacket.length) {
                console.error(`バッファの境界を超えています: 位置${currentCursor}から${numBytes}バイトを読み取ろうとしていますが、バッファの長さは${rawPacket.length}です`);
                // 安全なデフォルト値を返す（空のバッファ）
                return Buffer.alloc(numBytes);
            }
            let bytes = rawPacket.slice(currentCursor, currentCursor + numBytes);
            currentCursor += numBytes;
            return bytes;
        };
        let readFloat = () => {
            const buffer = readBytes(4);
            // バッファが正しいサイズであることを確認
            if (buffer.length === 4) {
                return buffer.readFloatLE(0);
            } else {
                console.error("浮動小数点数を読み取れません: バッファサイズが不正です");
                return 0.0; // デフォルト値として0.0を返す
            }
        };
        let readUInt32 = () => {
            const buffer = readBytes(4);
            // バッファが正しいサイズであることを確認
            if (buffer.length === 4) {
                return buffer.readUInt32BE(0);
            } else {
                console.error("UInt32を読み取れません: バッファサイズが不正です");
                return 0; // デフォルト値として0を返す
            }
        };
        let readShort = () => {
            const buffer = readBytes(2);
            // バッファが正しいサイズであることを確認
            if (buffer.length === 2) {
                return buffer.readUInt16BE(0);
            } else {
                console.error("Shortを読み取れません: バッファサイズが不正です");
                return 0; // デフォルト値として0を返す
            }
        };

        // パケットタイプの読み取りと新しいパケットオブジェクトの作成
        let packetType = readBytes(4).toString("hex");
        let packet = new Packet();
        packet.packetType = packetType;

        // パケットタイプに応じた処理
        switch (packetType) {
            //解析用
            case PacketTypes.UNKNOWN_WELCOME:
                break
                let uk = readShort();
                let uk2 = readBytes(4);
                while (currentCursor < rawPacket.length + 12) {

                    let unknown1 = readShort();
                    let chunkLength = readShort();
                    readBytes(6);
                    let chunkData = readBytes(chunkLength);
                    //let unknown6 = readBytes(2);

                    console.log(`不明な値1: ${unknown1}, チャンク長: ${chunkLength}`);
                    console.log(hexdump(chunkData));
                    console.log(`現在のカーソル位置: ${currentCursor}`);

                }


                //console.log(packet.data);
                if (currentCursor < rawPacket.length) {
                    let restBytes = rawPacket.length - currentCursor;
                    //console.log("Unused packet bytes for PacketType: " + packetType);
                    let restBytesData = readBytes(restBytes)
                    //console.log(hexdump(restBytesData))
                }


                break;
            case PacketTypes.MONSTER_MOVE:
                console.log("MONSTER_MOVE");
                // 54バイトのパケットのみ処理する
                if (rawPacket.length !== 54) {
                    //console.log(`モンスター移動パケットをスキップします - 54バイトではありません（実際のサイズ: ${rawPacket.length} バイト）`);
                    break;
                }
                // カーソルを最初に戻す
                currentCursor = 0;

                // モンスター行動識別 (4バイト)
                const monsterActionId = readBytes(4).toString('hex');

                // 不明数 (12バイト)
                const unknownData1 = readBytes(12);

                // 不明 (6バイト)
                const unknownData2 = readBytes(6);

                // X座標 (4バイト)
                packet.Set("posX", readFloat());

                // ブランク (4バイト)
                readBytes(4);

                // Y座標 (4バイト)
                packet.Set("posY", readFloat());

                // ブランク (4バイト)
                readBytes(4);

                // Z座標 (4バイト)
                packet.Set("posZ", readFloat());

                // ブランク (4バイト)
                readBytes(4);

                // モンスター識別ID (8バイト)
                const monsterIdentificationId = readBytes(8).toString('hex');

                // 座標情報をログに出力
                console.log(`モンスターの座標: X: ${packet.data.posX} Y: ${packet.data.posY} Z: ${packet.data.posZ}`);
                console.log(`モンスター識別ID: ${monsterIdentificationId}`);
                // モンスターの位置情報をメインプロセスに送信
                try {
                    const { ipcMain } = require('electron');
                    // モンスター識別IDを使用してユニークIDを作成
                    const uniqueId = monsterIdentificationId.substring(0, 16);

                    ipcMain.emit('monster-position', null, {
                        id: uniqueId,
                        x: packet.data.posX,
                        y: packet.data.posY,
                        z: packet.data.posZ,
                        lastUpdate: Date.now(),
                        monsterIdentificationId: monsterIdentificationId
                    });
                } catch (error) {
                    console.error(`モンスター位置の送信エラー: ${error}`);
                }
                break;

            case PacketTypes.USER_PACKET:
                console.log("USER_PACKET");
                // キャラクター移動パケットの処理を流用して座標を取得
                packet.Set("posX", readFloat());         // X座標
                packet.Set("posY", readFloat());         // Y座標
                packet.Set("posZ", readFloat());         // Z座標
                packet.Set("movementType", readBytes(2).toString("hex")); // 移動タイプ
                packet.Set("sessionTime", readBytes(4)); // セッション時間

                // 移動タイプに応じた追加データの処理
                switch(packet.data.movementType){
                    case "5a01": // キーボード入力による移動
                        packet.Set("rotation", readFloat());
                        readBytes(4);
                        //console.log("rotation "+ packet.data.rotation)
                        //console.log("movementType " + packet.data.movementType +" X "+ packet.data.posX +" Y "+ packet.data.posY +" Z "+ packet.data.posZ)
                        break;
                    case "5a07": // クリック移動
                        // 目標位置の読み取りと回転角度の計算
                        packet.Set("targetX", readFloat());
                        readBytes(4);
                        packet.Set("targetY", readFloat());
                        readBytes(4);
                        packet.Set("targetZ", readFloat());
                        readBytes(4);
                        packet.Set("rotation", PacketParser.CalculateRotation(
                            [packet.data.posX, packet.data.posY, packet.data.posZ],
                            [packet.data.targetX, packet.data.targetY, packet.data.targetZ]
                        ));
                        //console.log("movementType " + packet.data.movementType +" X "+ packet.data.posX +" Y "+ packet.data.posY +" Z "+ packet.data.posZ +
                        //                                             " goto: " +" X "+ packet.data.targetX +" Y "+ packet.data.targetY +" Z "+  packet.data.targetZ);
                        break;
                    default:
                        //console.log("movementType " + packet.data.movementType);
                        break
                }

                // 残りのデータを読み取り
                if (currentCursor < rawPacket.length) {
                    let restBytes = rawPacket.length - currentCursor;
                    let restBytesData = readBytes(restBytes);
                    //console.log("USER_PACKET remaining data:");
                    //console.log(hexdump(restBytesData));
                }

                // ユーザーの位置情報をメインプロセスに送信
                try {
                    const { ipcMain } = require('electron');
                    ipcMain.emit('user-position', null, {
                        x: packet.data.posX,
                        y: packet.data.posY,
                        z: packet.data.posZ,
                        rotation: packet.data.rotation || 0,
                        lastUpdate: Date.now()
                    });
                } catch (error) {
                    console.error(`ユーザー位置の送信エラー: ${error}`);
                }
                break;

            case PacketTypes.MONSTER_SPAWN:
                console.log("MONSTER_SPAWN");
                // Process all MONSTER_SPAWN packets in the rawPacket
                // Reset cursor to beginning of packet
                currentCursor = 0;

                // Scan through the entire packet looking for MONSTER_SPAWN signatures
                while (currentCursor + 48 <= rawPacket.length) { // Ensure we have enough bytes to read a complete monster spawn data
                    // Check if we have a MONSTER_SPAWN signature at the current position
                    const currentPosition = currentCursor;
                    const possiblePacketType = rawPacket.slice(currentPosition, currentPosition + 4).toString('hex');

                    if (possiblePacketType === PacketTypes.MONSTER_SPAWN) {
                        // Skip packet type (4 bytes)
                        currentCursor += 4;

                        // Read monster ID (8 bytes)
                        const monsterId = rawPacket.slice(currentCursor, currentCursor + 8).toString('hex');
                        currentCursor += 8;

                        // Skip unknown data (20 bytes: 8 bytes unknown data 1 + 12 bytes unknown data 2)
                        currentCursor += 20;
                        // Read coordinates (each 4 bytes)
                        // According to the issue description, coordinates are remapped:
                        // Original X (at currentCursor + 0) is unused for emit.
                        // Game X (at currentCursor + 4) becomes xPos.
                        // Game Z/Height (at currentCursor + 8) becomes zPos.
                        // Game Y/Depth (at currentCursor + 12) becomes yPos.

                        // const unused_originalX = rawPacket.readFloatLE(currentCursor); // Original X at offset 0x20 from monster chunk start

                        const xPos = rawPacket.readFloatLE(currentCursor + 4);  // Game X (formerly zPos)
                        const zPos = rawPacket.readFloatLE(currentCursor + 8);  // Game Z/Height (formerly yPos)
                        const yPos = rawPacket.readFloatLE(currentCursor + 12); // Game Y/Depth (newly read field)

                        // Advance cursor past these 16 bytes of coordinate data
                        currentCursor += 16;

                        console.log(`モンスターの座標: X: ${xPos}, Y: ${yPos}, Z: ${zPos}, ID: ${monsterId}`);

                        // Send monster position to main process
                        try {
                            const { ipcMain } = require('electron');
                            // Create a unique ID from the monster ID
                            const uniqueId = monsterId.substring(0, 16);

                            ipcMain.emit('monster-position', null, {
                                id: uniqueId,
                                x: xPos,
                                y: yPos,
                                z: zPos,
                                lastUpdate: Date.now(),
                                monsterIdentificationId: monsterId
                            });
                        } catch (error) {
                            console.error(`モンスター出現位置の送信エラー: ${error}`);
                        }
                    } else {
                        // Move to the next byte and continue scanning
                        currentCursor++;
                    }
                }
                break;
            case PacketTypes.PLAYER_SPAWN:
                console.log("PLAYER_SPAWN");
                // Search for the pattern "00 00 00 00 00 00 00 04 00 01 00 00" and extract the 16 bytes before it
                // According to the issue description, these 16 bytes contain:
                // x(4 bytes), y(4 bytes), z(4 bytes), angle(4 bytes)

                // Convert the pattern to a Buffer for searching
                const pattern = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00, 0x01, 0x00, 0x00]);

                // Search for the pattern in the packet
                let patternIndex = -1;
                for (let i = 0; i <= rawPacket.length - pattern.length; i++) {
                    let found = true;
                    for (let j = 0; j < pattern.length; j++) {
                        if (rawPacket[i + j] !== pattern[j]) {
                            found = false;
                            break;
                        }
                    }
                    if (found) {
                        patternIndex = i;
                        break;
                    }
                }

                if (patternIndex >= 16) {
                    // Get the 16 bytes before the pattern
                    const coordsStart = patternIndex - 16;

                    // Extract coordinates using little-endian format
                    const xPosBuffer = rawPacket.slice(coordsStart, coordsStart + 4);
                    const xPos = xPosBuffer.readFloatLE(0);

                    const yPosBuffer = rawPacket.slice(coordsStart + 4, coordsStart + 8);
                    const yPos = yPosBuffer.readFloatLE(0);

                    const zPosBuffer = rawPacket.slice(coordsStart + 8, coordsStart + 12);
                    const zPos = zPosBuffer.readFloatLE(0);

                    const angleBuffer = rawPacket.slice(coordsStart + 12, coordsStart + 16);
                    const angle = angleBuffer.readFloatLE(0);

                    console.log(`プレイヤーのスポーン座標: X: ${xPos}, Y: ${yPos}, Z: ${zPos}, 角度: ${angle}`);

                    // Send player spawn position to main process
                    try {
                        const { ipcMain } = require('electron');
                        ipcMain.emit('player-position', null, {
                            x: xPos,
                            y: yPos,
                            z: zPos,
                            rotation: angle,
                            lastUpdate: Date.now(),
                            isSpawn: true
                        });
                    } catch (error) {
                        console.error(`プレイヤースポーン位置の送信エラー: ${error}`);
                    }
                } else {
                    console.log(`プレイヤースポーンパケットでパターンが見つからないか、パターンの前に十分なデータがありません。パターンインデックス: ${patternIndex}`);
                }
                break;

            default:
                break
                let flag = true;
                for(const i of PacketTypes.IKNOW){
                    if(i == packetType){
                        flag = false;
                    }
                }
                if(flag){
                    console.log(`不明なパケットタイプ: ${packetType}`);
                    console.log(PacketParser.customHexdump(rawPacket));
                    // Unknown packets are not processed or displayed on the map
                }
        }
        return packet;
    }
};

//rotation　: 角度
//pos?      : XYZの各座標
//target?   : クリックした先の座標
