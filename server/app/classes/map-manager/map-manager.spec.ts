/* eslint-disable max-lines */
/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { BASE_TILE_DECIMAL, DOWN, LEFT, RIGHT, UP } from '@app/utils/const';
import * as mockPositions from '@app/utils/data';
import { Coordinate } from '@common/interfaces/coordinate';
import { MapManager } from '@app/classes/map-manager/map-manager';
import { expect } from 'chai';
import { ItemType } from '@common/enums/item';
import { TileType } from '@common/enums/tile';
import { GameMapSize } from '@common/enums/game-infos';

describe('MapManager Class', () => {
    const mockMapManager = new MapManager();

    const smallMap = Array(GameMapSize.Small)
        .fill(null)
        .map(() => Array(GameMapSize.Small).fill(TileType.Base * BASE_TILE_DECIMAL));

    const mediumMap = Array(GameMapSize.Medium)
        .fill(null)
        .map(() => Array(GameMapSize.Medium).fill(TileType.Base * BASE_TILE_DECIMAL));

    /**
     * Modifie une tuile de la carte pour faciliter la création de scénarios de test.
     *
     * Cette fonction permet de changer la valeur d'une tuile à une position donnée,
     * ce qui est utile pour simuler différentes configurations de la carte lors des
     * tests unitaires.
     *
     * **Attention :** Cette méthode ne doit être utilisée que dans le contexte de
     * tests et ne fait pas partie de la logique principale de l'application.
     * Assurez-vous que les modifications apportées par cette fonction ne perturbent
     * pas l'intégrité de la carte dans d'autres parties de l'application.
     *
     * @param {Coordinate} position - La position de la tuile à modifier, spécifiée par
     *                                 un objet contenant les coordonnées `x` et `y`.
     * @param {number} value - La nouvelle valeur à attribuer à la tuile, qui peut
     *                         représenter différents états (par exemple, mur, porte, etc.).
     */
    function setTile(position: Coordinate, value: number): void {
        (mockMapManager as any).map[position.y][position.x] = value;
    }

    beforeEach(() => {
        mockMapManager.setMap(
            Array(GameMapSize.Large)
                .fill(null)
                .map(() => Array(GameMapSize.Large).fill(TileType.Base * BASE_TILE_DECIMAL)),
        );
    });
    it('should remove an item from the specified position', () => {
        mockMapManager.setMap([
            [30, 31, 32],
            [33, 34, 35],
            [36, 37, 38],
        ]);
        const position = { x: 1, y: 1 };
        const item = mockMapManager.getItem(position);
        const removedItem = mockMapManager.removeItem(position);
        expect(removedItem).to.equal(item);
        expect(mockMapManager.getTile(position)).to.equal(30);
    });
    describe('MapManager initialization and map setting', () => {
        it('should update the map and set the freeTiles attribute correctly and size', () => {
            mockMapManager.setMap(smallMap);
            expect((mockMapManager as any).size).equal(10);
            expect((mockMapManager as any).map).equal(smallMap);

            mockMapManager.setMap(mediumMap);
            expect((mockMapManager as any).size).equal(15);
            expect((mockMapManager as any).map).equal(mediumMap);
        });

        it('should acquire the required amount of items based on map size', () => {
            expect(mockMapManager.getMaxRequiredItems()).to.equal(6);

            mockMapManager.setMap(mediumMap);
            expect(mockMapManager.getMaxRequiredItems()).to.equal(4);

            mockMapManager.setMap(smallMap);
            expect(mockMapManager.getMaxRequiredItems()).to.equal(2);
        });
    });

    describe('Position and Movement Validation', () => {
        it('should correctly move positions', () => {
            const tests: {
                position: Coordinate;
                direction: Coordinate;
                expected: Coordinate;
            }[] = [
                {
                    position: { x: 5, y: 5 },
                    direction: RIGHT,
                    expected: { x: 6, y: 5 },
                },
                { position: { x: 5, y: 5 }, direction: LEFT, expected: { x: 4, y: 5 } },
                { position: { x: 5, y: 5 }, direction: DOWN, expected: { x: 5, y: 6 } },
                { position: { x: 5, y: 5 }, direction: UP, expected: { x: 5, y: 4 } },
            ];

            tests.forEach((test) => {
                const move = mockMapManager.move(test.position, test.direction);
                expect(mockMapManager.equals(move, test.expected)).to.equal(true);
            });
        });

        it('should correctly match Tiles', () => {
            mockPositions.VALID_POSITIONS.forEach((position) => {
                const sameCopyPosition = { x: position.x, y: position.y };
                const changedCopyPosition = { x: position.x + 1, y: position.y + 1 };
                expect(mockMapManager.equals(position, sameCopyPosition)).equal(true);
                expect(mockMapManager.equals(position, changedCopyPosition)).equal(false);
            });
        });
        it('should return false if not first and second position are not coordinates', () => {
            mockPositions.VALID_POSITIONS.forEach((position) => {
                expect(mockMapManager.equals(undefined, undefined)).equal(false);
                expect(mockMapManager.equals(position, undefined)).equal(false);
                expect(mockMapManager.equals(undefined, position)).equal(false);
            });
        });

        it('should correctly acquire and set Tile Tiles', () => {
            mockPositions.VALID_POSITIONS.forEach((position) => {
                expect(mockMapManager.getTile(position)).equal((mockMapManager as any).map[position.y][position.x]);
            });

            mockMapManager.setTile(mockPositions.VALID_POSITIONS[0], 42);
            expect(mockMapManager.getTile(mockPositions.VALID_POSITIONS[0])).to.equal(42);

            mockMapManager.setTile(mockPositions.VALID_POSITIONS[3], 67);
            expect(mockMapManager.getTile(mockPositions.VALID_POSITIONS[3])).to.equal(67);

            mockMapManager.setTile(mockPositions.VALID_POSITIONS[5], 19);
            expect(mockMapManager.getTile(mockPositions.VALID_POSITIONS[5])).to.equal(19);
        });

        it('should identify corners correctly', () => {
            mockPositions.CORNER_POSITIONS.forEach((position) => {
                expect(mockMapManager.isCorner(position)).equal(true);
            });
        });

        it('should identify boundaries correctly', () => {
            expect(mockMapManager.isVerticalBoundary(mockPositions.CORNER_POSITIONS[0])).equal(true);
            expect(mockMapManager.isVerticalBoundary(mockPositions.CORNER_POSITIONS[2])).equal(true);
            expect(mockMapManager.isHorizontalBoundary(mockPositions.CORNER_POSITIONS[1])).equal(true);
            expect(mockMapManager.isHorizontalBoundary(mockPositions.CORNER_POSITIONS[3])).equal(true);

            mockPositions.BOUNDARY_POSITIONS.forEach((position) => {
                expect(mockMapManager.isBoundary(position)).equal(true);
            });

            mockPositions.MIDDLE_POSITIONS.forEach((position) => {
                expect(mockMapManager.isCorner(position)).equal(false);
                expect(mockMapManager.isBoundary(position)).equal(false);
            });
        });
    });

    describe('Multiple Neighbors acquisition', () => {
        it('getHorizontalNeighbors should return the 2 correct neighbors', () => {
            mockPositions.MIDDLE_POSITIONS.forEach((position) => {
                const horizontalNeighbors = mockMapManager.getHorizontalNeighbors(position);

                expect(horizontalNeighbors[0]).to.deep.equal(mockMapManager.getNeighbor(position, LEFT));
                expect(horizontalNeighbors[1]).to.deep.equal(mockMapManager.getNeighbor(position, RIGHT));
            });
        });

        it('getVerticalNeighbors should return the 2 correct neighbors', () => {
            mockPositions.MIDDLE_POSITIONS.forEach((position) => {
                const verticalNeighbors = mockMapManager.getVerticalNeighbors(position);

                expect(verticalNeighbors[0]).to.deep.equal(mockMapManager.getNeighbor(position, UP));
                expect(verticalNeighbors[1]).to.deep.equal(mockMapManager.getNeighbor(position, DOWN));
            });
        });

        it('getHorizontalNeighbors and getVerticalNeighbors should only return 1 neighbor if there is only one', () => {
            mockPositions.CORNER_POSITIONS.forEach((position) => {
                expect(mockMapManager.getVerticalNeighbors(position)).to.have.lengthOf(1);
                expect(mockMapManager.getHorizontalNeighbors(position)).to.have.lengthOf(1);
            });
        });

        it('getAllNeighbors should return an array of the correct length', () => {
            mockPositions.MIDDLE_POSITIONS.forEach((position) => {
                expect(mockMapManager.getAllNeighbors(position)).to.have.lengthOf(4);
            });

            mockPositions.CORNER_POSITIONS.forEach((position) => {
                expect(mockMapManager.getAllNeighbors(position)).to.have.lengthOf(2);
            });

            // Blocking off the top left corner
            setTile({ x: 1, y: 0 }, 0);
            setTile({ x: 0, y: 1 }, 0);
            const neighbors = mockMapManager.getAllNeighbors({ x: 0, y: 0 });
            expect(neighbors).to.have.lengthOf(0);
        });
    });

    describe('Tile identification and validation', () => {
        it('should view empty positions as valid', () => {
            mockPositions.VALID_POSITIONS.forEach((position) => {
                expect(mockMapManager.isValidPosition(position)).equal(true);
            });
        });

        it('should view out of bound positions as invalid', () => {
            mockPositions.INVALID_POSITIONS.forEach((position) => {
                expect(mockMapManager.isValidPosition(position)).equal(false);
            });
        });

        it('should correctly identify wall Tiles', () => {
            mockPositions.VALID_POSITIONS.forEach((position) => {
                setTile(position, 0);
                expect(mockMapManager.isWall(position)).equal(true);
                expect(mockMapManager.isDoor(position)).equal(false);
            });
        });

        it('should correctly identify Ice Tiles', () => {
            mockPositions.VALID_POSITIONS.forEach((position) => {
                setTile(position, 24);
                expect(mockMapManager.isIce(position)).equal(true);
            });

            mockPositions.INVALID_POSITIONS.forEach((position) => {
                expect(mockMapManager.isIce(position)).equal(false);
            });
        });

        it('should correctly identify door Tiles', () => {
            mockPositions.BOUNDARY_POSITIONS.forEach((position) => {
                setTile(position, 41);
                expect(mockMapManager.isOpenDoor(position)).equal(true);
            });

            mockPositions.CORNER_POSITIONS.forEach((position) => {
                setTile(position, 56);
                expect(mockMapManager.isClosedDoor(position)).equal(true);
            });

            mockPositions.MIDDLE_POSITIONS.forEach((position) => {
                setTile(position, 50);
                expect(mockMapManager.isDoor(position)).equal(true);
                expect(mockMapManager.isWall(position)).equal(false);
            });

            mockPositions.VALID_POSITIONS.forEach((position) => {
                expect(mockMapManager.isDoor(position)).equal(true);
                expect(mockMapManager.isWall(position)).equal(false);
            });
            mockPositions.INVALID_POSITIONS.forEach((position) => {
                expect(mockMapManager.isDoor(position)).equal(false);
                expect(mockMapManager.isClosedDoor(position)).equal(false);
                expect(mockMapManager.isOpenDoor(position)).equal(false);
                expect(mockMapManager.isWall(position)).equal(false);
            });
        });

        it('should view Walls as an invalid position', () => {
            mockPositions.VALID_POSITIONS.forEach((position) => {
                setTile(position, 0);
                expect(mockMapManager.isValidPosition(position)).equal(false);
            });
        });

        it('should view Doors as a valid position', () => {
            mockPositions.VALID_POSITIONS.forEach((position) => {
                setTile(position, 40);
                expect(mockMapManager.isValidPosition(position)).equal(true);
            });
        });
    });
    describe('Cost resolution', () => {
        it('should return the correct cost for each Tile type', () => {
            const mockPosition = mockPositions.VALID_POSITIONS[0];
            setTile(mockPosition, 0);
            expect(mockMapManager.resolveCost(mockPosition)).to.equal(-1);

            setTile(mockPosition, 50);
            expect(mockMapManager.resolveCost(mockPosition)).to.equal(-1);

            setTile(mockPosition, 12);
            expect(mockMapManager.resolveCost(mockPosition)).to.equal(1);

            setTile(mockPosition, 40);
            expect(mockMapManager.resolveCost(mockPosition)).to.equal(1);

            setTile(mockPosition, 23);
            expect(mockMapManager.resolveCost(mockPosition)).to.equal(0);

            setTile(mockPosition, 35);
            expect(mockMapManager.resolveCost(mockPosition)).to.equal(2);
        });
    });

    describe('Item and Tile Interaction Tests', () => {
        it('should get the item from a position', () => {
            mockMapManager.setTile({ x: 1, y: 1 }, 42); // Assuming 42 % BASE_TILE_DECIMAL is the item
            expect(mockMapManager.getItem({ x: 1, y: 1 })).to.equal(42 % BASE_TILE_DECIMAL);
        });

        it('should add an item to a position', () => {
            const position = { x: 1, y: 1 };
            mockMapManager.setTile(position, 10); // Ensure initial value is a base tile
            const itemType = 5; // Sample item type
            mockMapManager.addItem(itemType, position);
            expect(mockMapManager.getTile(position)).to.equal(10 + itemType);
        });
        it('should not add an item to a position if there is already one', () => {
            const position = { x: 1, y: 1 };
            const initTile = TileType.Base * BASE_TILE_DECIMAL + ItemType.BoostAttack;
            mockMapManager.setTile(position, initTile); // Ensure initial value is a base tile
            const itemType = 5; // Sample item type
            mockMapManager.addItem(itemType, position);
            expect(mockMapManager.getTile(position)).to.equal(initTile);
        });

        it('should check if a position has an item', () => {
            const position = { x: 1, y: 1 };
            mockMapManager.setTile(position, TileType.Base * BASE_TILE_DECIMAL + ItemType.BoostAttack);
            expect(mockMapManager.hasItem(position)).to.equal(true);

            mockMapManager.setTile(position, 10);
            expect(mockMapManager.hasItem(position)).to.equal(false);
        });
        it('should check if an invalid position has an item', () => {
            mockPositions.INVALID_POSITIONS.forEach((invalidPosition) => {
                expect(mockMapManager.hasItem(invalidPosition)).to.equal(false);
            });
        });

        it('should check if a position has an attack item', () => {
            const position = { x: 1, y: 1 };
            const itemType = ItemType.BoostAttack;
            mockMapManager.setTile(position, itemType);
            expect(mockMapManager.hasAttackItem(position)).to.equal(true);
        });
        it('should check if an invalid position does not have an attack item', () => {
            mockPositions.INVALID_POSITIONS.forEach((position) => {
                expect(mockMapManager.hasAttackItem(position)).equal(false);
            });
        });
        it('should check if a position has a defense item', () => {
            const position = { x: 1, y: 1 };
            const itemType = ItemType.BoostDefense;
            mockMapManager.setTile(position, itemType);
            expect(mockMapManager.hasDefenseItem(position)).to.equal(true);
        });
        it('should check if an invalid position does not have a defense item', () => {
            mockPositions.INVALID_POSITIONS.forEach((position) => {
                expect(mockMapManager.hasDefenseItem(position)).equal(false);
            });
        });

        it('should get positions of attack items', () => {
            const positions = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
            ];
            mockMapManager.setTile(positions[0], ItemType.BoostAttack);
            mockMapManager.setTile(positions[1], 10); // Not an attack item
            expect(mockMapManager.getAttackItemsPositions()).to.deep.equal([positions[0]]);
        });

        it('should get positions of items', () => {
            const positions = [
                { x: 1, y: 1 },
                { x: 1, y: 2 },
                { x: 2, y: 2 },
                { x: 2, y: 3 },
            ];
            mockMapManager.setTile(positions[0], ItemType.BoostAttack);
            mockMapManager.setTile(positions[1], ItemType.BoostDefense);
            mockMapManager.setTile(positions[2], ItemType.DoubleIceBreak);
            mockMapManager.setTile(positions[3], 10);
            expect(mockMapManager.getItemsPositions()).to.deep.equal([positions[2]]);
        });
        it('should get positions of defense items', () => {
            const positions = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
            ];
            mockMapManager.setTile(positions[0], ItemType.BoostDefense);
            mockMapManager.setTile(positions[1], 10); // Not a defense item
            expect(mockMapManager.getDefenseItemsPositions()).to.deep.equal([positions[0]]);
        });

        it('should check if a position has a starting point', () => {
            const position = { x: 1, y: 1 };
            mockMapManager.setTile(position, ItemType.StartingPoint);
            expect(mockMapManager.hasStartingPoint(position)).to.equal(true);
        });
        it('should check if a outbound position has a starting point', () => {
            const position = { x: 122, y: -12 };
            expect(mockMapManager.hasStartingPoint(position)).to.equal(false);
        });

        it('should check if a position has a flag', () => {
            const position = { x: 1, y: 1 };
            mockMapManager.setTile(position, ItemType.Flag);
            expect(mockMapManager.hasFlag(position)).to.equal(true);
        });
        it('should check if a outbound position has a flag point', () => {
            const position = { x: 122, y: -12 };
            expect(mockMapManager.hasFlag(position)).to.equal(false);
        });
        it('should check if a position is walkable', () => {
            const position = { x: 1, y: 1 };
            mockMapManager.setTile(position, TileType.Water * BASE_TILE_DECIMAL);
            expect(mockMapManager.isWalkable(position)).to.equal(true);

            mockMapManager.setTile(position, TileType.Wall * BASE_TILE_DECIMAL);
            expect(mockMapManager.isWalkable(position)).to.equal(false);
        });

        it('should count the total number of doors', () => {
            mockMapManager.setMap([
                [10, 10, 10],
                [10, TileType.DoorOpen * BASE_TILE_DECIMAL, 10],
                [10, 10, TileType.DoorClosed * BASE_TILE_DECIMAL],
            ]);
            expect(mockMapManager.getTotalDoors()).to.equal(2);
        });

        it('should count the total number of walkable tiles', () => {
            mockMapManager.setMap([
                [0, TileType.Water * BASE_TILE_DECIMAL, 0],
                [0, TileType.Ice * BASE_TILE_DECIMAL, 0],
                [0, 0, TileType.Base * BASE_TILE_DECIMAL],
            ]);
            expect(mockMapManager.getTotalWalkableTiles()).to.equal(3);
        });

        it('should ignore and restore closed doors correctly', () => {
            const position1 = { x: 1, y: 1 };
            const position2 = { x: 1, y: 2 };

            mockMapManager.setMap([
                [10, 10, 10],
                [10, TileType.DoorClosed * BASE_TILE_DECIMAL, 10],
                [10, TileType.DoorClosed * BASE_TILE_DECIMAL, 10],
            ]);

            mockMapManager.ignoreClosedDoors();
            expect(mockMapManager.getTile(position1)).to.equal(TileType.Base * BASE_TILE_DECIMAL);
            expect(mockMapManager.getTile(position2)).to.equal(TileType.Base * BASE_TILE_DECIMAL);

            mockMapManager.restoreClosedDoors();
            expect(mockMapManager.getTile(position1)).to.equal(TileType.DoorClosed * BASE_TILE_DECIMAL);
            expect(mockMapManager.getTile(position2)).to.equal(TileType.DoorClosed * BASE_TILE_DECIMAL);
        });
    });

    describe('getFlagPosition', () => {
        beforeEach(() => {
            mockMapManager.setMap(
                Array(GameMapSize.Small)
                    .fill(null)
                    .map(() => Array(GameMapSize.Small).fill(TileType.Base * BASE_TILE_DECIMAL)),
            );
        });

        it('should return the position of the flag if one exists', () => {
            const flagPosition: Coordinate = { x: 3, y: 3 };
            mockMapManager.setTile(flagPosition, TileType.Base * BASE_TILE_DECIMAL + ItemType.Flag);
            const result = mockMapManager.getFlagPosition();
            expect(result).to.deep.equal(flagPosition);
        });

        it('should return null if there is no flag on the map', () => {
            const result = mockMapManager.getFlagPosition();
            expect(result).to.equal(null);
        });

        it('should return the first flag position if multiple flags exist', () => {
            const firstFlagPosition: Coordinate = { x: 1, y: 1 };
            const secondFlagPosition: Coordinate = { x: 2, y: 2 };
            mockMapManager.setTile(firstFlagPosition, TileType.Base * BASE_TILE_DECIMAL + ItemType.Flag);
            mockMapManager.setTile(secondFlagPosition, TileType.Base * BASE_TILE_DECIMAL + ItemType.Flag);
            const result = mockMapManager.getFlagPosition();
            expect(result).to.deep.equal(firstFlagPosition);
        });
    });
});
