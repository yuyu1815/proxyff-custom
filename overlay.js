const { ipcRenderer } = require('electron');

// Store monster data
const monsters = {};

// Store player position
let playerPosition = {
    x: 0,
    y: 0,
    z: 0,
    rotation: 0
};

// Store user position
let userPosition = {
    x: 0,
    y: 0,
    z: 0,
    rotation: 0,
    lastUpdate: Date.now()
};

// DOM elements
const overlayContainer = document.getElementById('overlay-container');
const monsterList = document.getElementById('monster-list');
const clearButton = document.getElementById('clear-monsters');

// Clear all monsters
clearButton.addEventListener('click', () => {
    for (const id in monsters) {
        if (monsters[id].element) {
            monsters[id].element.remove();
        }
    }
    // Reset monsters object
    Object.keys(monsters).forEach(key => delete monsters[key]);
    // Clear the monster list
    monsterList.innerHTML = '';
});

// Copy all visible monster IDs
const copyButton = document.getElementById('copy-monster-ids');
copyButton.addEventListener('click', () => {
    // Get all visible monster IDs from the map
    const visibleMonsterIds = [];

    for (const id in monsters) {
        // Skip filtered monsters
        if (mapConfig.filteredMonsters.has(id)) {
            continue;
        }

        const monster = monsters[id].lastData;
        if (!monster) continue;

        // Skip monsters that don't match the search term
        if (mapConfig.searchTerm) {
            // Get monster ID in various formats for searching
            const monsterId = id.toLowerCase();
            const monsterOriginalId = monster.originalId ? monster.originalId.toString(16).toLowerCase() : '';
            const monsterFullId = monster.monsterIdFull ? monster.monsterIdFull.toLowerCase() : '';
            const monsterIdentId = monster.monsterIdentificationId ? monster.monsterIdentificationId.toLowerCase() : '';

            // Check if any ID contains the search term
            const matchesSearch = 
                monsterId.includes(mapConfig.searchTerm) || 
                monsterOriginalId.includes(mapConfig.searchTerm) || 
                monsterFullId.includes(mapConfig.searchTerm) || 
                monsterIdentId.includes(mapConfig.searchTerm);

            if (!matchesSearch) {
                continue;
            }
        }

        // Add the monster ID to the list (prefer monsterIdFull if available)
        if (monster.monsterIdFull) {
            visibleMonsterIds.push(monster.monsterIdFull);
        } else if (monster.originalId) {
            visibleMonsterIds.push(monster.originalId.toString(16));
        } else {
            visibleMonsterIds.push(id);
        }
    }

    // Copy IDs to clipboard
    if (visibleMonsterIds.length > 0) {
        const idText = visibleMonsterIds.join('\n');
        navigator.clipboard.writeText(idText)
            .then(() => {
                // Show success message
                const originalText = copyButton.textContent;
                copyButton.textContent = `Copied ${visibleMonsterIds.length} IDs!`;
                copyButton.style.backgroundColor = '#45a049';

                // Reset button text after 2 seconds
                setTimeout(() => {
                    copyButton.textContent = originalText;
                    copyButton.style.backgroundColor = '';
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy IDs: ', err);
                copyButton.textContent = 'Copy failed!';
                copyButton.style.backgroundColor = '#f44336';

                // Reset button text after 2 seconds
                setTimeout(() => {
                    copyButton.textContent = 'Copy Map IDs';
                    copyButton.style.backgroundColor = '';
                }, 2000);
            });
    } else {
        // Show message if no IDs to copy
        copyButton.textContent = 'No IDs to copy!';
        copyButton.style.backgroundColor = '#f44336';

        // Reset button text after 2 seconds
        setTimeout(() => {
            copyButton.textContent = 'Copy Map IDs';
            copyButton.style.backgroundColor = '';
        }, 2000);
    }
});

// Listen for monster position updates
ipcRenderer.on('monster-position', (event, data) => {
    // Skip unknown packets
    if (data.isUnknown) {
        return;
    }
    // Display only known monster packets
    updateMonsterInfo(data);
});

// Listen for player position updates
ipcRenderer.on('player-position', (event, data) => {
    // Update player position
    playerPosition = data;

    // Update all monster info to reflect new relative positions
    for (const id in monsters) {
        if (monsters[id] && monsters[id].lastData) {
            updateMonsterInfo(monsters[id].lastData);
        }
    }

    // Always render the map after player position update to ensure pins are displayed
    if (mapConfig && mapConfig.initialPacket) {
        renderMap();
    }
});

// Listen for user position updates
ipcRenderer.on('user-position', (event, data) => {
    // Update user position
    userPosition = {
        x: data.x,
        y: data.y,
        z: data.z,
        rotation: data.rotation || 0,
        lastUpdate: data.lastUpdate || Date.now()
    };

    // Update player position to match user position
    playerPosition = {
        x: data.x,
        y: data.y,
        z: data.z,
        rotation: data.rotation || 0,
        lastUpdate: data.lastUpdate || Date.now()
    };

    // Update all monster info to reflect new relative positions
    for (const id in monsters) {
        if (monsters[id] && monsters[id].lastData) {
            updateMonsterInfo(monsters[id].lastData);
        }
    }
});

// Listen for initial packet
ipcRenderer.on('initial-packet', (event, data) => {
    console.log('初期パケットを受信しました');
    console.log(data);

    // 初期パケット: 00 00 00 00 00 00 00 04 00 01 00 00
    // このパケットをマップに設定

    // マップの初期設定を行う
    if (mapConfig) {
        mapConfig.initialPacket = true;
        console.log('マップに初期パケットを設定しました');

        // マップを更新
        if (typeof renderMap === 'function') {
            renderMap();
        }

        // マップの中心をプレイヤーに合わせる
        if (typeof centerMapOnPlayer === 'function') {
            centerMapOnPlayer();
        }
    }
});

// Function to generate a color based on monster ID
function getMonsterColor(monsterId) {
    // If no monster ID is provided, return default red
    if (!monsterId) return 'red';

    // Convert monster ID to a number if it's a string
    const idNum = typeof monsterId === 'string' ? parseInt(monsterId, 16) : monsterId;

    // Use the monster ID to generate a hue value (0-360)
    // We'll use modulo to ensure it wraps around
    const hue = (idNum % 360);

    // Use a fixed saturation and lightness for good visibility
    return `hsl(${hue}, 100%, 50%)`;
}

// Update monster info in the list
function updateMonsterInfo(data) {
    // Calculate relative coordinates (monster position - player position)
    const relativeX = data.x - playerPosition.x;
    const relativeZ = data.z - playerPosition.z;

    // Get monster ID
    let monsterId;
    if (data.originalId !== undefined) {
        // Use the original ID if available
        monsterId = data.originalId;
    } else if (data.monsterIdFull) {
        // Use the monster's full ID if available
        monsterId = parseInt(data.monsterIdFull, 16) || data.id;
    } else {
        // Try to parse the ID if it's a string with an underscore
        monsterId = (typeof data.id === 'string' && data.id.includes('_')) ? 
                    parseInt(data.id.split('_')[0], 10) : data.id;
    }

    const id = data.id;

    // Check if monster matches the search term (for monster list filtering)
    if (mapConfig.searchTerm) {
        const idStr = id.toLowerCase();
        const originalIdStr = data.originalId ? data.originalId.toString(16).toLowerCase() : '';
        const fullIdStr = data.monsterIdFull ? data.monsterIdFull.toLowerCase() : '';
        const identIdStr = data.monsterIdentificationId ? data.monsterIdentificationId.toLowerCase() : '';

        const matchesSearch = 
            idStr.includes(mapConfig.searchTerm) || 
            originalIdStr.includes(mapConfig.searchTerm) || 
            fullIdStr.includes(mapConfig.searchTerm) || 
            identIdStr.includes(mapConfig.searchTerm);

        // Update visibility of existing monster item in the list
        if (monsters[id] && monsters[id].element) {
            monsters[id].element.style.display = matchesSearch ? 'block' : 'none';
        }
    } else if (monsters[id] && monsters[id].element) {
        // If no search term, ensure monster is visible
        monsters[id].element.style.display = 'block';
    }

    if (!monsters[id]) {
        // Create new monster item
        const monsterItem = document.createElement('div');
        monsterItem.className = 'monster-item';
        monsterItem.id = `monster-${id}`;

        // Add monster info
        const info = document.createElement('div');
        info.className = 'monster-info';

        // Format data as hexdump
        const hexData = formatMonsterAsHexdump(id, data);
        info.innerHTML = hexData;

        monsterItem.appendChild(info);
        monsterList.appendChild(monsterItem);

        monsters[id] = {
            element: monsterItem,
            lastUpdate: Date.now(),
            lastData: data
        };
    } else {
        // Store the last data received for this monster
        monsters[id].lastData = data;
        monsters[id].lastUpdate = Date.now();

        // Update info text with hexdump-like format
        const info = monsters[id].element.querySelector('.monster-info');

        // Format data as hexdump
        const hexData = formatMonsterAsHexdump(id, data);
        info.innerHTML = hexData;
    }
}

// Function to format monster data as hexdump
function formatMonsterAsHexdump(id, data) {
    // Create a buffer to represent the monster data
    const buffer = new ArrayBuffer(64); // Allocate enough space for the data including IDs
    const view = new DataView(buffer);

    // Write monster ID (4 bytes) - use originalId if available, otherwise try to parse id
    const numericId = data.originalId !== undefined ? data.originalId : 
                      (typeof id === 'string' && id.includes('_')) ? parseInt(id.split('_')[0], 10) : id;
    view.setUint32(0, numericId, false); // Big-endian

    // Write X coordinate (4 bytes)
    view.setFloat32(4, data.x, true); // Little-endian

    // Write Y coordinate (4 bytes)
    view.setFloat32(8, data.y, true);

    // Write Z coordinate (4 bytes)
    view.setFloat32(12, data.z, true);

    // Write rotation (4 bytes)
    view.setFloat32(16, data.rotation || 0, true);

    // Write timestamp (8 bytes)
    const timestamp = data.lastUpdate || Date.now();
    view.setBigUint64(20, BigInt(timestamp), true);

    // Write monster identification ID and monster ID if available
    let monsterIdColor = 'white';
    if (data.monsterIdFull) {
        // Convert hex string to bytes and write to buffer
        const monsterIdFullBytes = hexStringToBytes(data.monsterIdFull);
        const monsterIdentBytes = hexStringToBytes(data.monsterIdentificationId || '');

        // Write monster ID (8 bytes) starting at offset 28
        for (let i = 0; i < monsterIdFullBytes.length && i < 8; i++) {
            view.setUint8(28 + i, monsterIdFullBytes[i]);
        }

        // Write monster identification ID (10 bytes) starting at offset 36
        for (let i = 0; i < monsterIdentBytes.length && i < 20; i++) {
            view.setUint8(36 + i, monsterIdentBytes[i]);
        }

        // Get color for this monster ID
        monsterIdColor = getMonsterColor(data.monsterIdFull);
    } else {
        // Fill with random data if IDs are not available
        for (let i = 28; i < 64; i++) {
            view.setUint8(i, Math.floor(Math.random() * 256));
        }
    }

    // Convert to Uint8Array for easier processing
    const bytes = new Uint8Array(buffer);

    // Calculate relative position to player
    const relativeX = data.x - playerPosition.x;
    const relativeZ = data.z - playerPosition.z;

    // Format as hexdump
    let result = `MONSTER_PACKET (${numericId.toString(16).padStart(8, '0')}) received:<br>`;
    result += `Position (relative to user): X: ${relativeX.toFixed(2)}, Z: ${relativeZ.toFixed(2)} (Y: ${data.y.toFixed(2)})<br>`;

    // Add monster ID and identification ID if available
    if (data.monsterIdFull) {
        result += `<span style="color: ${monsterIdColor}; font-weight: bold;">Monster ID: ${data.monsterIdFull}</span><br>`;
        result += `Identification ID: ${data.monsterIdentificationId || 'N/A'}<br>`;
    }

    result += `  Offset  00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F<br>`;

    // Helper function to convert hex string to byte array
    function hexStringToBytes(hexString) {
        const bytes = [];
        for (let i = 0; i < hexString.length; i += 2) {
            bytes.push(parseInt(hexString.substr(i, 2), 16));
        }
        return bytes;
    }

    // Format each line (16 bytes per line)
    for (let i = 0; i < bytes.length; i += 16) {
        // Offset
        result += `${i.toString(16).padStart(8, '0')}  `;

        // Hex values
        for (let j = 0; j < 16; j++) {
            if (i + j < bytes.length) {
                result += `${bytes[i + j].toString(16).padStart(2, '0')} `;
            } else {
                result += '   ';
            }
        }

        // ASCII representation
        result += ' ';
        for (let j = 0; j < 16; j++) {
            if (i + j < bytes.length) {
                const byte = bytes[i + j];
                // Use a printable character if in the ASCII range, otherwise use a dot
                const char = (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.';
                result += char;
            }
        }

        result += '<br>';
    }

    return result;
}


// Clean up old monsters that haven't been updated recently
const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const id in monsters) {
        if (now - monsters[id].lastUpdate > 30000) { // 30 seconds
            if (monsters[id].element) {
                monsters[id].element.remove();
            }
            delete monsters[id];
        }
    }
}, 10000);

