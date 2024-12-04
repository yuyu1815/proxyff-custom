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
            let bytes = rawPacket.slice(currentCursor, currentCursor + numBytes);
            currentCursor += numBytes;
            return bytes;
        };
        let readFloat = () => {
            return readBytes(4).readFloatLE(0);
        };
        let readUInt32 = () => {
            return readBytes(4).readUInt32BE(0);
        };
        let readShort = () => {
            return readBytes(2).readUInt16BE(0);
        };

        // パケットタイプの読み取りと新しいパケットオブジェクトの作成
        let packetType = readBytes(4).toString("hex");
        let packet = new Packet();
        packet.packetType = packetType;

        // パケットタイプに応じた処理
        switch (packetType) {
            //解析用
            case PacketTypes.UNKNOWN_WELCOME:
                let uk = readShort();
                let uk2 = readBytes(4);
                while (currentCursor < rawPacket.length + 12) {
                    
                    let unknown1 = readShort();
                    let chunkLength = readShort();
                    readBytes(6);
                    let chunkData = readBytes(chunkLength);
                    //let unknown6 = readBytes(2);


                    console.log({unknown1, chunkLength});
                    console.log(hexdump(chunkData));
                    console.log(currentCursor);

                    //break;
                    
                    //break;
                    //let chunkLength = readUInt32();
                    
                    //packet.Set("Unknown" + currentUnknownIndex++, readBytes(chunkLength));
                    //readBytes(2);
                    //packet.Set("Unknown" + currentUnknownIndex++, readUInt32());
                    //packet.Set("Unknown" + currentUnknownIndex++, readUInt32());

                }

                //console.log(hexdump(rawPacket));

                

                /*
                packet.Set("Unknown1", readBytes(4));
                packet.Set("Unknown2", readBytes(4));
                //packet.Set("Unknown3", readBytes(2));
                packet.Set("Unknown3", readUInt32());*/


                console.log(packet.data);
                if (currentCursor < rawPacket.length) {
                    let restBytes = rawPacket.length - currentCursor;
                    console.log("Unused packet bytes for PacketType: " + packetType);
                    let restBytesData = readBytes(restBytes)
                    console.log(hexdump(restBytesData))
                }

                
                break;

            case PacketTypes.CHARACTER_MOVE:
                // キャラクター移動パケットの処理
                packet.Set("posX", readFloat());         // X座標
                packet.Set("posY", readFloat());         // Y座標
                packet.Set("posZ", readFloat());         // Z座標
                packet.Set("movementType", readBytes(2).toString("hex")); // 移動タイプ
                packet.Set("sessionTime", readBytes(4)); // セッション時間
                //データが変わってます

               /* switch (packet.data.movementType) {
                    case "0101":
                    case "0201": //jump
                    case "0601": //forward
                    case "0701": //backward
                    case "0801": //left rotate
                    case "0901": //right rotate
                    case "0a01":
                        packet.Set("rotation", readFloat());
                        readBytes(4);
                        break;
                    case "0400":
                        //deselect target
                        break;
                    case "0401":
                        //select target
                        break;
                    case "1101":
                        //attack target
                        break;
                    case "0007":
                        //click to move
                        packet.Set("targetX", readFloat());
                        readBytes(4);
                        packet.Set("targetY", readFloat());
                        readBytes(4);
                        packet.Set("targetZ", readFloat());
                        readBytes(4);
                        packet.Set("rotation", PacketParser.CalculateRotation([packet.data.posX, packet.data.posY, packet.data.posZ], [packet.data.targetX, packet.data.targetY, packet.data.targetZ]));
                        break;
                }*/
                // 移動タイプに応じた追加データの処理
                switch(packet.data.movementType){
                    case "5a01": // キーボード入力による移動
                        packet.Set("rotation", readFloat());
                        readBytes(4);
                        console.log("rotation "+ packet.data.rotation)
                        console.log("movementType " + packet.data.movementType +" X "+ packet.data.posX +" Y "+ packet.data.posY +" Z "+ packet.data.posZ)
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
                        console.log("movementType " + packet.data.movementType +" X "+ packet.data.posX +" Y "+ packet.data.posY +" Z "+ packet.data.posZ + 
                                                                     " goto: " +" X "+ packet.data.targetX +" Y "+ packet.data.targetY +" Z "+  packet.data.targetZ)
                        break;
                    default:
                        console.log("movementType " + packet.data.movementType)
                        break
                }
                break;
            default:
                console.log("packetType: " + packetType)
        }
        return packet;
    }
};

//rotation　: 角度
//pos?      : XYZの各座標
//target?   : クリックした先の座標