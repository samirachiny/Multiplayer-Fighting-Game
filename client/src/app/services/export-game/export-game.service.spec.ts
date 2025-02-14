/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { ExportGameService } from './export-game.service';
import { Game } from '@common/interfaces/game';

describe('ExportGameService', () => {
    let service: ExportGameService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(ExportGameService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should export game as JSON file', () => {
        const game = {
            name: 'Test Game',
            description: 'This is a test game',
            mode: 'Classic',
            gameMap: [
                [0, 1],
                [1, 0],
            ],
        } as any as Game;

        const createElementSpy = spyOn(document, 'createElement').and.callThrough();
        spyOn(URL, 'createObjectURL').and.returnValue('blob:http://localhost:9876/fd1982f0-276a-4235-9134-a6801bf6659b');
        const clickSpy = jasmine.createSpy('click');
        createElementSpy.withArgs('a').and.returnValue({
            click: clickSpy,
            href: '',
            download: '',
        } as any);

        service.exportGame(game);

        const link = createElementSpy.calls.mostRecent().returnValue as HTMLAnchorElement;
        expect(link.href).toEqual('blob:http://localhost:9876/fd1982f0-276a-4235-9134-a6801bf6659b');
        expect(link.download).toBe(`${game.name}.json`);
        expect(clickSpy).toHaveBeenCalled();
    });
});