// Clean up resources when the window is closed
window.addEventListener('beforeunload', () => {
    // Clear the cleanup interval
    clearInterval(cleanupInterval);

    // Remove all event listeners
    ipcRenderer.removeAllListeners('monster-position');
    ipcRenderer.removeAllListeners('player-position');
    ipcRenderer.removeAllListeners('user-position');

    // Remove all monster elements from the DOM
    for (const id in monsters) {
        if (monsters[id].element) {
            monsters[id].element.remove();
        }
    }

    // Clear the monsters object
    Object.keys(monsters).forEach(key => delete monsters[key]);
});

// ==================== MAP IMPLEMENTATION ====================

// Map configuration
const mapConfig = {
    canvas: document.getElementById('map-canvas'),
    container: document.getElementById('map-container'),
    info: document.getElementById('map-info'),
    tooltip: document.getElementById('entity-tooltip'),
    distanceCanvas: document.getElementById('distance-line'),
    scale: 1.0,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    gridSize: 50,
    tracking: true,
    visible: true,
    entitySize: 10,
    playerColor: '#00FF00',
    monsterColors: {},
    filteredMonsters: new Set(),
    entityPositions: [],
    hoveredEntity: null,
    measureDistance: false,
    distanceStart: null,
    distanceEnd: null,
    showPaths: false,
    searchTerm: '',
    pathHistory: {
        player: [],
        monsters: {}
    },
    pathMaxLength: 100,  // Maximum number of points to store in path history
    pathUpdateInterval: 1000  // Minimum time between path updates in ms
};

