export interface Game {
    gid: string;
    name: string;
    mode: string;
    mapSize: number;
    description: string;
    creationDate: Date;
    lastEditDate: Date;
    imageBase64: string;
    isVisible: boolean;
    gameMap: number[][];
}
