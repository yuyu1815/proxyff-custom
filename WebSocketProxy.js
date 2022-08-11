const bitwiseBuffer = require('bitwise-buffer')
const { xor, and, or, nor, not, leftShift, rightShift, lshift, rshift } = bitwiseBuffer;
const hexdump = require("hexdump-nodejs");
const PacketTypes = require('./PacketTypes');
module.exports = class WebSocketProxy {
    constructor() {
        this.SetupClientXorKey();
        this.SetupServerXorKey();
    }

    SetupClientXorKey() {
        var encrypted1 = new Buffer('DC914EF04B5248E77FD20913C399AD24FF13C5B032603058EDD84C214AF34E8A', 'hex')
        var plaintext1 = new Buffer('c3a6c3a6c3a6c3a6c3a6c3a6c3a6c3a6c3a6c3a6c3a6c3a6c3a6c3a6c3a6c3a6', 'hex')
        var encrypted2 = new Buffer('236EB10FB4ADB718802DF6EC3C6652DB00EC3A4FCD9FCFA71227B3DEB50CB175', 'hex')
        var plaintext2 = new Buffer('3c593c593c593c593c593c593c593c593c593c593c593c593c593c593c593c59', 'hex')

        var xorResult1 = xor(encrypted1, plaintext1);
        var xorResult2 = xor(encrypted2, plaintext2);
        var xorKey = and(xorResult1, xorResult2);

        this.clientKey = xorKey;
    }

    SetupServerXorKey() {
        var encrypted1 = new Buffer('91e466626577759f16de36087958fb6c6704a4ae9b7715a510d6cb8930900fcf', 'hex')
        var plaintext1 = new Buffer('c3a6c3a6c3a6c3a6c3a6c3a6c3a6c3a6c3a6c3a6c3a6c3a6c3a6c3a6c3a6c3a6', 'hex')
        var encrypted2 = new Buffer('6e1b999d9a888a60e921c9f786a7049398fb5b516488ea5aef293476cf6ff030', 'hex')
        var plaintext2 = new Buffer('3c593c593c593c593c593c593c593c593c593c593c593c593c593c593c593c59', 'hex')

        var xorResult1 = xor(encrypted1, plaintext1);
        var xorResult2 = xor(encrypted2, plaintext2);
        var xorKey = and(xorResult1, xorResult2);

        this.serverKey = xorKey;
    }

    DecryptPacket(dataBuffer, xorKey) {
        let xorKeyChunks = [];
        for (let currentLength = 0; currentLength < dataBuffer.length; currentLength += xorKey.length) {
            xorKeyChunks.push(xorKey);
        }
        let fullXorKey = Buffer.concat(xorKeyChunks).slice(0, dataBuffer.length);
        //console.log(fullXorKey);
        return xor(dataBuffer, fullXorKey);
    }

    async OnOutgoingMessage(url, data) {
        let currentDataHexString = data.toString("hex").toUpperCase();

        let packetHeader = currentDataHexString.substring(0, 18).match(/.{1,2}/g).join(' ');

        let packetData = Buffer.from(currentDataHexString.substring(18), "hex");
        packetData = this.DecryptPacket(packetData, this.clientKey);

        let packetType = packetData.slice(0, 4).toString("hex");
console.log(packetType);
        switch (packetType) {
            case "04945a64": //Character move packet
                console.log("Character Move Packet:");
                
                let posX = packetData.readFloatLE(4);
                let posY = packetData.readFloatLE(8);
                let posZ = packetData.readFloatLE(12);
                console.log({ unknown1: packetData.slice(0, 4), posX, posY, posZ, unknown2: packetData.slice(16) })
                //console.log(hexdump(packetData));
                break;
            case "00b45a64":
                let messageLength = parseInt(packetData.slice(4, 8).reverse().toString("hex"), 16);
                let message = packetData.slice(8, messageLength + 8).toString("utf-8");
                console.log("OnSendChatMessage: " + message);
                break;
            default:
                console.log("\x1b[32mSend: " + " Header: " + packetHeader + " DataLength: " + currentDataHexString.substring(18).length / 2 + "\x1b[0m");
                console.log(hexdump(packetData));
        }
    }

    async OnIncommingMessage(url, data) {
        let currentDataHexString = data.toString("hex").toUpperCase();

        let packetHeader = currentDataHexString.substring(0, 18).match(/.{1,2}/g).join(' ');
        let packetData = Buffer.from(currentDataHexString.substring(18), "hex");
        packetData = this.DecryptPacket(packetData, this.serverKey);
        let packetType = packetData.slice(0, 4).toString("hex");

        switch (packetType) {
            case "00b45a64":
                let messageLength = parseInt(packetData.slice(4, 8).reverse().toString("hex"), 16);
                let message = packetData.slice(8, messageLength + 8).toString("utf-8");
                console.log("OnRecvChatMessage: " + message);
                break;
            default:
                console.log("\x1b[31mRecv: " + " Header: " + packetHeader + " DataLength: " + currentDataHexString.substring(18).length / 2 + "\x1b[0m");
                console.log(hexdump(packetData));
        }
    }
}