// Initialize map canvas
function initMap() {
    const canvas = mapConfig.canvas;
    const container = mapConfig.container;

    // Set canvas size to match container
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Get 2D context for drawing
    const ctx = canvas.getContext('2d');

    // Set up event listeners for map controls
    document.getElementById('zoom-in').addEventListener('click', () => {
        mapConfig.scale *= 1.2;
        updateMapInfo();
        renderMap();
    });

    document.getElementById('zoom-out').addEventListener('click', () => {
        mapConfig.scale /= 1.2;
        updateMapInfo();
        renderMap();
    });

    document.getElementById('center-map').addEventListener('click', () => {
        centerMapOnPlayer();
    });

    document.getElementById('toggle-tracking').addEventListener('click', () => {
        mapConfig.tracking = !mapConfig.tracking;
        document.getElementById('toggle-tracking').style.backgroundColor = 
            mapConfig.tracking ? '#4CAF50' : 'rgba(0, 0, 0, 0.7)';
        if (mapConfig.tracking) {
            centerMapOnPlayer();
        }
    });

    document.getElementById('toggle-filter').addEventListener('click', () => {
        // Simple filter toggle for now - will be expanded in Phase 2
        if (mapConfig.filteredMonsters.size > 0) {
            mapConfig.filteredMonsters.clear();
        } else {
            // Filter out monsters that are far away (example)
            for (const id in monsters) {
                const monster = monsters[id].lastData;
                if (monster) {
                    const dx = monster.x - playerPosition.x;
                    const dz = monster.z - playerPosition.z;
                    const distance = Math.sqrt(dx*dx + dz*dz);
                    if (distance > 100) {
                        mapConfig.filteredMonsters.add(id);
                    }
                }
            }
        }
        document.getElementById('toggle-filter').style.backgroundColor = 
            mapConfig.filteredMonsters.size > 0 ? '#4CAF50' : 'rgba(0, 0, 0, 0.7)';
        renderMap();
    });

    document.getElementById('measure-distance').addEventListener('click', () => {
        mapConfig.measureDistance = !mapConfig.measureDistance;
        document.getElementById('measure-distance').style.backgroundColor = 
            mapConfig.measureDistance ? '#4CAF50' : 'rgba(0, 0, 0, 0.7)';

        // Reset distance measurement points
        mapConfig.distanceStart = null;
        mapConfig.distanceEnd = null;

        // Clear distance line
        const distCanvas = mapConfig.distanceCanvas;
        const distCtx = distCanvas.getContext('2d');
        distCanvas.width = mapConfig.container.clientWidth;
        distCanvas.height = mapConfig.container.clientHeight;
        distCtx.clearRect(0, 0, distCanvas.width, distCanvas.height);

        // Update cursor style
        mapConfig.canvas.style.cursor = mapConfig.measureDistance ? 'crosshair' : 'move';
    });

    document.getElementById('toggle-paths').addEventListener('click', () => {
        mapConfig.showPaths = !mapConfig.showPaths;
        document.getElementById('toggle-paths').style.backgroundColor = 
            mapConfig.showPaths ? '#4CAF50' : 'rgba(0, 0, 0, 0.7)';
        renderMap();
    });

    document.getElementById('toggle-map').addEventListener('click', () => {
        mapConfig.visible = !mapConfig.visible;
        mapConfig.container.style.display = mapConfig.visible ? 'block' : 'none';
    });

    // Add event listener for monster ID search
    document.getElementById('monster-id-search').addEventListener('input', (e) => {
        mapConfig.searchTerm = e.target.value.trim().toLowerCase();
        renderMap();
    });

    // Add event listener for search clear button
    document.getElementById('search-clear').addEventListener('click', () => {
        document.getElementById('monster-id-search').value = '';
        mapConfig.searchTerm = '';
        renderMap();
    });

    // Set up mouse events for panning
    canvas.addEventListener('mousedown', (e) => {
        mapConfig.isDragging = true;
        mapConfig.lastMouseX = e.clientX;
        mapConfig.lastMouseY = e.clientY;
        mapConfig.tracking = false;
        document.getElementById('toggle-tracking').style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Handle dragging
        if (mapConfig.isDragging && !mapConfig.measureDistance) {
            const dx = e.clientX - mapConfig.lastMouseX;
            const dy = e.clientY - mapConfig.lastMouseY;

            mapConfig.offsetX += dx / mapConfig.scale;
            mapConfig.offsetY += dy / mapConfig.scale;

            mapConfig.lastMouseX = e.clientX;
            mapConfig.lastMouseY = e.clientY;

            renderMap();
        }

        // Handle distance measurement
        if (mapConfig.measureDistance && mapConfig.distanceStart) {
            mapConfig.distanceEnd = {
                x: mouseX,
                y: mouseY
            };
            drawDistanceLine();
        }

        // Calculate world coordinates for info display
        const worldX = (mouseX - canvas.width / 2) / mapConfig.scale - mapConfig.offsetX;
        const worldZ = (mouseY - canvas.height / 2) / mapConfig.scale - mapConfig.offsetY;
        updateMapInfo(worldX, worldZ);

        // Check for entity hover
        checkEntityHover(mouseX, mouseY);
    });

    canvas.addEventListener('mouseup', (e) => {
        mapConfig.isDragging = false;

        // Handle distance measurement click
        if (mapConfig.measureDistance) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            if (!mapConfig.distanceStart) {
                // Set start point
                mapConfig.distanceStart = {
                    x: mouseX,
                    y: mouseY
                };
                mapConfig.distanceEnd = null;
            } else {
                // Set end point and calculate distance
                mapConfig.distanceEnd = {
                    x: mouseX,
                    y: mouseY
                };
                drawDistanceLine();
            }
        }
    });

    canvas.addEventListener('mouseleave', () => {
        mapConfig.isDragging = false;

        // Hide tooltip when mouse leaves canvas
        mapConfig.tooltip.style.display = 'none';
        mapConfig.hoveredEntity = null;
    });

    // Handle wheel for zooming
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();

        // Get mouse position relative to canvas
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate world coordinates before zoom
        const worldX = (mouseX - canvas.width / 2) / mapConfig.scale - mapConfig.offsetX;
        const worldY = (mouseY - canvas.height / 2) / mapConfig.scale - mapConfig.offsetY;

        // Adjust scale based on wheel direction
        if (e.deltaY < 0) {
            mapConfig.scale *= 1.1;
        } else {
            mapConfig.scale /= 1.1;
        }

        // Calculate new offsets to zoom toward mouse position
        mapConfig.offsetX = (mouseX - canvas.width / 2) / mapConfig.scale - worldX;
        mapConfig.offsetY = (mouseY - canvas.height / 2) / mapConfig.scale - worldY;

        updateMapInfo();
        renderMap();
    });

    // Initial render
    centerMapOnPlayer();
    renderMap();

    // Set initial visibility
    mapConfig.container.style.display = mapConfig.visible ? 'block' : 'none';
}

