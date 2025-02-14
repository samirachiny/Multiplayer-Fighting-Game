import { Injectable } from '@angular/core';
import { Game } from '@common/interfaces/game';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { urlBase } from '@app/constants/consts';
import { ValidationResponse } from '@common/interfaces/response-infos';

@Injectable({
    providedIn: 'root',
})
export class GameService {
    constructor(private http: HttpClient) {}

    getGames(): Observable<Game[]> {
        const uri = `${environment.serverUrl}/${urlBase.game}`;
        return this.http.get<Game[]>(uri);
    }

    getGameById(gid: string): Observable<Game> {
        const uri = `${environment.serverUrl}/${urlBase.game}/${gid}`;
        return this.http.get<Game>(uri);
    }

    toggleGameVisibility(gid: string): Observable<void> {
        const uri = `${environment.serverUrl}/${urlBase.game}/${gid}`;
        return this.http.patch<void>(uri, {});
    }

    deleteGame(gid: string): Observable<void> {
        const uri = `${environment.serverUrl}/${urlBase.game}/${gid}`;
        return this.http.delete<void>(uri);
    }

    addGame(game: Game): Observable<ValidationResponse<Game>> {
        const uri = `${environment.serverUrl}/${urlBase.game}`;
        return this.http.post<ValidationResponse<Game>>(uri, game);
    }

    editGame(game: Game): Observable<ValidationResponse<Game>> {
        const uri = `${environment.serverUrl}/${urlBase.game}/${game.gid}`;
        return this.http.put<ValidationResponse<Game>>(uri, game);
    }
}
