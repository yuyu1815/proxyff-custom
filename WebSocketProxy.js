const bitwiseBuffer = require('bitwise-buffer')
const { xor, and, or, nor, not, leftShift, rightShift, lshift, rshift } = bitwiseBuffer;
const PacketParser = require('./PacketParser');
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
        //console.log(fullXorKey); // XORキーの完全な値をログ出力
        return xor(dataBuffer, fullXorKey);
    }

    async OnOutgoingMessage(url, data) {
        this.HandleMessage(data, "client")
    }

    async OnIncommingMessage(url, data) {
        this.HandleMessage(data, "server");
    }

    async HandleMessage(data, origin) {
        let currentDataHexString = data.toString("hex").toUpperCase();

        let packetData = Buffer.from(currentDataHexString.substring(18), "hex");
        packetData = this.DecryptPacket(packetData, origin == "server" ? this.serverKey : this.clientKey);

        PacketParser.ParsePacket(packetData);
    }
}