// Center map on player position
function centerMapOnPlayer() {
    mapConfig.offsetX = 0;
    mapConfig.offsetY = 0;
    renderMap();
}

// Update map info display
function updateMapInfo(mouseX, mouseZ, distanceInfo) {
    const playerX = Math.round(playerPosition.x);
    const playerZ = Math.round(playerPosition.z);

    let infoText = `Player: X: ${playerX}, Z: ${playerZ} | Zoom: ${mapConfig.scale.toFixed(1)}x`;

    if (mouseX !== undefined && mouseZ !== undefined) {
        const worldX = Math.round(playerPosition.x + mouseX);
        const worldZ = Math.round(playerPosition.z + mouseZ);
        infoText += ` | Mouse: X: ${worldX}, Z: ${worldZ}`;
    }

    // Add distance measurement info if available
    if (distanceInfo) {
        infoText += ` | Distance: ${distanceInfo.distance.toFixed(1)} units`;
        infoText += ` | From: (${Math.round(distanceInfo.start.x)}, ${Math.round(distanceInfo.start.z)})`;
        infoText += ` | To: (${Math.round(distanceInfo.end.x)}, ${Math.round(distanceInfo.end.z)})`;
    }

    mapConfig.info.textContent = infoText;
}

// Render the map
function renderMap() {
    // Ensure canvas is available
    if (!mapConfig || !mapConfig.canvas) {
        console.log('Map canvas not available yet, skipping render');
        return;
    }

    const canvas = mapConfig.canvas;
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    drawGrid(ctx);

    // Draw paths if enabled
    if (mapConfig.showPaths) {
        drawPaths(ctx);
    }

    // Draw entities
    drawEntities(ctx);

    // Update tracking if enabled
    if (mapConfig.tracking) {
        centerMapOnPlayer();
    }
}

