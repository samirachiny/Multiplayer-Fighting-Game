import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatTooltipModule } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';
import { TileToolsComponent } from './tile-tools.component';

describe('TileToolsComponent', () => {
    let component: TileToolsComponent;
    let fixture: ComponentFixture<TileToolsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CommonModule, MatTooltipModule, TileToolsComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(TileToolsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should emit the correct tile when a tile is clicked', () => {
        spyOn(component.tileClicked, 'emit');
        const tileElements = fixture.debugElement.queryAll(By.css('.tile-image'));

        tileElements[0].nativeElement.click();
        expect(component.tileClicked.emit).toHaveBeenCalledWith(component.tiles[0]);
        tileElements[1].nativeElement.click();
        expect(component.tileClicked.emit).toHaveBeenCalledWith(component.tiles[1]);
        tileElements[2].nativeElement.click();
        expect(component.tileClicked.emit).toHaveBeenCalledWith(component.tiles[2]);
    });

    it('should set selectedIndex on tile click', () => {
        const tileIndex = 1;
        component.onSelectedTile(tileIndex);
        expect(component.selectedIndex).toEqual(tileIndex);
    });

    it('should prevent default behavior on drag start', () => {
        const dragEvent = new DragEvent('dragstart');
        spyOn(dragEvent, 'preventDefault');
        component.onDragStart(dragEvent);
        expect(dragEvent.preventDefault).toHaveBeenCalled();
    });
});
