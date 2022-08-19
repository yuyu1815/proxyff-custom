const PacketTypes = require("./PacketTypes");
const hexdump = require("hexdump-nodejs");
const { read } = require("original-fs");

class Packet {
    constructor() {
        this.origin = undefined;
        this.packetType = undefined;
        this.data = {};
    }
    SetOrigin(origin) {
        this.origin = origin;
    }
    Set(key, value) {
        this.data[key] = value;
    }
};

module.exports = class PacketParser {
    /**
     * @param {Buffer} rawPacket
     * @return {Packet}
     */
    static ParsePacket(rawPacket) {
        //What is a packet?
        //Get Packet type
        let currentCursor = 0;

        let readBytes = (numBytes) => {
            let bytes = rawPacket.slice(currentCursor, currentCursor + numBytes);
            currentCursor += numBytes;
            
            return bytes;
        };
        let readFloat = () => {
            return readBytes(4).readFloatLE(0);
        };

        let packetType = readBytes(4).toString("hex");

        let packet = new Packet();
        packet.packetType = packetType;

        switch (packetType) {
            case PacketTypes.CHARACTER_MOVE:
                packet.Set("posX", readFloat());
                packet.Set("posY", readFloat());
                packet.Set("posZ", readFloat());

                console.log("New position: ")
                console.log(packet.data);
                break;
        }

        //Dump out all not consumed bytes into the _rest key
        if (currentCursor < rawPacket.length) {
            let restBytes = rawPacket.length - currentCursor;
            console.log("Unused packet bytes for PacketType: " + packetType);
            console.log(hexdump(readBytes(restBytes)))
            //packet.Set("_rest", readBytes(restBytes));
        }

        //console.log(packet.data);


        return packet;
    }
};