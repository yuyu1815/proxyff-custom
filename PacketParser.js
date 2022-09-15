const PacketTypes = require("./PacketTypes");
const hexdump = require("hexdump-nodejs");
const { read } = require("original-fs");
const fs = require("fs");

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
     * Calculate the rotation between a starting position posA and target position posB
     * @param {[number, number, number]} posA 
     * @param {[number, number, number]} posB 
     * @returns {number}
     */
    static CalculateRotation(posA, posB) {
        var x1, x2, y1, y2, cx1, cy1, cx2, cy2, deltaX, deltaY, dx, dy, rad, deg;
        x1 = posA[2];
        y1 = posA[0];
        x2 = posB[2];
        y2 = posB[0];
        cx1 = x1 - (0 / 2);
        cy1 = y1 - (0 / 2);
        cx2 = x2 - (0 / 2);
        cy2 = y2 - (0 / 2);

        deltaX = cx2 - cx1;
        deltaY = cy2 - cy1;
        y1 = Math.sqrt((Math.abs(deltaY) * Math.abs(deltaY)) + (Math.abs(deltaX) * (Math.abs(deltaX))));
        x1 = 0;
        dy = deltaY - y1;
        dx = deltaX - x1;
        rad = Math.atan2(dy, dx);
        deg = rad * (360 / Math.PI);
        //deg += 180;
        return ((360 - deg) + 90) % 360;
    }

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
        let readUInt32 = () => {
            return readBytes(4).readUInt32BE(0);
        };
        let readShort = () => {
            return readBytes(2).readUInt16BE(0);
        };

        let packetType = readBytes(4).toString("hex");

        let packet = new Packet();
        packet.packetType = packetType;
        console.log(packet.packetType);
        let currentUnknownIndex = 0;

        switch (packetType) {
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
                packet.Set("posX", readFloat());
                packet.Set("posY", readFloat());
                packet.Set("posZ", readFloat());
                packet.Set("movementType", readBytes(2).toString("hex"));
                packet.Set("sessionTime", readBytes(4));

                switch (packet.data.movementType) {
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
                }

                console.log(packet.data)

                
                break;
        }


/*
        console.log(packet.packetType);
        //Dump out all not consumed bytes into the _rest key
        if (currentCursor < rawPacket.length) {
            let restBytes = rawPacket.length - currentCursor;
            console.log("Unused packet bytes for PacketType: " + packetType);
            let restBytesData = readBytes(restBytes)
            console.log(hexdump(restBytesData))
        fs.writeFileSync(packet.packetType + ".bin", restBytesData,  "binary");

            //packet.Set("_rest", readBytes(restBytes));
        }
*/


        return packet;
    }
};