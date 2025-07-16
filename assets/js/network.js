export class NetworkManager {
    constructor() {
        this.socket = null;
        this.players = {};
        this.onPlayerConnected = null;
        this.onPlayerDisconnected = null;
        this.onPlayerMove = null;
    }

    connect(url) {
        if (this.socket) {
            this.socket.close();
        }
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            console.log("Connected to WebSocket server");
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case 'playerConnected':
                    if (this.onPlayerConnected) this.onPlayerConnected(data.playerId);
                    break;
                case 'playerDisconnected':
                    if (this.onPlayerDisconnected) this.onPlayerDisconnected(data.playerId);
                    break;
                case 'playerMove':
                    if (this.onPlayerMove) this.onPlayerMove(data.playerId, data.position, data.rotation);
                    break;
                default:
                    console.log("Unknown message type:", data.type);
            }
        };

        this.socket.onclose = () => {
            console.log("Disconnected from WebSocket server");
        };

        this.socket.onerror = (error) => {
            console.error("WebSocket error:", error);
        };
    }

    sendPlayerMove(position, rotation) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'playerMove',
                position: position,
                rotation: rotation
            }));
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}