import { Injectable } from '@angular/core';
import { EXPORT_FILE_TYPE, EXPORT_FILE_EXTENSION } from '@app/constants/consts';
import { Game } from '@common/interfaces/game';

@Injectable({
    providedIn: 'root',
})
export class ExportGameService {
    exportGame(game: Game): void {
        const jsonData = JSON.stringify({ name: game.name, description: game.description, mode: game.mode, gameMap: game.gameMap });
        const blob = new Blob([jsonData], { type: EXPORT_FILE_TYPE });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${game.name}${EXPORT_FILE_EXTENSION}`;
        link.click();
    }
}
