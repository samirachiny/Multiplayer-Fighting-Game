/* eslint-disable @typescript-eslint/no-explicit-any */
import { DoorTile } from '@app/classes/door-tile/door-tile';
import { TILE_IMAGES } from '@app/constants/image';
import { TileType } from '@common/enums/tile';
import { Item } from '@app/classes/item/item';

describe('DoorTile', () => {
    let openDoorTile: DoorTile;
    let closedDoorTile: DoorTile;

    beforeEach(() => {
        openDoorTile = new DoorTile(TileType.DoorOpen);
        closedDoorTile = new DoorTile(TileType.DoorClosed);
    });

    it('should create an instance', () => {
        expect(new DoorTile(TileType.DoorOpen)).toBeTruthy();
    });

    describe('toggleDoor', () => {
        it('should toggle open door to closed', () => {
            openDoorTile.toggleDoor();
            expect(openDoorTile.type).toBe(TileType.DoorClosed);
            expect(openDoorTile.image).toBe(TILE_IMAGES.doorClosed);
        });

        it('should toggle closed door to open', () => {
            closedDoorTile.toggleDoor();
            expect(closedDoorTile.type).toBe(TileType.DoorOpen);
            expect(closedDoorTile.image).toBe(TILE_IMAGES.doorOpened);
        });
    });

    describe('setItem', () => {
        it('should always return false', () => {
            const item = {} as Item;
            expect(openDoorTile.setItem(item)).toBe(false);
        });
    });

    describe('clone', () => {
        it('should create a new DoorTile with the same properties', () => {
            const clonedTile = openDoorTile.clone();
            expect(clonedTile).toBeInstanceOf(DoorTile);
            expect(clonedTile).not.toBe(openDoorTile);
            expect(clonedTile.type).toBe((openDoorTile as any)._type);
            expect(clonedTile.image).toBe((openDoorTile as any)._image);
            expect(clonedTile.description).toBe((openDoorTile as any)._description);
        });
    });
});
