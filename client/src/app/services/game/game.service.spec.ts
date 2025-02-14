import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GameService } from './game.service';
import { environment } from 'src/environments/environment';
import { urlBase } from '@app/constants/consts';
import { GameMapSize, GameMode } from '@common/enums/game-infos';
import { Game } from '@common/interfaces/game';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('GameService', () => {
    let service: GameService;
    let httpMock: HttpTestingController;
    const mockGames: Game[] = [
        {
            gid: '1',
            name: 'Test Game 1',
            mode: GameMode.Classic,
            mapSize: GameMapSize.Medium,
            description: 'Test description 1',
            imageBase64: 'test1erjncrniwepng',
            isVisible: true,
            lastEditDate: new Date('2023-01-01').toISOString(),
            creationDate: new Date('2023-01-01').toISOString(),
            gameMap: [],
        } as unknown as Game,
        {
            gid: '2',
            name: 'Test Game 2',
            mode: GameMode.Flag,
            mapSize: GameMapSize.Large,
            description: 'Test description 2',
            imageBase64: 'test2dccweipng',
            isVisible: false,
            lastEditDate: new Date('2023-02-01').toISOString(),
            gameMap: [],
            creationDate: new Date('2023-01-01').toISOString(),
        } as unknown as Game,
    ];
    const mockGame: Game = {
        gid: '1',
        name: 'Test Game 1',
        mode: GameMode.Classic,
        mapSize: GameMapSize.Medium,
        description: 'Test description 1',
        imageBase64: 'test1erjncrniwepng',
        isVisible: true,
        lastEditDate: new Date('2023-01-01').toISOString(),
        creationDate: new Date('2023-01-01').toISOString(),
        gameMap: [],
    } as unknown as Game;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [],
            providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
        });
        service = TestBed.inject(GameService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should get games with map', () => {
        service.getGames().subscribe((games) => {
            expect(games).toEqual(mockGames);
        });

        const req = httpMock.expectOne(`${environment.serverUrl}/${urlBase.game}`);
        expect(req.request.method).toBe('GET');
        req.flush(mockGames);
    });

    it('should get game by id', () => {
        service.getGameById('1').subscribe((game) => {
            expect(game).toEqual(mockGame);
        });

        const req = httpMock.expectOne(`${environment.serverUrl}/${urlBase.game}/1`);
        expect(req.request.method).toBe('GET');
        req.flush(mockGame);
    });

    it('should toggle game visibility', () => {
        service.toggleGameVisibility('1').subscribe();

        const req = httpMock.expectOne(`${environment.serverUrl}/${urlBase.game}/1`);
        expect(req.request.method).toBe('PATCH');
        req.flush({});
    });

    it('should delete game', () => {
        service.deleteGame('1').subscribe();

        const req = httpMock.expectOne(`${environment.serverUrl}/${urlBase.game}/1`);
        expect(req.request.method).toBe('DELETE');
        req.flush({});
    });

    it('should add game', () => {
        service.addGame(mockGame).subscribe();
        const req = httpMock.expectOne(`${environment.serverUrl}/${urlBase.game}`);
        expect(req.request.method).toBe('POST');
        req.flush({});
    });

    it('should edit game', () => {
        service.editGame(mockGame).subscribe();
        const req = httpMock.expectOne(`${environment.serverUrl}/${urlBase.game}/1`);
        expect(req.request.method).toBe('PUT');
        req.flush({});
    });
});
