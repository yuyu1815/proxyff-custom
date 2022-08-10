const PacketTypes = {
    SendChatMessage: "1F 14 00 00",
};


module.exports = class WebSocketProxy {
    constructor() {
        
    }

    async OnOutgoingMessage(url, data) {
        let currentDataHexString = data.toString("hex").toUpperCase();

        let packetHeader = currentDataHexString.substring(0, 18).match(/.{1,2}/g).join(' ');
        
        let packetData = currentDataHexString.substring(18).substring(0, 64).match(/.{1,2}/g).join(' ');

                console.log("\x1b[32mSend: " + " Header: " + packetHeader + " DataLength: " + currentDataHexString.substring(18).length / 2 + " First 32 Bytes: " + packetData);
    }

    async OnIncommingMessage(url, data) {
        let currentDataHexString = data.toString("hex").toUpperCase();

        let packetHeader = currentDataHexString.substring(0, 18).match(/.{1,2}/g).join(' ');
        let packetData = currentDataHexString.substring(18).substring(0, 64).match(/.{1,2}/g).join(' ');

    
        console.log("\x1b[31mRecv: " + " Header: " + packetHeader + " DataLength: " + currentDataHexString.substring(18).length / 2 + " First 32 Bytes: " + packetData);

    }
}
