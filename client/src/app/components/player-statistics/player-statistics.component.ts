import { DecimalPipe } from '@angular/common';
import { AfterViewInit, Component, Input, ViewChild } from '@angular/core';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { PLAYER_STATISTICS_COLUMN_NAMES } from '@app/constants/consts';
import { DisplayablePlayerStatisticData } from '@common/interfaces/player-statistic-data';

@Component({
    selector: 'app-player-statistic',
    standalone: true,
    imports: [MatTableModule, MatSortModule, DecimalPipe],
    templateUrl: './player-statistics.component.html',
    styleUrl: './player-statistics.component.scss',
})
export class PlayerStatisticsComponent implements AfterViewInit {
    @Input() displayablePlayerStatistics: DisplayablePlayerStatisticData[];
    @ViewChild(MatSort) sort: MatSort;
    displayedColumns: string[];
    dataSource: MatTableDataSource<DisplayablePlayerStatisticData>;

    constructor() {
        this.displayablePlayerStatistics = [];
        this.displayedColumns = PLAYER_STATISTICS_COLUMN_NAMES;
    }
    ngAfterViewInit(): void {
        setTimeout(() => {
            this.initializeDataSource();
        });
    }

    private initializeDataSource(): void {
        this.dataSource = new MatTableDataSource(this.displayablePlayerStatistics);
        if (this.sort) this.dataSource.sort = this.sort;
    }
}
