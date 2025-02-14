import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { PlayerStatisticsComponent } from './player-statistics.component';
import { MatSort } from '@angular/material/sort';
import { DisplayablePlayerStatisticData } from '@common/interfaces/player-statistic-data';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('PlayerStatisticsComponent', () => {
    let component: PlayerStatisticsComponent;
    let fixture: ComponentFixture<PlayerStatisticsComponent>;

    const mockPlayerStatistics: DisplayablePlayerStatisticData[] = [
        {
            playerName: 'Player 1',
            numberOfFights: 5,
            numberOfEscapes: 2,
            numberOfWins: 3,
            numberOfDefeats: 2,
            totalHealthLost: 50,
            totalDamageDealt: 150,
            numberOfObjectsCollected: 10,
            percentageOfMapTilesVisited: 75,
        },
        {
            playerName: 'Player 2',
            numberOfFights: 3,
            numberOfEscapes: 1,
            numberOfWins: 2,
            numberOfDefeats: 1,
            totalHealthLost: 30,
            totalDamageDealt: 90,
            numberOfObjectsCollected: 5,
            percentageOfMapTilesVisited: 50,
        },
    ];

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PlayerStatisticsComponent, NoopAnimationsModule],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerStatisticsComponent);
        component = fixture.componentInstance;

        component.displayablePlayerStatistics = mockPlayerStatistics;
        component.sort = {} as MatSort;
    });

    it('should create the component', fakeAsync(() => {
        fixture.detectChanges();
        tick();
        expect(component).toBeTruthy();
    }));

    it('should initialize dataSource with input data', fakeAsync(() => {
        fixture.detectChanges();
        tick();
        expect(component.dataSource).toBeDefined();
        expect(component.dataSource.data).toEqual(mockPlayerStatistics);
    }));

    it('should correctly configure the sorting', fakeAsync(() => {
        fixture.detectChanges();
        tick();
        expect(component.dataSource.sort).toBe(component.sort);
    }));

    it('should handle cases where the sort is not defined', fakeAsync(() => {
        fixture = TestBed.createComponent(PlayerStatisticsComponent);
        component = fixture.componentInstance;

        component.displayablePlayerStatistics = mockPlayerStatistics;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component.dataSource = { sort: null } as any;
        component['initializeDataSource']();
        expect(component.dataSource).toBeDefined();
        expect(component.dataSource.sort).toBeUndefined();
    }));
});