// Draw grid
function drawGrid(ctx) {
    const canvas = mapConfig.canvas;
    const gridSize = mapConfig.gridSize * mapConfig.scale;

    // Calculate grid offset based on player position and map offset
    const offsetX = (canvas.width / 2) + mapConfig.offsetX * mapConfig.scale;
    const offsetY = (canvas.height / 2) + mapConfig.offsetY * mapConfig.scale;

    // Calculate grid start positions
    const startX = offsetX % gridSize;
    const startY = offsetY % gridSize;

    // Set grid style
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
    ctx.lineWidth = 1;

    // Draw vertical grid lines
    for (let x = startX; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    // Draw horizontal grid lines
    for (let y = startY; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Draw coordinate axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;

    // X-axis
    ctx.beginPath();
    ctx.moveTo(0, offsetY);
    ctx.lineTo(canvas.width, offsetY);
    ctx.stroke();

    // Z-axis
    ctx.beginPath();
    ctx.moveTo(offsetX, 0);
    ctx.lineTo(offsetX, canvas.height);
    ctx.stroke();
}

// Draw entities (player and monsters)
function drawEntities(ctx) {
    const canvas = mapConfig.canvas;
    const entitySize = mapConfig.entitySize * mapConfig.scale;

    // Calculate center of canvas (player position)
    const centerX = canvas.width / 2 + mapConfig.offsetX * mapConfig.scale;
    const centerY = canvas.height / 2 + mapConfig.offsetY * mapConfig.scale;

    // Draw player
    ctx.fillStyle = mapConfig.playerColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, entitySize, 0, Math.PI * 2);
    ctx.fill();

    // Draw player direction indicator
    const directionLength = entitySize * 1.5;
    const directionX = centerX + Math.sin(playerPosition.rotation * Math.PI / 180) * directionLength;
    const directionY = centerY - Math.cos(playerPosition.rotation * Math.PI / 180) * directionLength;

    ctx.strokeStyle = mapConfig.playerColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(directionX, directionY);
    ctx.stroke();

    // Store entity positions for hover detection
    mapConfig.entityPositions = [];

    // Add player to entity positions
    mapConfig.entityPositions.push({
        type: 'player',
        id: 'player',
        x: centerX,
        y: centerY,
        radius: entitySize,
        data: playerPosition
    });

    // Draw monsters
    for (const id in monsters) {
        // Skip filtered monsters
        if (mapConfig.filteredMonsters.has(id)) {
            continue;
        }

        const monster = monsters[id].lastData;
        if (!monster) continue;

        // Skip monsters that don't match the search term
        if (mapConfig.searchTerm) {
            // Get monster ID in various formats for searching
            const monsterId = id.toLowerCase();
            const monsterOriginalId = monster.originalId ? monster.originalId.toString(16).toLowerCase() : '';
            const monsterFullId = monster.monsterIdFull ? monster.monsterIdFull.toLowerCase() : '';
            const monsterIdentId = monster.monsterIdentificationId ? monster.monsterIdentificationId.toLowerCase() : '';

            // Check if any ID contains the search term
            const matchesSearch = 
                monsterId.includes(mapConfig.searchTerm) || 
                monsterOriginalId.includes(mapConfig.searchTerm) || 
                monsterFullId.includes(mapConfig.searchTerm) || 
                monsterIdentId.includes(mapConfig.searchTerm);

            if (!matchesSearch) {
                continue;
            }
        }

        // Calculate monster position relative to player
        const relX = monster.x - playerPosition.x;
        const relZ = monster.z - playerPosition.z;

        // Convert to screen coordinates
        const screenX = centerX + relX * mapConfig.scale;
        const screenY = centerY + relZ * mapConfig.scale;

        // Skip if outside visible area (with some margin)
        if (screenX < -entitySize || screenX > canvas.width + entitySize ||
            screenY < -entitySize || screenY > canvas.height + entitySize) {
            continue;
        }

        // Get or generate color for this monster
        if (!mapConfig.monsterColors[id]) {
            mapConfig.monsterColors[id] = getMonsterColor(monster.originalId || id);
        }

        // Draw monster
        ctx.fillStyle = mapConfig.monsterColors[id];
        ctx.beginPath();
        ctx.arc(screenX, screenY, entitySize * 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Draw monster direction if rotation is available
        if (monster.rotation !== undefined) {
            const mDirX = screenX + Math.sin(monster.rotation * Math.PI / 180) * entitySize;
            const mDirY = screenY - Math.cos(monster.rotation * Math.PI / 180) * entitySize;

            ctx.strokeStyle = mapConfig.monsterColors[id];
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            ctx.lineTo(mDirX, mDirY);
            ctx.stroke();
        }

        // Store monster position for hover detection
        mapConfig.entityPositions.push({
            type: 'monster',
            id: id,
            x: screenX,
            y: screenY,
            radius: entitySize * 0.8,
            data: monster
        });
    }
}

// Update path history for an entity
function updatePathHistory(type, id, position) {
    const now = Date.now();

    if (type === 'player') {
        // Only update if enough time has passed since last update
        const lastPoint = mapConfig.pathHistory.player[mapConfig.pathHistory.player.length - 1];
        if (!lastPoint || now - lastPoint.timestamp >= mapConfig.pathUpdateInterval) {
            // Add new point to player path history
            mapConfig.pathHistory.player.push({
                x: position.x,
                z: position.z,
                timestamp: now
            });

            // Trim history if it exceeds max length
            if (mapConfig.pathHistory.player.length > mapConfig.pathMaxLength) {
                mapConfig.pathHistory.player.shift();
            }
        }
    } else if (type === 'monster') {
        // Initialize monster path history if it doesn't exist
        if (!mapConfig.pathHistory.monsters[id]) {
            mapConfig.pathHistory.monsters[id] = [];
        }

        // Only update if enough time has passed since last update
        const monsterPath = mapConfig.pathHistory.monsters[id];
        const lastPoint = monsterPath[monsterPath.length - 1];
        if (!lastPoint || now - lastPoint.timestamp >= mapConfig.pathUpdateInterval) {
            // Add new point to monster path history
            monsterPath.push({
                x: position.x,
                z: position.z,
                timestamp: now
            });

            // Trim history if it exceeds max length
            if (monsterPath.length > mapConfig.pathMaxLength) {
                monsterPath.shift();
            }
        }
    }
}

// Draw entity paths
function drawPaths(ctx) {
    if (!mapConfig.showPaths) return;

    const canvas = mapConfig.canvas;
    const centerX = canvas.width / 2 + mapConfig.offsetX * mapConfig.scale;
    const centerY = canvas.height / 2 + mapConfig.offsetY * mapConfig.scale;

    // Draw player path
    if (mapConfig.pathHistory.player.length > 1) {
        ctx.beginPath();

        // Start at the first point
        const firstPoint = mapConfig.pathHistory.player[0];
        const firstRelX = firstPoint.x - playerPosition.x;
        const firstRelZ = firstPoint.z - playerPosition.z;
        const firstScreenX = centerX + firstRelX * mapConfig.scale;
        const firstScreenY = centerY + firstRelZ * mapConfig.scale;

        ctx.moveTo(firstScreenX, firstScreenY);

        // Draw lines to each subsequent point
        for (let i = 1; i < mapConfig.pathHistory.player.length; i++) {
            const point = mapConfig.pathHistory.player[i];
            const relX = point.x - playerPosition.x;
            const relZ = point.z - playerPosition.z;
            const screenX = centerX + relX * mapConfig.scale;
            const screenY = centerY + relZ * mapConfig.scale;

            ctx.lineTo(screenX, screenY);
        }

        // Style and stroke the path
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Draw monster paths
    for (const id in mapConfig.pathHistory.monsters) {
        const monsterPath = mapConfig.pathHistory.monsters[id];

        // Skip if path is too short or monster is filtered
        if (monsterPath.length <= 1 || mapConfig.filteredMonsters.has(id)) {
            continue;
        }

        // Get monster color
        const color = mapConfig.monsterColors[id] || getMonsterColor(id);

        // Draw path
        ctx.beginPath();

        // Start at the first point
        const firstPoint = monsterPath[0];
        const firstRelX = firstPoint.x - playerPosition.x;
        const firstRelZ = firstPoint.z - playerPosition.z;
        const firstScreenX = centerX + firstRelX * mapConfig.scale;
        const firstScreenY = centerY + firstRelZ * mapConfig.scale;

        ctx.moveTo(firstScreenX, firstScreenY);

        // Draw lines to each subsequent point
        for (let i = 1; i < monsterPath.length; i++) {
            const point = monsterPath[i];
            const relX = point.x - playerPosition.x;
            const relZ = point.z - playerPosition.z;
            const screenX = centerX + relX * mapConfig.scale;
            const screenY = centerY + relZ * mapConfig.scale;

            ctx.lineTo(screenX, screenY);
        }

        // Style and stroke the path
        ctx.strokeStyle = color.replace('rgb', 'rgba').replace(')', ', 0.5)');
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
}

// Update map when player position changes
ipcRenderer.on('player-position', (event, data) => {
    // Update player position (already handled in existing code)

    // Update path history
    updatePathHistory('player', 'player', data);

    // Always update map when player position changes
    renderMap();
});

// Update map when user position changes
ipcRenderer.on('user-position', (event, data) => {
    // Update user position (already handled in existing code)

    // Update path history
    updatePathHistory('player', 'player', data);

    // Update map if tracking is enabled
    if (mapConfig.tracking) {
        renderMap();
    }
});

// Update map when monster positions change
ipcRenderer.on('monster-position', (event, data) => {
    // Monster position update
    // Make sure to update monster info in the monsters object
    updateMonsterInfo(data);

    // Update path history
    updatePathHistory('monster', data.id, data);

    // Update map if initialized
    if (mapConfig && mapConfig.initialPacket) {
        renderMap();
    } else {
        console.log('Map not initialized yet, monster position update queued');
    }
});

// Check if mouse is over an entity and show tooltip
function checkEntityHover(mouseX, mouseY) {
    // Reset hovered entity
    let hoveredEntity = null;

    // Check each entity position
    for (const entity of mapConfig.entityPositions) {
        const dx = mouseX - entity.x;
        const dy = mouseY - entity.y;
        const distance = Math.sqrt(dx*dx + dy*dy);

        // If mouse is within entity radius
        if (distance <= entity.radius) {
            hoveredEntity = entity;
            break;
        }
    }

    // Update tooltip
    if (hoveredEntity) {
        // Only update if entity changed
        if (mapConfig.hoveredEntity !== hoveredEntity.id) {
            mapConfig.hoveredEntity = hoveredEntity.id;

            // Format tooltip content based on entity type
            let tooltipContent = '';

            if (hoveredEntity.type === 'player') {
                tooltipContent = `
                    <div style="font-weight: bold; color: ${mapConfig.playerColor};">Player</div>
                    <div>Position: X: ${Math.round(hoveredEntity.data.x)}, Y: ${Math.round(hoveredEntity.data.y)}, Z: ${Math.round(hoveredEntity.data.z)}</div>
                    <div>Rotation: ${Math.round(hoveredEntity.data.rotation)}°</div>
                    <div>Last Update: ${new Date(hoveredEntity.data.lastUpdate).toLocaleTimeString()}</div>
                `;
            } else if (hoveredEntity.type === 'monster') {
                const monster = hoveredEntity.data;
                const color = mapConfig.monsterColors[hoveredEntity.id];
                const distance = calculateDistance(
                    playerPosition.x, playerPosition.z,
                    monster.x, monster.z
                );

                tooltipContent = `
                    <div style="font-weight: bold; color: ${color};">Monster</div>
                    <div>ID: ${monster.originalId ? monster.originalId.toString(16).padStart(8, '0') : hoveredEntity.id}</div>
                    <div>Position: X: ${Math.round(monster.x)}, Y: ${Math.round(monster.y)}, Z: ${Math.round(monster.z)}</div>
                    <div>Distance from player: ${distance.toFixed(1)} units</div>
                    ${monster.rotation !== undefined ? `<div>Rotation: ${Math.round(monster.rotation)}°</div>` : ''}
                    <div>Last Update: ${new Date(monster.lastUpdate).toLocaleTimeString()}</div>
                `;
            }

            // Update tooltip content and position
            mapConfig.tooltip.innerHTML = tooltipContent;
            mapConfig.tooltip.style.display = 'block';
        }

        // Position tooltip near mouse but ensure it stays within viewport
        const tooltipRect = mapConfig.tooltip.getBoundingClientRect();
        const containerRect = mapConfig.container.getBoundingClientRect();

        let tooltipX = mouseX + 15;
        let tooltipY = mouseY + 15;

        // Adjust if tooltip would go outside container
        if (tooltipX + tooltipRect.width > containerRect.width) {
            tooltipX = mouseX - tooltipRect.width - 5;
        }

        if (tooltipY + tooltipRect.height > containerRect.height) {
            tooltipY = mouseY - tooltipRect.height - 5;
        }

        mapConfig.tooltip.style.left = tooltipX + 'px';
        mapConfig.tooltip.style.top = tooltipY + 'px';
    } else {
        // Hide tooltip if not hovering over an entity
        if (mapConfig.hoveredEntity !== null) {
            mapConfig.tooltip.style.display = 'none';
            mapConfig.hoveredEntity = null;
        }
    }
}

// Draw distance measurement line
function drawDistanceLine() {
    if (!mapConfig.distanceStart || !mapConfig.distanceEnd) return;

    // Set up distance canvas
    const distCanvas = mapConfig.distanceCanvas;
    const distCtx = distCanvas.getContext('2d');

    // Ensure canvas size matches container
    distCanvas.width = mapConfig.container.clientWidth;
    distCanvas.height = mapConfig.container.clientHeight;

    // Clear previous drawing
    distCtx.clearRect(0, 0, distCanvas.width, distCanvas.height);

    // Draw line
    distCtx.beginPath();
    distCtx.moveTo(mapConfig.distanceStart.x, mapConfig.distanceStart.y);
    distCtx.lineTo(mapConfig.distanceEnd.x, mapConfig.distanceEnd.y);
    distCtx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
    distCtx.lineWidth = 2;
    distCtx.stroke();

    // Draw start point
    distCtx.beginPath();
    distCtx.arc(mapConfig.distanceStart.x, mapConfig.distanceStart.y, 5, 0, Math.PI * 2);
    distCtx.fillStyle = 'rgba(0, 255, 0, 0.8)';
    distCtx.fill();

    // Draw end point
    distCtx.beginPath();
    distCtx.arc(mapConfig.distanceEnd.x, mapConfig.distanceEnd.y, 5, 0, Math.PI * 2);
    distCtx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    distCtx.fill();

    // Calculate screen distance
    const screenDist = Math.sqrt(
        Math.pow(mapConfig.distanceEnd.x - mapConfig.distanceStart.x, 2) +
        Math.pow(mapConfig.distanceEnd.y - mapConfig.distanceStart.y, 2)
    );

    // Convert screen coordinates to world coordinates
    const startWorldX = (mapConfig.distanceStart.x - distCanvas.width / 2) / mapConfig.scale - mapConfig.offsetX;
    const startWorldZ = (mapConfig.distanceStart.y - distCanvas.height / 2) / mapConfig.scale - mapConfig.offsetY;
    const endWorldX = (mapConfig.distanceEnd.x - distCanvas.width / 2) / mapConfig.scale - mapConfig.offsetX;
    const endWorldZ = (mapConfig.distanceEnd.y - distCanvas.height / 2) / mapConfig.scale - mapConfig.offsetY;

    // Calculate world distance
    const worldDist = Math.sqrt(
        Math.pow(endWorldX - startWorldX, 2) +
        Math.pow(endWorldZ - startWorldZ, 2)
    );

    // Calculate absolute world coordinates
    const startAbsX = playerPosition.x + startWorldX;
    const startAbsZ = playerPosition.z + startWorldZ;
    const endAbsX = playerPosition.x + endWorldX;
    const endAbsZ = playerPosition.z + endWorldZ;

    // Draw distance text
    const midX = (mapConfig.distanceStart.x + mapConfig.distanceEnd.x) / 2;
    const midY = (mapConfig.distanceStart.y + mapConfig.distanceEnd.y) / 2;

    distCtx.font = '12px Arial';
    distCtx.fillStyle = 'white';
    distCtx.textAlign = 'center';
    distCtx.textBaseline = 'middle';

    // Draw background for text
    const text = `Distance: ${worldDist.toFixed(1)} units`;
    const textWidth = distCtx.measureText(text).width;
    distCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    distCtx.fillRect(midX - textWidth/2 - 5, midY - 10, textWidth + 10, 20);

    // Draw text
    distCtx.fillStyle = 'white';
    distCtx.fillText(text, midX, midY);

    // Update map info with distance
    updateMapInfo(null, null, {
        start: { x: startAbsX, z: startAbsZ },
        end: { x: endAbsX, z: endAbsZ },
        distance: worldDist
    });
}

// Helper function to calculate distance between two points
function calculateDistance(x1, z1, x2, z2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(z2 - z1, 2));
}

// Clean up old monster path histories
function cleanupMonsterPaths() {
    const now = Date.now();
    const activeMonsterIds = new Set(Object.keys(monsters));

    // Remove paths for monsters that no longer exist
    for (const id in mapConfig.pathHistory.monsters) {
        if (!activeMonsterIds.has(id)) {
            delete mapConfig.pathHistory.monsters[id];
        }
    }

    // Schedule next cleanup
    setTimeout(cleanupMonsterPaths, 30000); // Run every 30 seconds
}

// Initialize map when page loads
window.addEventListener('load', () => {
    initMap();

    // Start path cleanup timer
    cleanupMonsterPaths();

    // Ensure map is properly initialized with initial packet
    if (mapConfig && !mapConfig.initialPacket) {
        mapConfig.initialPacket = true;
        console.log('Setting initial packet flag during load');

        // Force render map and center on player
        renderMap();
        centerMapOnPlayer();
    }

    // Re-render all existing entities
    for (const id in monsters) {
        if (monsters[id] && monsters[id].lastData) {
            updateMonsterInfo(monsters[id].lastData);
        }
    }

    // Log initialization
    console.log('Map feature initialized with the following capabilities:');
    console.log('- Real-time entity tracking');
    console.log('- Zoom and pan controls');
    console.log('- Entity filtering');
    console.log('- Distance measurement');
    console.log('- Entity information on hover');
    console.log('- Movement path tracking');
});
